import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encodeTestSession, readTestSession, TEST_SESSION_COOKIE } from '@/lib/test-session-cookie'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: Request) {
  let payload: { participantId?: unknown; submissionToken?: unknown }
  try {
    payload = await request.json()
  } catch {
    return noStore({ error: 'Permintaan sesi tidak valid.' }, 400)
  }

  if (!Number.isInteger(payload.participantId)
    || Number(payload.participantId) < 1
    || typeof payload.submissionToken !== 'string'
    || payload.submissionToken.length < 32
    || payload.submissionToken.length > 256
  ) {
    return noStore({ error: 'Data sesi tidak valid.' }, 400)
  }

  const session = { participantId: Number(payload.participantId), submissionToken: payload.submissionToken }
  const { data, error } = await supabase.rpc('load_test_progress', {
    p_participant_id: session.participantId,
    p_submission_token: session.submissionToken,
  })
  if (error || !data) return noStore({ error: 'Sesi peserta tidak dapat diverifikasi.' }, 403)

  const response = noStore({ success: true, progress: data })
  response.cookies.set(TEST_SESSION_COOKIE, encodeTestSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 6,
  })
  return response
}

export async function GET() {
  const session = await readTestSession()
  if (!session) return noStore({ hasSession: false })

  const { data, error } = await supabase.rpc('load_test_progress', {
    p_participant_id: session.participantId,
    p_submission_token: session.submissionToken,
  })
  if (error || !data) {
    const response = noStore({ hasSession: false })
    response.cookies.set(TEST_SESSION_COOKIE, '', { path: '/', maxAge: 0 })
    return response
  }

  return noStore({ hasSession: true, participantId: session.participantId, progress: data })
}

export async function PUT(request: Request) {
  const session = await readTestSession()
  if (!session) return noStore({ error: 'Sesi tes tidak ditemukan.' }, 401)

  let payload: { section?: unknown; question?: unknown; progress?: unknown }
  try {
    payload = await request.json()
  } catch {
    return noStore({ error: 'Data autosave tidak valid.' }, 400)
  }

  if (!['listening', 'structure', 'reading'].includes(String(payload.section))
    || !Number.isInteger(payload.question)
    || Number(payload.question) < 1
    || Number(payload.question) > 50
    || !payload.progress
    || typeof payload.progress !== 'object'
    || Array.isArray(payload.progress)
  ) {
    return noStore({ error: 'Posisi tes tidak valid.' }, 400)
  }

  const { data, error } = await supabase.rpc('save_test_progress', {
    p_participant_id: session.participantId,
    p_submission_token: session.submissionToken,
    p_section: payload.section,
    p_question: payload.question,
    p_progress: payload.progress,
  })
  if (error || !data) {
    console.error('Autosave RPC failed:', error?.message)
    return noStore({ error: 'Autosave belum berhasil. Sistem akan mencoba kembali.' }, 503)
  }

  return noStore({ success: true, ...data })
}

export async function DELETE() {
  const response = noStore({ success: true })
  response.cookies.set(TEST_SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}

