"use client"
import { useEffect } from 'react'

function postLog(payload: Record<string, unknown>) {
  try {
    void fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // ignore
  }
}

export default function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      postLog({ level: 'error', message: e.message, href: location.href, stack: e.error?.stack || '' })
    }

    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      const reason = (e.reason as any) || {}
      postLog({ level: 'error', message: reason?.message || String(reason), href: location.href, stack: reason?.stack || '' })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  return null
}
