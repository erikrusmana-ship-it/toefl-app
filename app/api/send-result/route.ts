import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readTestSession } from '@/lib/test-session-cookie'

const RESULT_RECIPIENT = 'erik.rusmana@unpas.ac.id'

interface ResultPayload {
  participantId: number
  nama: string
  npm: string
  prodi: string
  email: string
  packageName: string
  result: {
    rawL: number
    scaledL: number
    rawS: number
    scaledS: number
    rawR: number
    scaledR: number
    totalScore: number
    cefr: string
  }
  questionTotals: {
    listening: number
    structure: number
    reading: number
  }
  violations: Array<{
    type: string
    label: string
    occurredAt: string
    section: string
  }>
  statusTes: 'selesai' | 'dihentikan_pelanggaran'
}

interface EmailRequest {
  participantId: number
  submissionToken: string
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] || character)
}

function validNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isValidPayload(payload: Partial<ResultPayload>): payload is ResultPayload {
  const result = payload.result
  const totals = payload.questionTotals
  const violationsAreValid = Array.isArray(payload.violations) && payload.violations.length <= 10 && payload.violations.every((violation) => (
    typeof violation?.type === 'string' && violation.type.length <= 40 &&
    typeof violation?.label === 'string' && violation.label.length <= 160 &&
    typeof violation?.occurredAt === 'string' && !Number.isNaN(Date.parse(violation.occurredAt)) &&
    typeof violation?.section === 'string' && violation.section.length <= 20
  ))

  return Boolean(
    Number.isInteger(payload.participantId) && Number(payload.participantId) > 0 &&
    payload.nama?.trim() && payload.npm?.trim() && payload.prodi?.trim() && payload.packageName?.trim() &&
    payload.email?.includes('@') && result && totals &&
    validNumber(result.rawL) && validNumber(result.scaledL) &&
    validNumber(result.rawS) && validNumber(result.scaledS) &&
    validNumber(result.rawR) && validNumber(result.scaledR) &&
    validNumber(result.totalScore) && result.cefr?.trim() &&
    validNumber(totals.listening) && validNumber(totals.structure) && validNumber(totals.reading) &&
    violationsAreValid &&
    (payload.statusTes === 'selesai' || payload.statusTes === 'dihentikan_pelanggaran')
  )
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Email service is not configured.' }, { status: 503 })

  let requestPayload: Partial<EmailRequest> = {}
  try {
    requestPayload = await request.json()
  } catch {
    // Body boleh kosong karena sesi aman dapat dibaca dari cookie HttpOnly.
  }

  const cookieSession = await readTestSession()
  const sessionParticipantId = cookieSession?.participantId ?? requestPayload.participantId
  const sessionSubmissionToken = cookieSession?.submissionToken ?? requestPayload.submissionToken

  if (!Number.isInteger(sessionParticipantId)
    || Number(sessionParticipantId) < 1
    || typeof sessionSubmissionToken !== 'string'
    || sessionSubmissionToken.length < 32
    || sessionSubmissionToken.length > 256
  ) {
    return NextResponse.json({ error: 'Invalid result data.' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const markEmailDelivery = async (participantId: number, status: 'sending' | 'sent' | 'failed', errorMessage: string | null = null) => {
    try {
      await supabase.rpc('mark_result_email_delivery', {
        p_participant_id: participantId,
        p_submission_token: sessionSubmissionToken,
        p_status: status,
        p_error: errorMessage,
      })
    } catch (trackingError) {
      console.error('Email delivery tracking failed:', trackingError)
    }
  }
  const { data, error } = await supabase.rpc('get_result_for_email', {
    p_participant_id: sessionParticipantId,
    p_submission_token: sessionSubmissionToken,
  })

  const payload = data as Partial<ResultPayload> | null
  if (error || !payload || !isValidPayload(payload)) {
    return NextResponse.json({ error: 'Result not found or session is invalid.' }, { status: 403 })
  }

  const { participantId, nama, npm, prodi, email, packageName, result, questionTotals, violations, statusTes } = payload
  await markEmailDelivery(participantId, 'sending')
  const submittedAt = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
    timeStyle: 'long',
  })
  const testStatusLabel = statusTes === 'dihentikan_pelanggaran'
    ? 'Dihentikan otomatis karena pelanggaran kedua'
    : 'Selesai normal'
  const violationRows = violations.map((violation, violationIndex) => {
    const occurredAt = new Date(violation.occurredAt).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'medium',
    })
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd">${violationIndex + 1}</td>
      <td style="padding:8px;border:1px solid #ddd">${escapeHtml(violation.label)}</td>
      <td style="padding:8px;border:1px solid #ddd">${escapeHtml(violation.section)}</td>
      <td style="padding:8px;border:1px solid #ddd">${escapeHtml(occurredAt)}</td>
    </tr>`
  }).join('')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `toefl-result-${participantId}`,
    },
    body: JSON.stringify({
      from: 'TOEFL UNPAS <onboarding@resend.dev>',
      to: [RESULT_RECIPIENT],
      reply_to: email,
      subject: `${statusTes === 'dihentikan_pelanggaran' ? '[PELANGGARAN] ' : ''}Hasil English Proficiency Test — ${nama} (${npm})`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#1f2937">
          <h2 style="color:#4c1d95">Hasil English Proficiency Test</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr><td style="padding:7px;border-bottom:1px solid #ddd"><strong>Nama</strong></td><td style="padding:7px;border-bottom:1px solid #ddd">${escapeHtml(nama)}</td></tr>
            <tr><td style="padding:7px;border-bottom:1px solid #ddd"><strong>NPM</strong></td><td style="padding:7px;border-bottom:1px solid #ddd">${escapeHtml(npm)}</td></tr>
            <tr><td style="padding:7px;border-bottom:1px solid #ddd"><strong>Prodi</strong></td><td style="padding:7px;border-bottom:1px solid #ddd">${escapeHtml(prodi)}</td></tr>
            <tr><td style="padding:7px;border-bottom:1px solid #ddd"><strong>Email</strong></td><td style="padding:7px;border-bottom:1px solid #ddd">${escapeHtml(email)}</td></tr>
            <tr><td style="padding:7px;border-bottom:1px solid #ddd"><strong>Paket soal</strong></td><td style="padding:7px;border-bottom:1px solid #ddd">${escapeHtml(packageName)}</td></tr>
            <tr><td style="padding:7px;border-bottom:1px solid #ddd"><strong>Waktu selesai</strong></td><td style="padding:7px;border-bottom:1px solid #ddd">${escapeHtml(submittedAt)}</td></tr>
            <tr><td style="padding:7px;border-bottom:1px solid #ddd"><strong>Status tes</strong></td><td style="padding:7px;border-bottom:1px solid #ddd">${escapeHtml(testStatusLabel)}</td></tr>
            <tr><td style="padding:7px;border-bottom:1px solid #ddd"><strong>Jumlah pelanggaran</strong></td><td style="padding:7px;border-bottom:1px solid #ddd">${violations.length}</td></tr>
          </table>
          <table style="width:100%;border-collapse:collapse;text-align:center">
            <thead><tr style="background:#ede9fe"><th style="padding:10px;border:1px solid #ddd">Section</th><th style="padding:10px;border:1px solid #ddd">Benar</th><th style="padding:10px;border:1px solid #ddd">Konversi</th></tr></thead>
            <tbody>
              <tr><td style="padding:10px;border:1px solid #ddd">Listening</td><td style="padding:10px;border:1px solid #ddd">${result.rawL} / ${questionTotals.listening}</td><td style="padding:10px;border:1px solid #ddd">${result.scaledL}</td></tr>
              <tr><td style="padding:10px;border:1px solid #ddd">Structure</td><td style="padding:10px;border:1px solid #ddd">${result.rawS} / ${questionTotals.structure}</td><td style="padding:10px;border:1px solid #ddd">${result.scaledS}</td></tr>
              <tr><td style="padding:10px;border:1px solid #ddd">Reading</td><td style="padding:10px;border:1px solid #ddd">${result.rawR} / ${questionTotals.reading}</td><td style="padding:10px;border:1px solid #ddd">${result.scaledR}</td></tr>
            </tbody>
          </table>
          <div style="margin-top:24px;padding:18px;background:#faf5ff;border-radius:10px;text-align:center">
            <div style="font-size:15px">Total English Proficiency Test Score</div>
            <div style="font-size:42px;font-weight:bold;color:#581c87">${result.totalScore}</div>
            <div><strong>CEFR:</strong> ${escapeHtml(result.cefr)}</div>
          </div>
          ${violations.length ? `
            <h3 style="margin-top:26px;color:#991b1b">Catatan Pelanggaran</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead><tr style="background:#fee2e2"><th style="padding:8px;border:1px solid #ddd">No.</th><th style="padding:8px;border:1px solid #ddd">Pelanggaran</th><th style="padding:8px;border:1px solid #ddd">Section</th><th style="padding:8px;border:1px solid #ddd">Waktu</th></tr></thead>
              <tbody>${violationRows}</tbody>
            </table>
          ` : '<p style="margin-top:24px;color:#166534"><strong>Tidak ada pelanggaran anti-cheating.</strong></p>'}
        </div>
      `,
    }),
  })

  const responseBody = await response.json().catch(() => null)
  if (!response.ok) {
    console.error('Resend API error:', response.status, responseBody)
    await markEmailDelivery(participantId, 'failed', `Resend ${response.status}: ${JSON.stringify(responseBody).slice(0, 350)}`)
    return NextResponse.json({ error: 'Failed to send result email.' }, { status: 502 })
  }

  await markEmailDelivery(participantId, 'sent')

  return NextResponse.json({ success: true })
}
