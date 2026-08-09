import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readTestSession } from '@/lib/test-session-cookie'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export async function POST(request: Request) {
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
    console.error('Submit test RPC failed:', error?.message)
    return NextResponse.json({ error: 'Hasil belum tersimpan. Periksa koneksi lalu coba lagi.' }, { status: 503 })
  }

  return NextResponse.json({ success: true, result: data }, { headers: { 'Cache-Control': 'private, no-store' } })
}

