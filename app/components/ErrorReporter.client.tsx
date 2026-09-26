"use client"
import { useEffect } from 'react'
import { errorDetails, reportClientLog } from '@/lib/client-log'

export default function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // Kegagalan resource seperti audio/image dapat memicu window.error tanpa
      // message maupun Error object. Komponen resource sudah mencatat detailnya,
      // jadi jangan memenuhi log dengan pesan "undefined".
      if (!e.message && !e.error) return
      const details = errorDetails(e.error)
      reportClientLog({
        level: 'error',
        message: e.message || details.message,
        href: location.href,
        stack: details.stack,
      })
    }

    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      const details = errorDetails(e.reason)
      reportClientLog({ level: 'error', message: details.message, href: location.href, stack: details.stack })
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
