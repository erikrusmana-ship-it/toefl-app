import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import {
  decodeTestSession,
  TEST_SESSION_COOKIE,
} from '@/lib/test-session-cookie'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })
}

export async function GET() {
  try {
    const cookieStore = await cookies()

    const rawSession =
      cookieStore.get(TEST_SESSION_COOKIE)?.value

    const session =
      decodeTestSession(rawSession)

    if (!session) {
      return noStore(
        {
          error: 'Session tes tidak valid atau sudah berakhir.',
        },
        401
      )
    }

    const supabase =
      createSupabaseAdminClient()

    const {
      data: participant,
      error: participantError,
    } = await supabase
      .from('peserta')
      .select(`
        id,
        package_code,
        status_tes,
        submitted_at
      `)
      .eq('id', session.participantId)
      .maybeSingle()

    if (participantError) {
      console.error(
        'Gagal membaca peserta:',
        participantError
      )

      return noStore(
        {
          error: 'Data peserta belum dapat dibaca.',
        },
        503
      )
    }

    if (!participant) {
      return noStore(
        {
          error: 'Peserta tidak ditemukan.',
        },
        404
      )
    }

    if (
      participant.package_code !== 'model_a' &&
      participant.package_code !== 'model_b'
    ) {
      return noStore(
        {
          error: 'Paket peserta tidak valid.',
        },
        500
      )
    }

    if (
      participant.submitted_at ||
      participant.status_tes === 'selesai'
    ) {
      return noStore(
        {
          error: 'Tes peserta sudah selesai.',
        },
        409
      )
    }

    const {
      data: questions,
      error: questionsError,
    } = await supabase
      .from('soal')
      .select(`
        id,
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
        pilihan_d,
        package_code
      `)
      .eq(
        'package_code',
        participant.package_code
      )
      .order('section', {
        ascending: true,
      })
      .order('nomor_soal', {
        ascending: true,
      })

    if (questionsError) {
      console.error(
        'Gagal mengambil soal:',
        questionsError
      )

      return noStore(
        {
          error: 'Bank soal belum dapat dimuat.',
        },
        503
      )
    }

    type QuestionRow = { section?: unknown }

    const listening =
      (questions as QuestionRow[] | undefined)?.filter(
        (q: QuestionRow) => String(q.section) === 'listening'
      ) ?? []

    const structure =
      (questions as QuestionRow[] | undefined)?.filter(
        (q: QuestionRow) => String(q.section) === 'structure'
      ) ?? []

    const reading =
      (questions as QuestionRow[] | undefined)?.filter(
        (q: QuestionRow) => String(q.section) === 'reading'
      ) ?? []

    if (
      listening.length !== 50 ||
      structure.length !== 40 ||
      reading.length !== 50
    ) {
      console.error(
        'Bank soal tidak lengkap:',
        {
          package:
            participant.package_code,
          listening:
            listening.length,
          structure:
            structure.length,
          reading:
            reading.length,
        }
      )

      return noStore(
        {
          error:
            'Bank soal paket peserta belum lengkap.',
        },
        503
      )
    }

    return noStore({
      package_code:
        participant.package_code,

      questions: {
        listening,
        structure,
        reading,
      },
    })
  } catch (error) {
    console.error(
      'GET /api/questions error:',
      error
    )

    return noStore(
      {
        error:
          'Server belum dapat memuat bank soal.',
      },
      500
    )
  }
}