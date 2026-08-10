import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logoutAdmin, toggleAccessCode } from './actions'
import AutoRefresh from './auto-refresh'

export const dynamic = 'force-dynamic'

type Participant = {
  id: number
  nama: string
  npm: string | null
  prodi: string | null
  email: string
  skor_akhir: number | null
  cefr_level: string | null
  status_tes: string
  pelanggaran_count: number
  created_at: string
  submitted_at: string | null
  test_started_at: string
  last_activity_at: string
  current_section: string
  current_question: number
  section_deadline: string
  package_code: string
}

type AccessCode = {
  id: number
  batch: string
  is_active: boolean
  use_count: number
  last_used_at: string | null
  created_at: string
  package_code: string
}

type QuestionSection = { section: string; package_code: string }

function packageLabel(code: string) {
  return code === 'model_a' ? 'Model A' : code === 'model_b' ? 'Paket B' : code
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

function monitoringStatus(participant: Participant, now: number) {
  if (participant.submitted_at || participant.skor_akhir !== null) {
    if (participant.status_tes === 'dihentikan_pelanggaran') return { key: 'stopped', label: 'Dihentikan', className: 'bg-red-100 text-red-800' }
    return { key: 'completed', label: 'Selesai', className: 'bg-emerald-100 text-emerald-800' }
  }
  if (new Date(participant.section_deadline).getTime() < now) return { key: 'expired', label: 'Waktu habis', className: 'bg-orange-100 text-orange-800' }
  if (now - new Date(participant.last_activity_at).getTime() <= 75_000) return { key: 'active', label: 'Aktif', className: 'bg-blue-100 text-blue-800' }
  return { key: 'disconnected', label: 'Terputus', className: 'bg-amber-100 text-amber-800' }
}

function sectionLabel(section: string) {
  if (section === 'selesai') return 'Selesai'
  if (section === 'listening') return 'Listening'
  if (section === 'structure') return 'Structure'
  if (section === 'reading') return 'Reading'
  return 'Belum mulai'
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims as { email?: string; app_metadata?: { role?: string } } | undefined
  if (claims?.app_metadata?.role !== 'admin') redirect('/admin/login')

  const [participantsResult, accessCodesResult, questionsResult, timeResult] = await Promise.all([
    supabase
      .from('peserta')
      .select('id,nama,npm,prodi,email,skor_akhir,cefr_level,status_tes,pelanggaran_count,created_at,submitted_at,test_started_at,last_activity_at,current_section,current_question,section_deadline,package_code')
      .order('created_at', { ascending: false })
      .limit(250),
    supabase
      .from('test_access_codes')
      .select('id,batch,is_active,use_count,last_used_at,created_at,package_code')
      .order('id', { ascending: true })
      .limit(500),
    supabase.from('soal').select('section,package_code'),
    supabase.rpc('get_monitoring_time'),
  ])

  const errors = [participantsResult.error, accessCodesResult.error, questionsResult.error, timeResult.error].filter(Boolean)
  const participants = (participantsResult.data || []) as Participant[]
  const accessCodes = (accessCodesResult.data || []) as AccessCode[]
  const questions = (questionsResult.data || []) as QuestionSection[]
  const now = Date.parse(String(timeResult.data || '1970-01-01T00:00:00Z'))
  const statuses = new Map(participants.map((participant) => [participant.id, monitoringStatus(participant, now)]))
  const completed = participants.filter((participant) => statuses.get(participant.id)?.key === 'completed').length
  const active = participants.filter((participant) => statuses.get(participant.id)?.key === 'active').length
  const interrupted = participants.filter((participant) => ['disconnected', 'expired'].includes(statuses.get(participant.id)?.key || '')).length
  const violations = participants.filter((participant) => participant.pelanggaran_count > 0).length
  const activeCodes = accessCodes.filter((code) => code.is_active).length
  const sectionCounts = questions.reduce<Record<string, number>>((result, question) => {
    const section = question.section.trim().toLowerCase()
    const sectionName = section.includes('listen') ? 'Listening' : section.includes('struct') ? 'Structure' : section.includes('read') ? 'Reading' : question.section
    const key = `${packageLabel(question.package_code)} · ${sectionName}`
    result[key] = (result[key] || 0) + 1
    return result
  }, {})

  return (
    <main className="min-h-screen bg-violet-50 px-4 py-8 text-slate-800">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl bg-violet-950 px-6 py-5 text-white shadow-lg md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-unpas.png" alt="Logo UNPAS" className="h-16 w-16 rounded-xl bg-white object-contain p-1" />
            <div>
              <p className="text-sm text-violet-200">Laboratorium Prodi Sastra Inggris UNPAS</p>
              <h1 className="text-2xl font-bold">Dashboard English Proficiency Test</h1>
              <p className="mt-1 text-xs text-violet-200">Login sebagai {claims.email || 'Administrator'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/export" className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-violet-900 hover:bg-violet-100">Unduh CSV</Link>
            <form action={logoutAdmin}><button className="rounded-lg border border-violet-300 px-4 py-2 text-sm font-bold hover:bg-violet-900">Keluar</button></form>
          </div>
        </header>

        {errors.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">Sebagian data belum dapat dimuat: {errors.map((error) => error?.message).join('; ')}</div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            ['Total peserta', participants.length],
            ['Sedang aktif', active],
            ['Terputus / waktu habis', interrupted],
            ['Tes selesai', completed],
            ['Peserta melanggar', violations],
            ['Kode aktif', activeCodes],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-violet-100">
              <p className="text-sm text-slate-500">{label}</p>
              <strong className="mt-2 block text-3xl text-violet-900">{value}</strong>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-violet-100">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-bold text-violet-950">Pemantauan peserta</h2><p className="text-sm text-slate-500">Status diperbarui otomatis setiap 30 detik. Menampilkan maksimal 250 peserta terbaru.</p></div>
            <AutoRefresh />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] border-collapse text-sm">
              <thead><tr className="bg-violet-100 text-left text-violet-950">{['Nama','NPM','Prodi','Email','Posisi','Status','Aktivitas terakhir','Skor','CEFR','Pelanggaran','Mulai','Selesai'].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
              <tbody>
                {participants.map((participant) => {
                  const status = statuses.get(participant.id)!
                  return <tr key={participant.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-3 font-semibold">{participant.nama}</td><td className="px-3 py-3">{participant.npm || '—'}</td><td className="px-3 py-3">{participant.prodi || '—'}</td><td className="px-3 py-3">{participant.email}</td>
                    <td className="px-3 py-3"><strong>{sectionLabel(participant.current_section)}</strong><br /><span className="text-xs text-slate-500">{packageLabel(participant.package_code)} · Soal {participant.current_question}</span></td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${status.className}`}>{status.label}</span></td>
                    <td className="px-3 py-3">{formatDate(participant.last_activity_at)}</td>
                    <td className="px-3 py-3 font-bold text-violet-900">{participant.skor_akhir ?? '—'}</td><td className="px-3 py-3">{participant.cefr_level || '—'}</td>
                    <td className={`px-3 py-3 font-semibold ${participant.pelanggaran_count ? 'text-red-700' : 'text-emerald-700'}`}>{participant.pelanggaran_count}</td><td className="px-3 py-3">{formatDate(participant.test_started_at || participant.created_at)}</td><td className="px-3 py-3">{formatDate(participant.submitted_at)}</td>
                  </tr>
                })}
                {!participants.length && <tr><td colSpan={12} className="px-3 py-8 text-center text-slate-500">Belum ada data peserta.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-violet-100">
            <h2 className="text-xl font-bold text-violet-950">Bank soal</h2>
            <div className="mt-4 space-y-3">{['Paket B · Listening','Paket B · Structure','Paket B · Reading','Model A · Listening','Model A · Structure','Model A · Reading'].map((section) => <div key={section} className="flex justify-between rounded-xl bg-violet-50 px-4 py-3"><span>{section}</span><strong>{sectionCounts[section] || 0} soal</strong></div>)}</div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-violet-100">
            <h2 className="text-xl font-bold text-violet-950">Kode akses</h2>
            <p className="mt-1 text-sm text-slate-500">Kode asli tetap dirahasiakan; dashboard hanya menampilkan statistik penggunaan.</p>
            <div className="mt-4 max-h-[430px] overflow-auto">
              <table className="w-full min-w-[650px] border-collapse text-sm">
                <thead><tr className="sticky top-0 bg-violet-100 text-left text-violet-950"><th className="px-3 py-3">ID</th><th className="px-3 py-3">Paket</th><th className="px-3 py-3">Batch</th><th className="px-3 py-3">Pemakaian</th><th className="px-3 py-3">Terakhir</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Aksi</th></tr></thead>
                <tbody>{accessCodes.map((code) => <tr key={code.id} className="border-b border-slate-100"><td className="px-3 py-3">{code.id}</td><td className="px-3 py-3 font-semibold">{packageLabel(code.package_code)}</td><td className="px-3 py-3">{code.batch}</td><td className="px-3 py-3">{code.use_count}</td><td className="px-3 py-3">{formatDate(code.last_used_at)}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${code.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{code.is_active ? 'Aktif' : 'Nonaktif'}</span></td><td className="px-3 py-3"><form action={toggleAccessCode}><input type="hidden" name="id" value={code.id} /><input type="hidden" name="nextState" value={String(!code.is_active)} /><button className="font-bold text-violet-800 underline">{code.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></form></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
