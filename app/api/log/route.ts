import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const level = (body.level as string) || 'error'
    const message = body.message || '<no message>'
    const href = body.href || ''
    const stack = body.stack || ''
    const meta = body.meta || {}

    const logLine = {
      ts: new Date().toISOString(),
      level,
      message,
      href,
      stack,
      meta,
    }

    // Print to server logs; you can later forward this to a DB or external collector
    if (level === 'error') console.error(JSON.stringify(logLine))
    else if (level === 'warn') console.warn(JSON.stringify(logLine))
    else console.log(JSON.stringify(logLine))

    return NextResponse.json({}, { status: 204 })
  } catch (err) {
    console.error('Failed to process /api/log payload', err)
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  }
}
