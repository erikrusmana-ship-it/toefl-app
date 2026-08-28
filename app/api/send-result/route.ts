import { NextResponse } from 'next/server'
import { readTestSession } from '@/lib/test-session-cookie'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import {
  isValidResultEmailPayload,
  ResultEmailConfigurationError,
  ResultEmailDeliveryError,
  sendResultEmail,
  type ResultEmailPayload,
} from '@/lib/result-email'

interface EmailRequest {
  participantId: number
  submissionToken: string
}

export async function POST(request: Request) {
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

  const supabase = createSupabaseAdminClient()
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

  const payload = data as Partial<ResultEmailPayload> | null
  if (error || !payload || !isValidResultEmailPayload(payload)) {
    return NextResponse.json({ error: 'Result not found or session is invalid.' }, { status: 403 })
  }

  await markEmailDelivery(payload.participantId, 'sending')

  try {
    await sendResultEmail(payload)
  } catch (sendError) {
    if (sendError instanceof ResultEmailConfigurationError) {
      console.error(sendError.message)
      await markEmailDelivery(payload.participantId, 'failed', sendError.message)
      return NextResponse.json({ error: 'Email service is not configured.' }, { status: 503 })
    }

    const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown email delivery error.'
    console.error('Result email delivery failed:', errorMessage)
    await markEmailDelivery(payload.participantId, 'failed', errorMessage)
    return NextResponse.json(
      { error: 'Failed to send result email.' },
      { status: sendError instanceof ResultEmailDeliveryError ? 502 : 500 },
    )
  }

  await markEmailDelivery(payload.participantId, 'sent')
  return NextResponse.json({ success: true })
}
