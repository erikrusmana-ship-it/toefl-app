import 'server-only'

import { cookies } from 'next/headers'

export const TEST_SESSION_COOKIE = 'unpas_ept_session'

export type TestSession = {
  participantId: number
  submissionToken: string
}

export function encodeTestSession(session: TestSession) {
  return Buffer.from(JSON.stringify(session), 'utf8').toString('base64url')
}

export function decodeTestSession(value: string | undefined): TestSession | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<TestSession>
    if (!Number.isInteger(parsed.participantId) || Number(parsed.participantId) < 1) return null
    if (typeof parsed.submissionToken !== 'string' || parsed.submissionToken.length < 32 || parsed.submissionToken.length > 256) return null
    return parsed as TestSession
  } catch {
    return null
  }
}

export async function readTestSession() {
  const cookieStore = await cookies()
  return decodeTestSession(cookieStore.get(TEST_SESSION_COOKIE)?.value)
}

