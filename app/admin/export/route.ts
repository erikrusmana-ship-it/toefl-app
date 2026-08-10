import { createClient } from '@/lib/supabase/server'

function csvValue(value: unknown) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export async function GET() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims as { app_metadata?: { role?: string } } | undefined
  if (claims?.app_metadata?.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('peserta')
    .select('id,nama,npm,prodi,email,package_code,raw_listening,scaled_listening,raw_structure,scaled_structure,raw_reading,scaled_reading,skor_akhir,cefr_level,status_tes,pelanggaran_count,created_at,submitted_at')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const headers = ['ID','Nama Lengkap','NPM','Prodi','Email','Paket','Raw Listening','Scaled Listening','Raw Structure','Scaled Structure','Raw Reading','Scaled Reading','Total Score','CEFR','Status','Pelanggaran','Mulai','Selesai']
  const rows = (data || []).map((participant) => [participant.id,participant.nama,participant.npm,participant.prodi,participant.email,participant.package_code,participant.raw_listening,participant.scaled_listening,participant.raw_structure,participant.scaled_structure,participant.raw_reading,participant.scaled_reading,participant.skor_akhir,participant.cefr_level,participant.status_tes,participant.pelanggaran_count,participant.created_at,participant.submitted_at].map(csvValue).join(','))
  const csv = `\uFEFF${headers.map(csvValue).join(',')}\n${rows.join('\n')}`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hasil-english-proficiency-test-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
