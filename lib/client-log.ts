'use client'

export type ClientLogLevel = 'error' | 'warn' | 'info'

export type ClientLogPayload = {
  level: ClientLogLevel
  message: string
  href?: string
  stack?: string
  meta?: Record<string, unknown>
}

export function errorDetails(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack || '' }
  }

  return { message: String(error), stack: '' }
}

export function reportClientLog(payload: ClientLogPayload) {
  try {
    void fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined)
  } catch {
    // Pelaporan tidak boleh mengganggu alur tes peserta.
  }
}
