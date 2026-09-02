import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    // try to parse JSON robustly (some environments may behave oddly)
    let body: any = {}
    try {
      body = await request.json()
    } catch (parseErr) {
      try {
        const text = await request.text()
        body = text ? JSON.parse(text) : {}
      } catch (textErr) {
        console.error('Failed to parse /api/log request body', parseErr, textErr)
        return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
      }
    }

    // log incoming headers for debug visibility when troubleshooting
    try {
      // eslint-disable-next-line no-console
      console.debug('[/api/log] headers:', Object.fromEntries((request.headers as any) || []))
    } catch (_) {
      /* ignore */
    }

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
