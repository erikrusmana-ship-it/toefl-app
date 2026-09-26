import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 32_000

type LogPayload = {
  level?: unknown
  message?: unknown
  href?: unknown
  stack?: unknown
  meta?: unknown
}

function noStore(data: unknown, status: number) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

function truncate(value: unknown, maxLength: number, fallback = '') {
  if (typeof value !== 'string') return fallback
  return value.trim().slice(0, maxLength)
}

function normalizeMeta(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  try {
    const serialized = JSON.stringify(value)
    if (serialized.length > 8_000) return { truncated: true }
    return value as Record<string, unknown>
  } catch {
    return { serialization_failed: true }
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return noStore({ error: 'Permintaan lintas situs ditolak.' }, 403)

  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return noStore({ error: 'Format permintaan tidak valid.' }, 415)
  }

  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return noStore({ error: 'Payload terlalu besar.' }, 413)
  }

  let rawBody = ''
  try {
    rawBody = await request.text()
  } catch {
    return noStore({ error: 'Data permintaan tidak dapat dibaca.' }, 400)
  }

  if (!rawBody || new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return noStore({ error: rawBody ? 'Payload terlalu besar.' : 'Data permintaan kosong.' }, rawBody ? 413 : 400)
  }

  let payload: LogPayload
  try {
    const parsed: unknown = JSON.parse(rawBody)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid payload')
    payload = parsed as LogPayload
  } catch {
    return noStore({ error: 'Data permintaan tidak valid.' }, 400)
  }

  const level = payload.level === 'warn' || payload.level === 'info' ? payload.level : 'error'
  const logLine = {
    level,
    message: truncate(payload.message, 1_000, '<no message>'),
    href: truncate(payload.href, 2_000),
    stack: truncate(payload.stack, 8_000),
    meta: normalizeMeta(payload.meta),
    created_at: new Date().toISOString(),
  }

  if (level === 'error') console.error('[client-log]', logLine)
  else if (level === 'warn') console.warn('[client-log]', logLine)
  else console.info('[client-log]', logLine)

  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from('client_logs').insert(logLine)
    if (error) console.warn('[client-log] Supabase insert failed:', error.message)
  } catch (error) {
    console.warn('[client-log] Supabase unavailable:', error instanceof Error ? error.message : String(error))
  }

  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
