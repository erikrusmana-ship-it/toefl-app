import 'server-only'

import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto'

import { cookies } from 'next/headers'

export const TEST_SESSION_COOKIE =
  process.env.TOEFL_SESSION_COOKIE?.trim() ||
  'unpas_ept_session'

export type TestSessionPayload = {
  participantId: number
  submissionToken: string
}

/**
 * Mengambil secret untuk signing cookie.
 */
function getSessionSecret() {
  const secret =
    process.env.TOEFL_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (
    !secret ||
    secret.length < 32
  ) {
    throw new Error(
      'TOEFL_SESSION_SECRET belum dikonfigurasi atau terlalu pendek.'
    )
  }

  return secret
}

/**
 * Membuat signature HMAC.
 */
function signPayload(
  payload: string
) {
  return createHmac(
    'sha256',
    getSessionSecret()
  )
    .update(payload)
    .digest('base64url')
}

/**
 * Perbandingan string yang aman terhadap
 * timing attack.
 */
function safeEqual(
  leftValue: string,
  rightValue: string
) {
  const left =
    Buffer.from(leftValue)

  const right =
    Buffer.from(rightValue)

  if (
    left.length !== right.length
  ) {
    return false
  }

  return timingSafeEqual(
    left,
    right
  )
}

/**
 * ============================================
 * ENCODE SESSION
 * ============================================
 *
 * Digunakan ketika peserta berhasil
 * memulai tes.
 */
export function encodeTestSession(
  session: TestSessionPayload
) {
  if (
    !Number.isSafeInteger(
      session.participantId
    ) ||
    session.participantId <= 0
  ) {
    throw new Error(
      'Participant ID tidak valid.'
    )
  }

  if (
    typeof session.submissionToken !==
      'string' ||
    session.submissionToken.length < 32 ||
    session.submissionToken.length > 256
  ) {
    throw new Error(
      'Submission token tidak valid.'
    )
  }

  const json =
    JSON.stringify({
      participantId:
        session.participantId,

      submissionToken:
        session.submissionToken,
    })

  const payload =
    Buffer.from(
      json,
      'utf8'
    ).toString(
      'base64url'
    )

  const signature =
    signPayload(payload)

  return `${payload}.${signature}`
}

/**
 * ============================================
 * DECODE SESSION
 * ============================================
 *
 * Memvalidasi signature cookie lalu
 * mengembalikan isi session.
 */
export function decodeTestSession(
  value:
    | string
    | undefined
    | null
): TestSessionPayload | null {
  if (!value) {
    return null
  }

  const parts = value.split('.')
  const legacyCookie = parts.length === 1
  const payload = parts[0]
  const signature = parts[1]

  if (!payload || (!legacyCookie && !signature) || parts.length > 2) return null

  // Cookie lama tetap dapat dipakai agar deployment tidak memutus peserta yang
  // sedang tes. Submission token di dalamnya masih diverifikasi oleh database.
  // Seluruh sesi baru selalu ditulis dengan signature HMAC.
  if (!legacyCookie) {
    const expectedSignature = signPayload(payload)
    if (!safeEqual(signature, expectedSignature)) return null
  }

  try {
    const json =
      Buffer.from(
        payload,
        'base64url'
      ).toString(
        'utf8'
      )

    const parsed =
      JSON.parse(json) as {
        participantId?: unknown
        submissionToken?: unknown
      }

    const participantId =
      Number(
        parsed.participantId
      )

    const submissionToken =
      parsed.submissionToken

    if (
      !Number.isSafeInteger(
        participantId
      ) ||
      participantId <= 0
    ) {
      return null
    }

    if (
      typeof submissionToken !==
        'string' ||
      submissionToken.length < 32 ||
      submissionToken.length > 256
    ) {
      return null
    }

    return {
      participantId,
      submissionToken,
    }
  } catch {
    return null
  }
}

/**
 * ============================================
 * READ SESSION
 * ============================================
 *
 * Helper kompatibilitas untuk route lama
 * seperti /api/send-result.
 *
 * Cookie dibaca server-side lalu divalidasi
 * menggunakan decodeTestSession().
 */
export async function readTestSession():
  Promise<TestSessionPayload | null> {
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
