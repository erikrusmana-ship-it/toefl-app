import AdminLoginForm from './login-form'

export const dynamic = 'force-dynamic'

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-violet-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-violet-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-unpas.png" alt="Logo UNPAS" className="mx-auto h-32 w-32 object-contain" />
        <p className="mt-2 text-center text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">Area Terbatas</p>
        <h1 className="mt-2 text-center text-2xl font-bold text-violet-950">Login Administrator</h1>
        <p className="mb-7 mt-2 text-center text-sm leading-6 text-slate-500">English Proficiency Test<br />Laboratorium Prodi Sastra Inggris UNPAS</p>
        <AdminLoginForm />
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">Tidak tersedia pendaftaran publik. Akun administrator dibuat langsung oleh pengelola sistem.</p>
      </section>
    </main>
  )
}
