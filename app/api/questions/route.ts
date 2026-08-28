import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import {
  decodeTestSession,
  TEST_SESSION_COOKIE,
} from '@/lib/test-session-cookie'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type QuestionRow = {
  id: number
  package_code: 'model_a' | 'model_b'
  section: string
  nomor_soal: number
  part?: string | null
  audio_url?: string | null
  passage_title?: string | null
  passage_text?: string | null
  pertanyaan?: string | null
  pilihan_a: string
  pilihan_b: string
  pilihan_c: string
  pilihan_d: string
}

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })
}

function selectSection(
  questions: QuestionRow[],
  keyword: 'listen' | 'struct' | 'read',
  expectedTotal: number
) {
  const rows = questions.filter((question) => (
    question.section.trim().toLowerCase().includes(keyword)
  ))
  const byNumber = new Map<number, QuestionRow>()

  for (const question of rows) {
    const number = Number(question.nomor_soal)
    if (!Number.isSafeInteger(number) || number < 1 || number > expectedTotal) {
      throw new Error(`Nomor soal ${keyword} tidak valid.`)
    }
    if (byNumber.has(number)) {
      throw new Error(`Nomor soal ${keyword} ${number} tersimpan lebih dari satu kali.`)
    }
    byNumber.set(number, {
      ...question,
      nomor_soal: number,
    })
  }

  const result: QuestionRow[] = []
  for (let number = 1; number <= expectedTotal; number += 1) {
    const question = byNumber.get(number)
    if (!question) throw new Error(`Nomor soal ${keyword} ${number} belum tersedia.`)
    result.push(question)
  }

  return result
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = decodeTestSession(
      cookieStore.get(TEST_SESSION_COOKIE)?.value
    )

    if (!session) {
      return noStore(
        { error: 'Session tes tidak valid atau sudah berakhir.' },
        401
      )
    }

    const supabase = createSupabaseAdminClient()
    const { data: participant, error: participantError } = await supabase
      .from('peserta')
      .select('id,package_code,status_tes,submitted_at')
      .eq('id', session.participantId)
      .maybeSingle()

    if (participantError) {
      console.error('Gagal membaca paket peserta:', participantError)
      return noStore({ error: 'Data peserta belum dapat dibaca.' }, 503)
    }

    if (!participant) {
      return noStore({ error: 'Peserta tidak ditemukan.' }, 404)
    }

    if (
      participant.package_code !== 'model_a' &&
      participant.package_code !== 'model_b'
    ) {
      return noStore({ error: 'Paket peserta tidak valid.' }, 500)
    }

    if (
      participant.submitted_at ||
      participant.status_tes === 'selesai' ||
      participant.status_tes === 'dihentikan_pelanggaran'
    ) {
      return noStore({ error: 'Tes peserta sudah selesai.' }, 409)
    }

    const { data, error } = await supabase
      .from('soal')
      .select(`
        id,
        package_code,
        section,
        nomor_soal,
        part,
        audio_url,
        passage_title,
        passage_text,
        pertanyaan,
        pilihan_a,
        pilihan_b,
        pilihan_c,
        pilihan_d
      `)
      .eq('package_code', participant.package_code)
      .order('nomor_soal', { ascending: true })
      .order('id', { ascending: true })

    if (error) {
      console.error('Gagal mengambil bank soal:', error)
      return noStore({ error: 'Bank soal belum dapat dimuat.' }, 503)
    }

    try {
      const questions = (data || []) as QuestionRow[]
      return noStore({
        package_code: participant.package_code,
        questions: {
          listening: selectSection(questions, 'listen', 50),
          structure: selectSection(questions, 'struct', 40),
          reading: selectSection(questions, 'read', 50),
        },
      })
    } catch (bankError) {
      console.error('Bank soal paket tidak valid:', {
        packageCode: participant.package_code,
        error: bankError instanceof Error ? bankError.message : 'unknown_error',
      })
      return noStore({ error: 'Bank soal paket peserta belum lengkap atau memiliki nomor ganda.' }, 503)
    }
  } catch (error) {
    console.error('GET /api/questions:', error)
    return noStore({ error: 'Server belum dapat memuat bank soal.' }, 500)
  }
}
