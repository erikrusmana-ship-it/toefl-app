import { NextResponse } from 'next/server'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'

import {
  encodeTestSession,
  TEST_SESSION_COOKIE,
} from '@/lib/test-session-cookie'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AccessRequest = {
  action?: unknown
  code?: unknown
  nama?: unknown
  npm?: unknown
  prodi?: unknown
  email?: unknown
}

/**
 * Response JSON tanpa cache.
 */
function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })
}

/**
 * Mencegah request lintas situs.
 */
function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')

  if (!origin) {
    return true
  }

  return origin === new URL(request.url).origin
}

/**
 * Normalisasi kode akses.
 *
 * Contoh:
 *   abc-123
 * menjadi:
 *   ABC-123
 */
function normalizeCode(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const code = value
    .trim()
    .toUpperCase()

  if (!/^[A-Z0-9-]{4,80}$/.test(code)) {
    return null
  }

  return code
}

/**
 * Normalisasi teks biodata.
 */
function normalizeText(
  value: unknown,
  maxLength: number
) {
  if (typeof value !== 'string') {
    return null
  }

  const text = value
    .trim()
    .replace(/\s+/g, ' ')

  if (
    text.length < 2 ||
    text.length > maxLength
  ) {
    return null
  }

  return text
}

/**
 * Normalisasi email.
 */
function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const email = value
    .trim()
    .toLowerCase()

  if (
    email.length < 5 ||
    email.length > 254
  ) {
    return null
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null
  }

  return email
}

/**
 * POST /api/test-access
 *
 * action = verify
 *   → hanya memeriksa kode akses
 *
 * action = start
 *   → membuat peserta dan session tes
 */
export async function POST(request: Request) {
  /**
   * ============================================
   * 1. VALIDASI REQUEST
   * ============================================
   */

  if (!sameOrigin(request)) {
    return noStore(
      {
        error:
          'Permintaan lintas situs ditolak.',
      },
      403
    )
  }

  const contentType =
    request.headers
      .get('content-type')
      ?.toLowerCase()

  if (
    !contentType?.startsWith(
      'application/json'
    )
  ) {
    return noStore(
      {
        error:
          'Format permintaan tidak valid.',
      },
      415
    )
  }

  let payload: AccessRequest

  try {
    payload = await request.json()
  } catch {
    return noStore(
      {
        error:
          'Data permintaan tidak valid.',
      },
      400
    )
  }

  /**
   * ============================================
   * 2. VALIDASI ACTION + ACCESS CODE
   * ============================================
   */

  const action =
    typeof payload.action === 'string'
      ? payload.action
      : ''

  if (
    action !== 'verify' &&
    action !== 'start'
  ) {
    return noStore(
      {
        error: 'Action tidak valid.',
      },
      400
    )
  }

  const code =
    normalizeCode(payload.code)

  if (!code) {
    return noStore(
      {
        error:
          'Kode akses tidak valid.',
      },
      400
    )
  }

  /**
   * ============================================
   * 3. SUPABASE ADMIN
   * ============================================
   */

  const supabase =
    createSupabaseAdminClient()

  /**
   * ============================================
   * 4. VERIFY ACCESS CODE
   * ============================================
   */

  if (action === 'verify') {
    const {
      data,
      error,
    } = await supabase.rpc(
      'get_access_code_test_package',
      {
        p_code: code,
      }
    )

    if (error) {
      console.error(
        'Verifikasi kode akses gagal:',
        error
      )

      return noStore(
        {
          error:
            'Kode akses belum dapat diperiksa. Silakan coba kembali.',
        },
        503
      )
    }

    const packageInfo = data as {
      valid?: boolean
      package_code?: string
      package_name?: string
    } | null

    if (
      !packageInfo?.valid ||
      !['model_a', 'model_b'].includes(
        String(
          packageInfo.package_code
        )
      )
    ) {
      return noStore(
        {
          valid: false,
          error:
            'Kode akses tidak valid atau sudah dinonaktifkan.',
        },
        403
      )
    }

    return noStore({
      valid: true,
      package_code:
        packageInfo.package_code,
      package_name:
        packageInfo.package_name,
    })
  }

  /**
   * ============================================
   * 5. START TEST
   * ============================================
   */

  const nama =
    normalizeText(
      payload.nama,
      150
    )

  const npm =
    normalizeText(
      payload.npm,
      50
    )

  const prodi =
    normalizeText(
      payload.prodi,
      150
    )

  const email =
    normalizeEmail(
      payload.email
    )

  if (
    !nama ||
    !npm ||
    !prodi ||
    !email
  ) {
    return noStore(
      {
        error:
          'Biodata peserta belum lengkap atau tidak valid.',
      },
      400
    )
  }

  /**
   * Membuat peserta melalui RPC database.
   *
   * PENTING:
   * Frontend TIDAK mengirim package_code.
   *
   * Package harus diambil database dari:
   *
   * test_access_codes.package_code
   *
   * sehingga:
   *
   * access code Model A
   * → peserta Model A
   *
   * access code Model B
   * → peserta Model B
   */
  const {
    data,
    error,
  } = await supabase.rpc(
    'create_participant_with_access_code_v2',
    {
      p_code: code,
      p_nama: nama,
      p_npm: npm,
      p_prodi: prodi,
      p_email: email,
    }
  )

  if (error) {
    console.error(
      'Pembuatan peserta gagal:',
      error
    )

    const errorMessage =
      String(error.message || '')

    if (
      /kode akses/i.test(
        errorMessage
      )
    ) {
      return noStore(
        {
          error:
            'Kode akses tidak valid atau sudah dinonaktifkan.',
        },
        403
      )
    }

    if (
      /bank soal/i.test(
        errorMessage
      )
    ) {
      return noStore(
        {
          error:
            'Bank soal untuk paket ini belum siap.',
        },
        503
      )
    }

    if (
      /biodata/i.test(
        errorMessage
      )
    ) {
      return noStore(
        {
          error:
            'Biodata peserta belum lengkap.',
        },
        400
      )
    }

    console.error(
      'Detail RPC:',
      errorMessage
    )

    return noStore(
      {
        error:
          'Tes belum dapat dimulai. Silakan coba kembali.',
      },
      503
    )
  }

  /**
   * ============================================
   * 6. VALIDASI RESPONSE DATABASE
   * ============================================
   */

  const participant = data as {
    participant_id?: number
    submission_token?: string
    section_deadline?: string
    package_code?: string
    package_name?: string
  } | null

  const participantId =
    Number(
      participant?.participant_id
    )

  if (
    !Number.isSafeInteger(
      participantId
    ) ||
    participantId <= 0
  ) {
    console.error(
      'participant_id tidak valid:',
      data
    )

    return noStore(
      {
        error:
          'Sesi peserta tidak berhasil dibuat.',
      },
      503
    )
  }

  if (
    typeof participant
      ?.submission_token !==
      'string' ||
    participant.submission_token
      .length < 32 ||
    participant.submission_token
      .length > 256
  ) {
    console.error(
      'submission_token tidak valid.'
    )

    return noStore(
      {
        error:
          'Token sesi peserta tidak berhasil dibuat.',
      },
      503
    )
  }

  if (
    participant.package_code !==
      'model_a' &&
    participant.package_code !==
      'model_b'
  ) {
    console.error(
      'package_code tidak valid:',
      participant.package_code
    )

    return noStore(
      {
        error:
          'Paket tes peserta tidak valid.',
      },
      503
    )
  }

  /**
   * ============================================
   * 7. BUAT RESPONSE
   * ============================================
   */

  const response =
    noStore({
      participant_id:
        participantId,

      section_deadline:
        participant
          .section_deadline,

      package_code:
        participant.package_code,

      package_name:
        participant.package_name,
    })

  /**
   * ============================================
   * 8. SIMPAN SESSION KE HTTP-ONLY COOKIE
   * ============================================
   */

  const encodedSession =
    encodeTestSession({
      participantId,

      submissionToken:
        participant
          .submission_token,
    })

  response.cookies.set(
    TEST_SESSION_COOKIE,
    encodedSession,
    {
      httpOnly: true,

      secure:
        process.env
          .NODE_ENV ===
        'production',

      sameSite: 'strict',

      path: '/',

      // session berlaku 6 jam
      maxAge:
        60 * 60 * 6,
    }
  )

  /**
   * ============================================
   * 9. RESPONSE FINAL
   * ============================================
   */

  return response
}