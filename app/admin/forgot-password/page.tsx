import ForgotPasswordForm from './forgot-password-form'

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-violet-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-violet-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-unpas.png" alt="Logo UNPAS" className="mx-auto h-28 w-28 object-contain" />
        <h1 className="mt-3 text-center text-2xl font-bold text-violet-950">Lupa Password Admin</h1>
        <p className="mb-7 mt-2 text-center text-sm leading-6 text-slate-500">Masukkan email administrator untuk menerima tautan pembuatan password baru.</p>
        <ForgotPasswordForm />
      </section>
    </main>
  )
}

