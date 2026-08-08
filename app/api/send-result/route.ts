import { NextResponse } from 'next/server'

const RESULT_RECIPIENT = 'erik.rusmana@unpas.ac.id'

interface ResultPayload {
  participantId: number
  nama: string
  npm: string
  prodi: string
  email: string
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

  return Boolean(
    Number.isInteger(payload.participantId) && Number(payload.participantId) > 0 &&
    payload.nama?.trim() && payload.npm?.trim() && payload.prodi?.trim() &&
    payload.email?.includes('@') && result && totals &&
    validNumber(result.rawL) && validNumber(result.scaledL) &&
    validNumber(result.rawS) && validNumber(result.scaledS) &&
    validNumber(result.rawR) && validNumber(result.scaledR) &&
    validNumber(result.totalScore) && result.cefr?.trim() &&
    validNumber(totals.listening) && validNumber(totals.structure) && validNumber(totals.reading)
  )
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Email service is not configured.' }, { status: 503 })

  let payload: Partial<ResultPayload>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: 'Invalid result data.' }, { status: 400 })
  }

  const { participantId, nama, npm, prodi, email, result, questionTotals } = payload
  const submittedAt = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
    timeStyle: 'long',
  })

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
      subject: `Hasil TOEFL — ${nama} (${npm})`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#1f2937">
          <h2 style="color:#4c1d95">Hasil Tes TOEFL ITP</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr><td style="padding:7px;border-bottom:1px solid #ddd"><strong>Nama</strong></td><td style="padding:7px;border-bottom:1px solid #ddd">${escapeHtml(nama)}</td></tr>
            <tr><td style="padding:7px;border-bottom:1px solid #ddd"><strong>NPM</strong></td><td style="padding:7px;border-bottom:1px solid #ddd">${escapeHtml(npm)}</td></tr>
            <tr><td style="padding:7px;border-bottom:1px solid #ddd"><strong>Prodi</strong></td><td style="padding:7px;border-bottom:1px solid #ddd">${escapeHtml(prodi)}</td></tr>
            <tr><td style="padding:7px;border-bottom:1px solid #ddd"><strong>Email</strong></td><td style="padding:7px;border-bottom:1px solid #ddd">${escapeHtml(email)}</td></tr>
            <tr><td style="padding:7px;border-bottom:1px solid #ddd"><strong>Waktu selesai</strong></td><td style="padding:7px;border-bottom:1px solid #ddd">${escapeHtml(submittedAt)}</td></tr>
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
            <div style="font-size:15px">Total TOEFL Score</div>
            <div style="font-size:42px;font-weight:bold;color:#581c87">${result.totalScore}</div>
            <div><strong>CEFR:</strong> ${escapeHtml(result.cefr)}</div>
          </div>
        </div>
      `,
    }),
  })

  const responseBody = await response.json().catch(() => null)
  if (!response.ok) {
    console.error('Resend API error:', response.status, responseBody)
    return NextResponse.json({ error: 'Failed to send result email.' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
