'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    const prepareSession = async () => {
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const exchange = await supabase.auth.exchangeCodeForSession(code)
        if (exchange.error) {
          setError('Tautan aktivasi tidak valid atau sudah kedaluwarsa.')
          return
        }
      }

      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setError('Sesi aktivasi tidak ditemukan. Silakan gunakan tautan terbaru dari email.')
        return
      }

      setReady(true)
    }

    void prepareSession()
  }, [])

  const savePassword = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (password.length < 10) {
      setError('Password harus terdiri dari minimal 10 karakter.')
      return
    }

    if (password !== confirmation) {
      setError('Konfirmasi password tidak sama.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const result = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (result.error) {
      setError('Password belum berhasil disimpan. Silakan ulangi atau gunakan tautan terbaru.')
      return
    }

    router.replace('/admin')
    router.refresh()
  }

  return (
    <form onSubmit={savePassword} className="space-y-4">
      <label className="block text-sm font-bold text-slate-700">
        Password baru
        <input required disabled={!ready} type="password" autoComplete="new-password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200 disabled:bg-slate-100" placeholder="Minimal 10 karakter" />
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Ulangi password
        <input required disabled={!ready} type="password" autoComplete="new-password" minLength={10} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200 disabled:bg-slate-100" placeholder="Ketik ulang password" />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <button disabled={!ready || loading} className="w-full rounded-xl bg-violet-800 px-4 py-3 font-bold text-white hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Menyimpan password...' : 'Aktifkan Akun Admin'}</button>
    </form>
  )
}
