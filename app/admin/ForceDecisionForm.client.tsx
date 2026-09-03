"use client"

import React from 'react'
import { adminExpelParticipant, adminAllowParticipant } from './actions'

type Props = {
  id: number
}

export function ExpelForm({ id }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const ok = window.confirm('Keluarkan peserta dari tes? Tindakan ini bersifat final.')
    if (!ok) e.preventDefault()
  }
  return (
    <form action={adminExpelParticipant as unknown as FormData | (() => void)} method="post" onSubmit={handleSubmit} className="inline">
      <input type="hidden" name="id" value={id} />
      <button className="rounded-md bg-red-100 px-3 py-1 text-sm text-red-800">Keluarkan</button>
    </form>
  )
}

export function AllowForm({ id }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const ok = window.confirm('Izinkan peserta melanjutkan tes?')
    if (!ok) e.preventDefault()
  }
  return (
    <form action={adminAllowParticipant as unknown as FormData | (() => void)} method="post" onSubmit={handleSubmit} className="inline">
      <input type="hidden" name="id" value={id} />
      <button className="rounded-md bg-emerald-100 px-3 py-1 text-sm text-emerald-800">Biarkan</button>
    </form>
  )
}

export default function ForceDecisionForm() { return null }
