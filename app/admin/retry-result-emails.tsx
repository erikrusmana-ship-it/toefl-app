'use client'

import { useActionState } from 'react'
import { retryPendingResultEmails, type RetryEmailState } from './actions'

const initialState: RetryEmailState = { status: 'idle', message: '' }

export default function RetryResultEmails({ pendingCount }: { pendingCount: number }) {
  const [state, formAction, isPending] = useActionState(retryPendingResultEmails, initialState)

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <form action={formAction}>
        <button
          type="submit"
          disabled={isPending || pendingCount === 0}
          className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-amber-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Mengirim email...' : `Kirim ulang email tertunda (${pendingCount})`}
        </button>
      </form>
      {state.message ? (
        <p
          aria-live="polite"
          className={`max-w-sm text-xs ${state.status === 'error' ? 'text-red-200' : 'text-emerald-200'}`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  )
}
