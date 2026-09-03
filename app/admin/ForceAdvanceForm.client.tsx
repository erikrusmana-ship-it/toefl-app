"use client"

import React from 'react'
import { forceAdvanceParticipant } from './actions'

type Props = {
  id: number
  action?: 'next' | 'section'
}

export default function ForceAdvanceForm({ id, action = 'next' }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const ok = window.confirm('Anda akan memaksa peserta melanjutkan. Lanjutkan?')
    if (!ok) e.preventDefault()
  }

  return (
    <form action={forceAdvanceParticipant as unknown as FormData | (() => void)} method="post" onSubmit={handleSubmit} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <button className="rounded-md bg-violet-100 px-3 py-1 text-sm text-violet-900">Paksa Lanjut</button>
    </form>
  )
}
