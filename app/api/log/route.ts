import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const level = (body.level as string) || 'error'
    const message = body.message || '<no message>'
    const href = body.href || ''
    const stack = body.stack || ''
    const meta = body.meta || {}

    const logLine = {
      level,
      message,
      href,
      stack,
      meta,
      created_at: new Date().toISOString(),
    }

    // Always print to server logs for immediate visibility
    if (level === 'error') console.error(JSON.stringify(logLine))
    else if (level === 'warn') console.warn(JSON.stringify(logLine))
    else console.log(JSON.stringify(logLine))

    // Try to persist to Supabase client_logs table; if it fails, fallback to console
    try {
      const supabase = createSupabaseAdminClient()
      const { error } = await supabase.from('client_logs').insert(logLine)
      if (error) {
        console.warn('Failed to persist client log to Supabase:', error.message)
      }
    } catch (dbErr) {
      console.warn('Error while saving client log to Supabase', dbErr)
    }

    return NextResponse.json({}, { status: 204 })
  } catch (err) {
    console.error('Failed to process /api/log payload', err)
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  }
}
