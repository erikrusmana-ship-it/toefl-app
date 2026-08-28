import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { sendResultEmail, type ResultEmailPayload } from '@/lib/result-email'

type StoredViolation = {
  type?: unknown
  label?: unknown
  occurredAt?: unknown
  section?: unknown
}

type PendingParticipant = {
  id: number
  nama: string
  npm: string | null
  prodi: string | null
  email: string
  package_code: string
  raw_listening: number | null
  scaled_listening: number | null
  raw_structure: number | null
  scaled_structure: number | null
  raw_reading: number | null
  scaled_reading: number | null
  skor_akhir: number | null
  cefr_level: string | null
  status_tes: string
  pelanggaran_detail: StoredViolation[] | null
  submitted_at: string
  email_delivery_attempts: number
}

function normalizeSection(section: string) {
  const normalized = section.trim().toLowerCase()
  if (normalized.includes('listen')) return 'listening'
  if (normalized.includes('struct')) return 'structure'
  if (normalized.includes('read')) return 'reading'
  return normalized
}

function packageName(code: string) {
  if (code === 'model_a') return 'TOEFL Model A'
  if (code === 'model_b') return 'TOEFL Model B'
  return code
}

function violationLabel(violation: StoredViolation) {
  if (typeof violation.label === 'string' && violation.label.trim()) return violation.label.trim().slice(0, 160)
  if (violation.type === 'TAB_HIDDEN') return 'Membuka tab lain atau meminimalkan browser'
  if (violation.type === 'WINDOW_BLUR') return 'Membuka jendela atau aplikasi lain'
  if (violation.type === 'FULLSCREEN_EXIT') return 'Keluar dari mode fullscreen'
  return 'Pelanggaran tidak dikenal'
}

function sanitizeViolations(value: StoredViolation[] | null): ResultEmailPayload['violations'] {
  if (!Array.isArray(value)) return []

  return value.slice(0, 10).flatMap((violation) => {
    const occurredAt = typeof violation.occurredAt === 'string' ? violation.occurredAt : ''
    if (Number.isNaN(Date.parse(occurredAt))) return []
    return [{
      type: typeof violation.type === 'string' ? violation.type.slice(0, 40) : 'UNKNOWN',
      label: violationLabel(violation),
      occurredAt,
      section: typeof violation.section === 'string' ? violation.section.slice(0, 20) : 'unknown',
    }]
  })
}

function createPayload(participant: PendingParticipant, totals: Record<string, number>): ResultEmailPayload {
  return {
    participantId: participant.id,
    nama: participant.nama,
    npm: participant.npm || '',
    prodi: participant.prodi || '',
    email: participant.email,
    packageName: packageName(participant.package_code),
    submittedAt: participant.submitted_at,
    result: {
      rawL: participant.raw_listening ?? 0,
      scaledL: participant.scaled_listening ?? 31,
      rawS: participant.raw_structure ?? 0,
      scaledS: participant.scaled_structure ?? 31,
      rawR: participant.raw_reading ?? 0,
      scaledR: participant.scaled_reading ?? 31,
      totalScore: participant.skor_akhir ?? 310,
      cefr: participant.cefr_level || 'A2 (Elementary)',
    },
    questionTotals: {
      listening: totals[`${participant.package_code}:listening`] || 50,
      structure: totals[`${participant.package_code}:structure`] || 40,
      reading: totals[`${participant.package_code}:reading`] || 50,
    },
    violations: sanitizeViolations(participant.pelanggaran_detail),
    statusTes: participant.status_tes === 'dihentikan_pelanggaran'
      ? 'dihentikan_pelanggaran'
      : 'selesai',
  }
}

export async function retryPendingResultEmails(limit = 10) {
  const supabase = createSupabaseAdminClient()
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 10)
  const [participantsResult, questionsResult] = await Promise.all([
    supabase
      .from('peserta')
      .select('id,nama,npm,prodi,email,package_code,raw_listening,scaled_listening,raw_structure,scaled_structure,raw_reading,scaled_reading,skor_akhir,cefr_level,status_tes,pelanggaran_detail,submitted_at,email_delivery_attempts')
      .not('submitted_at', 'is', null)
      .in('email_delivery_status', ['pending', 'failed'])
      .order('submitted_at', { ascending: true })
      .limit(safeLimit),
    supabase.from('soal').select('package_code,section'),
  ])

  if (participantsResult.error) throw new Error(`Gagal membaca email tertunda: ${participantsResult.error.message}`)
  if (questionsResult.error) throw new Error(`Gagal membaca jumlah soal: ${questionsResult.error.message}`)

  const totals = (questionsResult.data || []).reduce<Record<string, number>>((result, question) => {
    const key = `${question.package_code}:${normalizeSection(question.section)}`
    result[key] = (result[key] || 0) + 1
    return result
  }, {})
  const participants = (participantsResult.data || []) as PendingParticipant[]
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const participant of participants) {
    const nextAttempt = Math.max(0, participant.email_delivery_attempts || 0) + 1
    const { data: lockedParticipant, error: lockError } = await supabase
      .from('peserta')
      .update({
        email_delivery_status: 'sending',
        email_delivery_attempts: nextAttempt,
        email_delivery_error: null,
      })
      .eq('id', participant.id)
      .in('email_delivery_status', ['pending', 'failed'])
      .select('id')
      .maybeSingle()

    if (lockError) throw new Error(`Gagal mengunci antrean email: ${lockError.message}`)
    if (!lockedParticipant) {
      skipped += 1
      continue
    }

    try {
      await sendResultEmail(createPayload(participant, totals))
      const { error: sentError } = await supabase
        .from('peserta')
        .update({
          email_delivery_status: 'sent',
          email_delivery_error: null,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', participant.id)
        .eq('email_delivery_status', 'sending')
      if (sentError) throw sentError
      sent += 1
    } catch (sendError) {
      const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown email delivery error.'
      await supabase
        .from('peserta')
        .update({
          email_delivery_status: 'failed',
          email_delivery_error: errorMessage.slice(0, 500),
        })
        .eq('id', participant.id)
        .eq('email_delivery_status', 'sending')
      failed += 1
    }
  }

  return { selected: participants.length, sent, failed, skipped }
}
