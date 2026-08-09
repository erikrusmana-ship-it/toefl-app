import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-violet-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-violet-100">
        <p className="text-5xl font-black text-violet-300">404</p>
        <h1 className="mt-3 text-2xl font-bold text-violet-950">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-slate-600">Alamat yang dibuka tidak tersedia atau sudah dipindahkan.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-violet-800 px-6 py-3 font-bold text-white hover:bg-violet-900">Kembali ke Halaman Awal</Link>
      </section>
    </main>
  )
}

