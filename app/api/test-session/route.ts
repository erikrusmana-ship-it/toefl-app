import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'

import {
  decodeTestSession,
  TEST_SESSION_COOKIE,
} from '@/lib/test-session-cookie'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SaveProgressRequest = {
  section?: unknown
  question?: unknown
  revision?: unknown
  progress?: unknown
}

/**
 * Response JSON tanpa cache.
 */
function noStore(
  data: unknown,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })
}

/**
 * Mencegah request PUT/DELETE dari situs lain.
 */
function sameOrigin(request: Request) {
  const origin =
    request.headers.get('origin')

  if (!origin) {
    return true
  }

  return (
    origin ===
    new URL(request.url).origin
  )
}

/**
 * Membaca session dari HTTP-only cookie.
 */
async function getSession() {
  const cookieStore =
    await cookies()

  const rawSession =
    cookieStore
      .get(TEST_SESSION_COOKIE)
      ?.value

  return decodeTestSession(
    rawSession
  )
}

/**
 * Validasi nomor soal berdasarkan section.
 */
function validQuestion(
  section: string,
  question: number
) {
  if (
    !Number.isSafeInteger(question)
  ) {
    return false
  }

  if (section === 'listening') {
    return (
      question >= 1 &&
      question <= 50
    )
  }

  if (section === 'structure') {
    return (
      question >= 1 &&
      question <= 40
    )
  }

  if (section === 'reading') {
    return (
      question >= 1 &&
      question <= 50
    )
  }

  return false
}

/**
 * ============================================
 * GET /api/test-session
 *
 * Digunakan untuk RESUME tes.
 * ============================================
 */
export async function GET() {
  try {
    const session =
      await getSession()

    if (!session) {
      return noStore({
        hasSession: false,
      })
    }

    const supabase =
      createSupabaseAdminClient()

    const {
      data,
      error,
    } = await supabase.rpc(
      'load_test_progress',
      {
        p_participant_id:
          session.participantId,

        p_submission_token:
          session.submissionToken,
      }
    )

    /**
     * Kalau database sementara error,
     * jangan langsung hapus cookie peserta.
     */
    if (error) {
      console.error(
        'load_test_progress gagal:',
        error
      )

      return noStore(
        {
          error:
            'Progress tes belum dapat dimuat. Silakan coba kembali.',
        },
        503
      )
    }

    /**
     * Jika RPC menyatakan session tidak ada,
     * baru cookie dibersihkan.
     */
    if (!data) {
      const response =
        noStore({
          hasSession: false,
        })

      response.cookies.set(
        TEST_SESSION_COOKIE,
        '',
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV ===
            'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 0,
        }
      )

      return response
    }

    return noStore({
      hasSession: true,

      participantId:
        session.participantId,

      progress: data,
    })
  } catch (error) {
    console.error(
      'GET /api/test-session:',
      error
    )

    return noStore(
      {
        error:
          'Session tes belum dapat diperiksa.',
      },
      500
    )
  }
}

/**
 * ============================================
 * PUT /api/test-session
 *
 * Digunakan untuk AUTOSAVE.
 * ============================================
 */
export async function PUT(
  request: Request
) {
  try {
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

    const session =
      await getSession()

    if (!session) {
      return noStore(
        {
          error:
            'Sesi tes tidak ditemukan.',
        },
        401
      )
    }

    let payload:
      SaveProgressRequest

    try {
      payload =
        await request.json()
    } catch {
      return noStore(
        {
          error:
            'Data autosave tidak valid.',
        },
        400
      )
    }

    const section =
      typeof payload.section ===
      'string'
        ? payload.section
        : ''

    const question =
      Number(payload.question)

    const revision =
      Number(payload.revision)

    /**
     * Section hanya boleh 3 ini.
     */
    if (
      ![
        'listening',
        'structure',
        'reading',
      ].includes(section)
    ) {
      return noStore(
        {
          error:
            'Section tes tidak valid.',
        },
        400
      )
    }

    /**
     * Listening 1-50
     * Structure 1-40
     * Reading 1-50
     */
    if (
      !validQuestion(
        section,
        question
      )
    ) {
      return noStore(
        {
          error:
            'Nomor soal tidak valid.',
        },
        400
      )
    }

    /**
     * Revision awal boleh 0.
     */
    if (
      !Number.isSafeInteger(
        revision
      ) ||
      revision < 0
    ) {
      return noStore(
        {
          error:
            'Revision autosave tidak valid.',
        },
        400
      )
    }

    /**
     * progress harus JSON object.
     */
    if (
      !payload.progress ||
      typeof payload.progress !==
        'object' ||
      Array.isArray(
        payload.progress
      )
    ) {
      return noStore(
        {
          error:
            'Data progress tidak valid.',
        },
        400
      )
    }

    const supabase =
      createSupabaseAdminClient()

    const {
      data,
      error,
    } = await supabase.rpc(
      'save_test_progress_v2',
      {
        p_participant_id:
          session.participantId,

        p_submission_token:
          session.submissionToken,

        p_section:
          section,

        p_question:
          question,

        p_revision:
          revision,

        p_progress:
          payload.progress,
      }
    )

    if (error) {
      console.error(
        'save_test_progress_v2 gagal:',
        error
      )

      const message =
        String(
          error.message || ''
        )

      /**
       * Kalau revision lama mencoba
       * menimpa revision baru.
       */
      if (
        /revision|stale/i.test(
          message
        )
      ) {
        return noStore(
          {
            error:
              'Progress yang lebih baru sudah tersimpan.',
            stale: true,
          },
          409
        )
      }

      return noStore(
        {
          error:
            'Autosave belum berhasil. Sistem akan mencoba kembali.',
        },
        503
      )
    }

    if (!data) {
      return noStore(
        {
          error:
            'Autosave tidak menghasilkan data.',
        },
        503
      )
    }

    return noStore({
      success: true,
      ...data,
    })
  } catch (error) {
    console.error(
      'PUT /api/test-session:',
      error
    )

    return noStore(
      {
        error:
          'Autosave belum dapat diproses.',
      },
      500
    )
  }
}

/**
 * ============================================
 * DELETE /api/test-session
 *
 * Menghapus cookie session setelah tes selesai.
 * ============================================
 */
export async function DELETE(
  request: Request
) {
  if (!sameOrigin(request)) {
    return noStore(
      {
        error:
          'Permintaan lintas situs ditolak.',
      },
      403
    )
  }

  const response =
    noStore({
      success: true,
    })

  response.cookies.set(
    TEST_SESSION_COOKIE,
    '',
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        'production',

      sameSite: 'strict',

      path: '/',

      maxAge: 0,
    }
  )

  return response
}