'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

const REFRESH_SECONDS = 30

export default function AutoRefresh() {
  const router = useRouter()
  const [seconds, setSeconds] = useState(REFRESH_SECONDS)
  const [refreshing, startRefresh] = useTransition()

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          startRefresh(() => router.refresh())
          return REFRESH_SECONDS
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [router])

  const refreshNow = () => {
    setSeconds(REFRESH_SECONDS)
    startRefresh(() => router.refresh())
  }

  return (
    <button type="button" onClick={refreshNow} disabled={refreshing} className="rounded-lg border border-violet-300 px-4 py-2 text-sm font-bold text-violet-900 hover:bg-violet-50 disabled:opacity-60">
      {refreshing ? 'Memperbarui...' : `Perbarui (${seconds} dtk)`}
    </button>
  )
}
