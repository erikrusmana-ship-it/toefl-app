'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const result = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    setLoading(false)

    if (result.error) {
      setError('Email atau password admin tidak benar.')
      return
    }

    const role = result.data.user?.app_metadata?.role
    if (role !== 'admin') {
      await supabase.auth.signOut()
      setError('Akun ini tidak memiliki akses administrator.')
      return
    }

    router.replace('/admin')
    router.refresh()
  }

  return (
    <form onSubmit={login} className="space-y-4">
      <label className="block text-sm font-bold text-slate-700">Email admin<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200" placeholder="admin@unpas.ac.id" /></label>
      <label className="block text-sm font-bold text-slate-700">Password<input required type="password" autoComplete="current-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200" placeholder="Masukkan password" /></label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-violet-800 px-4 py-3 font-bold text-white hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Memeriksa akun...' : 'Masuk sebagai Admin'}</button>
    </form>
  )
}
