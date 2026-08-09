'use client'

import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-violet-50 px-4 py-10 text-slate-800">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-violet-100">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-100 text-3xl font-black text-red-700">!</div>
        <h1 className="mt-5 text-2xl font-bold text-violet-950">Halaman mengalami kendala</h1>
        <p className="mt-3 leading-7 text-slate-600">Data Anda tidak langsung hilang. Periksa koneksi internet, lalu coba memuat halaman kembali.</p>
        {error.digest && <p className="mt-2 text-xs text-slate-400">Kode insiden: {error.digest}</p>}
        <button type="button" onClick={reset} className="mt-6 rounded-xl bg-violet-800 px-6 py-3 font-bold text-white hover:bg-violet-900">Coba Lagi</button>
      </section>
    </main>
  )
}

