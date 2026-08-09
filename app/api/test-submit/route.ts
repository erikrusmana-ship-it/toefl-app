import { after, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readTestSession } from '@/lib/test-session-cookie'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export async function POST(request: Request) {
  const startedAt = Date.now()
  const session = await readTestSession()
  if (!session) return NextResponse.json({ error: 'Sesi tes tidak ditemukan.' }, { status: 401 })

  let payload: { answers?: unknown; violations?: unknown; status?: unknown }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Data hasil tes tidak valid.' }, { status: 400 })
  }

  if (!Array.isArray(payload.answers)
    || payload.answers.length > 150
    || !Array.isArray(payload.violations)
    || payload.violations.length > 10
    || !['selesai', 'dihentikan_pelanggaran'].includes(String(payload.status))
  ) {
    return NextResponse.json({ error: 'Data hasil tes tidak lengkap.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('submit_test_attempt', {
    p_participant_id: session.participantId,
    p_submission_token: session.submissionToken,
    p_answers: payload.answers,
    p_violations: payload.violations,
    p_status: payload.status,
  })

  if (error || !data) {
    console.error(JSON.stringify({
      event: 'test_submit_failed',
      participantId: session.participantId,
      durationMs: Date.now() - startedAt,
      error: error?.message || 'empty_result',
    }))
    return NextResponse.json({ error: 'Hasil belum tersimpan. Periksa koneksi lalu coba lagi.' }, { status: 503 })
  }

  // Email adalah pekerjaan sekunder. Hasil peserta sudah aman di database dan
  // respons tidak perlu menunggu layanan email yang mungkin sedang lambat.
  const emailUrl = new URL('/api/send-result', request.url)
  const cookieHeader = request.headers.get('cookie') || ''
  after(async () => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(emailUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
          body: '{}',
        })
        if (response.ok) {
          console.info(JSON.stringify({ event: 'result_email_sent', participantId: session.participantId, attempt }))
          return
        }
        console.error(JSON.stringify({ event: 'result_email_failed', participantId: session.participantId, attempt, status: response.status }))
      } catch (emailError) {
        console.error(JSON.stringify({
          event: 'result_email_failed',
          participantId: session.participantId,
          attempt,
          error: emailError instanceof Error ? emailError.message : 'unknown_error',
        }))
      }

      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 750))
    }
  })

  console.info(JSON.stringify({
    event: 'test_submit_succeeded',
    participantId: session.participantId,
    durationMs: Date.now() - startedAt,
  }))

  return NextResponse.json({ success: true, result: data }, { headers: { 'Cache-Control': 'private, no-store' } })
}
