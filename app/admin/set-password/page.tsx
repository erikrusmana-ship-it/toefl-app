import SetPasswordForm from './set-password-form'

export default function AdminSetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">Aktivasi Administrator</p>
        <h1 className="mt-3 text-3xl font-black text-slate-900">Buat Password Admin</h1>
        <p className="mt-2 mb-6 text-sm leading-6 text-slate-600">Gunakan password yang kuat dan jangan membagikannya kepada siapa pun.</p>
        <SetPasswordForm />
      </section>
    </main>
  )
}
