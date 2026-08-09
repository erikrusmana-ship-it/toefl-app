'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const sendRecovery = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/admin/set-password`,
    })
    setLoading(false)

    if (recoveryError) {
      setError(/rate limit|too many/i.test(recoveryError.message)
        ? 'Terlalu banyak permintaan email. Tunggu beberapa menit, lalu coba kembali.'
        : 'Email pemulihan belum dapat dikirim. Periksa alamat email dan koneksi Anda.')
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800" role="status">
          Jika alamat tersebut terdaftar sebagai admin, tautan pemulihan password telah dikirim. Periksa juga folder Spam.
        </div>
        <button type="button" onClick={() => setSent(false)} className="font-bold text-violet-800 underline">Kirim ulang</button>
        <span className="mx-2 text-slate-300">•</span>
        <Link href="/admin/login" className="font-bold text-violet-800 underline">Kembali ke login</Link>
      </div>
    )
  }

  return (
    <form onSubmit={sendRecovery} className="space-y-4">
      <label className="block text-sm font-bold text-slate-700">
        Email admin
        <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200" placeholder="admin@unpas.ac.id" />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-violet-800 px-4 py-3 font-bold text-white hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Mengirim email...' : 'Kirim Tautan Pemulihan'}</button>
      <Link href="/admin/login" className="block text-center text-sm font-bold text-violet-800 underline">Kembali ke login</Link>
    </form>
  )
}

