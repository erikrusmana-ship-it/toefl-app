import { after, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { createSupabaseAdminClient } from '@/lib/supabase-admin'

import {
  decodeTestSession,
  TEST_SESSION_COOKIE,
} from '@/lib/test-session-cookie'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SubmitAnswer = {
  question_id: number
  answer: 'A' | 'B' | 'C' | 'D' | 'X'
}

type SubmitPayload = {
  answers?: unknown
  violations?: unknown
  status?: unknown
}

function noStore(
  data: unknown,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })
}

function sameOrigin(request: Request) {
  const origin =
    request.headers.get('origin')

  if (!origin) {
    return true
  }

  return (
    origin ===
    new URL(request.url).origin
  )
}

async function getSession() {
  const cookieStore =
    await cookies()

  const rawSession =
    cookieStore
      .get(TEST_SESSION_COOKIE)
      ?.value

  return decodeTestSession(
    rawSession
  )
}

function normalizeAnswers(
  value: unknown
): SubmitAnswer[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  if (
    value.length < 1 ||
    value.length > 140
  ) {
    return null
  }

  const result: SubmitAnswer[] = []
  const ids = new Set<number>()

  for (const item of value) {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item)
    ) {
      return null
    }

    const row =
      item as Record<string, unknown>

    const questionId =
      Number(row.question_id)

    const answer =
      typeof row.answer === 'string'
        ? row.answer.toUpperCase()
        : ''

    if (
      !Number.isSafeInteger(questionId) ||
      questionId <= 0
    ) {
      return null
    }

    if (
      ![
        'A',
        'B',
        'C',
        'D',
        'X',
      ].includes(answer)
    ) {
      return null
    }

    // question_id tidak boleh muncul dua kali
    if (ids.has(questionId)) {
      return null
    }

    ids.add(questionId)

    result.push({
      question_id: questionId,
      answer:
        answer as SubmitAnswer['answer'],
    })
  }

  return result
}

function normalizeViolations(
  value: unknown
) {
  if (!Array.isArray(value)) {
    return null
  }

  if (value.length > 10) {
    return null
  }

  for (const violation of value) {
    if (
      !violation ||
      typeof violation !== 'object' ||
      Array.isArray(violation)
    ) {
      return null
    }
  }

  return value
}

/**
 * POST /api/test-submit
 */
export async function POST(
  request: Request
) {
  const startedAt =
    Date.now()

  try {
    /**
     * ========================================
     * 1. SAME ORIGIN
     * ========================================
     */

    if (!sameOrigin(request)) {
      return noStore(
        {
          error:
            'Permintaan lintas situs ditolak.',
        },
        403
      )
    }

    /**
     * ========================================
     * 2. CONTENT TYPE
     * ========================================
     */

    const contentType =
      request.headers
        .get('content-type')
        ?.toLowerCase()

    if (
      !contentType?.startsWith(
        'application/json'
      )
    ) {
      return noStore(
        {
          error:
            'Format permintaan tidak valid.',
        },
        415
      )
    }

    /**
     * ========================================
     * 3. SESSION COOKIE
     * ========================================
     */

    const session =
      await getSession()

    if (!session) {
      return noStore(
        {
          error:
            'Sesi tes tidak ditemukan.',
        },
        401
      )
    }

    /**
     * ========================================
     * 4. PARSE REQUEST
     * ========================================
     */

    let payload: SubmitPayload

    try {
      payload =
        await request.json()
    } catch {
      return noStore(
        {
          error:
            'Data hasil tes tidak valid.',
        },
        400
      )
    }

    /**
     * ========================================
     * 5. VALIDASI STATUS
     * ========================================
     */

    const status =
      String(payload.status || '')

    if (
      status !== 'selesai' &&
      status !==
        'dihentikan_pelanggaran'
    ) {
      return noStore(
        {
          error:
            'Status hasil tes tidak valid.',
        },
        400
      )
    }

    /**
     * ========================================
     * 6. VALIDASI ANSWERS
     * ========================================
     */

    const answers =
      normalizeAnswers(
        payload.answers
      )

    if (!answers) {
      return noStore(
        {
          error:
            'Data jawaban peserta tidak valid.',
        },
        400
      )
    }

    /**
     * ========================================
     * 7. VALIDASI VIOLATIONS
     * ========================================
     */

    const violations =
      normalizeViolations(
        payload.violations
      )

    if (!violations) {
      return noStore(
        {
          error:
            'Data pelanggaran tidak valid.',
        },
        400
      )
    }

    /**
     * ========================================
     * 8. SUBMIT KE DATABASE
     * ========================================
     */

    const supabase =
      createSupabaseAdminClient()

    const {
      data,
      error,
    } = await supabase.rpc(
      'submit_test_attempt',
      {
        p_participant_id:
          session.participantId,

        p_submission_token:
          session.submissionToken,

        p_answers:
          answers,

        p_violations:
          violations,

        p_status:
          status,
      }
    )

    if (error) {
      console.error(
        JSON.stringify({
          event:
            'test_submit_failed',

          participantId:
            session.participantId,

          durationMs:
            Date.now() -
            startedAt,

          error:
            error.message,
        })
      )

      const message =
        String(
          error.message || ''
        )

      if (
        /sesi peserta/i.test(
          message
        )
      ) {
        return noStore(
          {
            error:
              'Sesi peserta tidak lagi valid.',
          },
          401
        )
      }

      if (
        /package|paket/i.test(
          message
        )
      ) {
        return noStore(
          {
            error:
              'Jawaban tidak sesuai dengan paket tes peserta.',
          },
          409
        )
      }

      return noStore(
        {
          error:
            'Hasil belum tersimpan. Periksa koneksi lalu coba lagi.',
        },
        503
      )
    }

    if (!data) {
      console.error(
        JSON.stringify({
          event:
            'test_submit_empty_result',

          participantId:
            session.participantId,
        })
      )

      return noStore(
        {
          error:
            'Database tidak mengembalikan hasil submit.',
        },
        503
      )
    }

    /**
     * ========================================
     * 9. EMAIL HASIL
     * ========================================
     *
     * Submit database sudah selesai.
     * Email tidak menghambat response utama.
     */

    const emailUrl =
      new URL(
        '/api/send-result',
        request.url
      )

    const cookieHeader =
      request.headers
        .get('cookie') || ''

    after(async () => {
      for (
        let attempt = 1;
        attempt <= 3;
        attempt += 1
      ) {
        try {
          const response =
            await fetch(
              emailUrl,
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',

                  Cookie:
                    cookieHeader,
                },

                body: '{}',

                cache: 'no-store',
              }
            )

          if (response.ok) {
            console.info(
              JSON.stringify({
                event:
                  'result_email_sent',

                participantId:
                  session.participantId,

                attempt,
              })
            )

            return
          }

          console.error(
            JSON.stringify({
              event:
                'result_email_failed',

              participantId:
                session.participantId,

              attempt,

              status:
                response.status,
            })
          )
        } catch (emailError) {
          console.error(
            JSON.stringify({
              event:
                'result_email_failed',

              participantId:
                session.participantId,

              attempt,

              error:
                emailError
                  instanceof Error
                  ? emailError.message
                  : 'unknown_error',
            })
          )
        }

        if (attempt < 3) {
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                attempt * 750
              )
          )
        }
      }
    })

    /**
     * ========================================
     * 10. SUCCESS
     * ========================================
     */

    console.info(
      JSON.stringify({
        event:
          'test_submit_succeeded',

        participantId:
          session.participantId,

        durationMs:
          Date.now() -
          startedAt,
      })
    )

    return noStore({
      success: true,
      result: data,
    })
  } catch (error) {
    console.error(
      'POST /api/test-submit:',
      error
    )

    return noStore(
      {
        error:
          'Server belum dapat memproses hasil tes.',
      },
      500
    )
  }
}