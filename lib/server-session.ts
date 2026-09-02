// Note: Removed side-effect import of 'server-only' to avoid missing type declarations error
// The module is intended for Next.js server-only enforcement; if needed, add appropriate
// types or a declaration file instead of a side-effect import.

import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto'

import { cookies } from 'next/headers'

const DEFAULT_COOKIE_NAME = 'toefl_session'

function getCookieName(): string {
  return (
    process.env.TOEFL_SESSION_COOKIE?.trim() ||
    DEFAULT_COOKIE_NAME
  )
}

function getSessionSecret(): string {
  const secret =
    process.env.TOEFL_SESSION_SECRET?.trim()

  if (!secret || secret.length < 32) {
    throw new Error(
      'TOEFL_SESSION_SECRET harus diisi minimal 32 karakter.'
    )
  }

  return secret
}

function createSignature(
  participantId: number
): string {
  return createHmac(
    'sha256',
    getSessionSecret()
  )
    .update(`v1:${participantId}`)
    .digest('base64url')
}

function safeEqual(
  a: string,
  b: string
): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)

  if (left.length !== right.length) {
    return false
  }

  return timingSafeEqual(left, right)
}

export async function setTestSession(
  participantId: number
): Promise<void> {
  if (
    !Number.isSafeInteger(participantId) ||
    participantId <= 0
  ) {
    throw new Error(
      'Participant ID tidak valid.'
    )
  }

  const cookieStore = await cookies()

  const signature =
    createSignature(participantId)

  cookieStore.set({
    name: getCookieName(),
    value: `v1.${participantId}.${signature}`,
    httpOnly: true,
    secure:
      process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 6 * 60 * 60,
  })
}

export async function getTestSessionParticipantId():
  Promise<number | null> {
  const cookieStore = await cookies()

  const raw = cookieStore
    .get(getCookieName())
    ?.value

  if (!raw) {
    return null
  }

  const parts = raw.split('.')

  if (parts.length !== 3) {
    return null
  }

  const [
    version,
    participantValue,
    signature,
  ] = parts

  if (version !== 'v1') {
    return null
  }

  const participantId =
    Number(participantValue)

  if (
    !Number.isSafeInteger(participantId) ||
    participantId <= 0
  ) {
    return null
  }

  const expectedSignature =
    createSignature(participantId)

  if (
    !safeEqual(
      signature,
      expectedSignature
    )
  ) {
    return null
  }

  return participantId
}

export async function clearTestSession():
  Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set({
    name: getCookieName(),
    value: '',
    httpOnly: true,
    secure:
      process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
}