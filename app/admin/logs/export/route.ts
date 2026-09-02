import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function toCSV(rows: any[]) {
  const headers = ['id', 'created_at', 'level', 'message', 'href', 'stack', 'meta']
  const escape = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = typeof v === 'string' ? v : JSON.stringify(v)
    return `"${s.replace(/"/g, '""')}"`
  }
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h])).join(','))
  }
  return lines.join('\n')
}

export async function GET(request: Request) {
  // require admin session
  try {
    const client = await createClient()
    const { data: claimsData } = await client.auth.getClaims()
    const claims = claimsData?.claims as { app_metadata?: { role?: string } } | undefined
    if (claims?.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  } catch (err) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const q = url.searchParams.get('q') || undefined
  const level = url.searchParams.get('level') || undefined
  const exportAll = url.searchParams.get('exportAll') === '1'
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const pageSize = Math.min(200, Math.max(10, Number(url.searchParams.get('pageSize') || '50')))

  const supabase = createSupabaseAdminClient()

  let base = supabase.from('client_logs').select('id, level, message, href, stack, meta, created_at', { count: 'exact' })
  if (level) base = base.eq('level', level)
  if (q) base = base.ilike('message', `%${q}%`)

  if (exportAll) {
    const allBuilder = base.order('created_at', { ascending: false }).limit(10000)
    const { data: allData, error } = await allBuilder
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const csv = toCSV(allData || [])
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=client_logs_all_${Date.now()}.csv`,
      },
    })
  }

  const start = (page - 1) * pageSize
  const end = start + pageSize - 1
  const builder = base.order('created_at', { ascending: false }).range(start, end)
  const { data, error } = await builder
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const csv = toCSV(data || [])
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=client_logs_${Date.now()}.csv`,
    },
  })
}
