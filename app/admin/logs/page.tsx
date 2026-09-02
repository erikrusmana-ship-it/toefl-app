import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

export const metadata = {
  title: 'Admin - Client Logs',
}

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

export default async function LogsPage({ searchParams }: { searchParams?: { [key: string]: string | string[] } }) {
  // require admin
  const client = await createClient()
  const { data: claimsData } = await client.auth.getClaims()
  const claims = claimsData?.claims as { app_metadata?: { role?: string } } | undefined
  if (claims?.app_metadata?.role !== 'admin') redirect('/admin/login')

  const page = Math.max(1, Number((searchParams?.page as string) || '1'))
  const pageSize = Math.min(200, Math.max(10, Number((searchParams?.pageSize as string) || '50')))
  const level = (searchParams?.level as string) || undefined
  const q = (searchParams?.q as string) || undefined
  const exportCsv = (searchParams?.export as string) === 'csv'

  const supabase = createSupabaseAdminClient()

  let base = supabase.from('client_logs').select('id, level, message, href, stack, meta, created_at', { count: 'exact' })
  let builder: any = base
  if (level) builder = builder.eq('level', level)
  if (q) builder = builder.ilike('message', `%${q}%`)

  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  builder = builder.order('created_at', { ascending: false }).range(start, end)

  const { data, error, count } = await builder

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Client Logs</h1>
        <p className="mt-4 text-red-600">Failed to load logs: {error.message}</p>
      </div>
    )
  }

  const total = typeof count === 'number' ? count : 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // export CSV for current page or entire filtered dataset
  const exportAll = (searchParams?.exportAll as string) === '1'
  if (exportCsv) {
    if (exportAll) {
      // fetch all filtered rows (cap at 10k)
      let allBuilder: any = base
      if (level) allBuilder = allBuilder.eq('level', level)
      if (q) allBuilder = allBuilder.ilike('message', `%${q}%`)
      allBuilder = allBuilder.order('created_at', { ascending: false }).limit(10000)
      const { data: allData } = await allBuilder
      const csv = toCSV(allData || [])
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=client_logs_all_${Date.now()}.csv`,
        },
      })
    }

    const csv = toCSV(data || [])
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=client_logs_${Date.now()}.csv`,
      },
    })
  }

  const nextPage = page + 1
  const prevPage = page > 1 ? page - 1 : null

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Client Logs</h1>
      <p className="text-sm text-muted-foreground">Showing page {page} of {totalPages} — total {total} logs</p>

      <div className="mt-4 mb-4">
        <form method="get" className="flex gap-2">
          <input name="q" defaultValue={q || ''} placeholder="search message" className="border px-2 py-1" />
          <select name="level" defaultValue={level || ''} className="border px-2 py-1">
            <option value="">All levels</option>
            <option value="error">error</option>
            <option value="warn">warn</option>
            <option value="info">info</option>
          </select>
          <input name="pageSize" defaultValue={String(pageSize)} className="border px-2 py-1 w-20" />
          <button type="submit" className="bg-violet-600 text-white px-3 py-1">Filter</button>
          <a href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(level ? { level } : {}), page: String(page), pageSize: String(pageSize), export: 'csv' })}`} className="ml-2 underline">Export page CSV</a>
          <a href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(level ? { level } : {}), export: 'csv', exportAll: '1' })}`} className="ml-2 underline">Export all CSV</a>
        </form>
      </div>

      <div className="mt-4 overflow-auto">
        <table className="w-full table-auto text-sm border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left">Time</th>
              <th className="border px-2 py-1 text-left">Level</th>
              <th className="border px-2 py-1 text-left">Message</th>
              <th className="border px-2 py-1 text-left">Href</th>
              <th className="border px-2 py-1 text-left">Stack</th>
              <th className="border px-2 py-1 text-left">Meta</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((row: any) => (
              <tr key={row.id} className="align-top">
                <td className="border px-2 py-1 align-top">{new Date(row.created_at).toLocaleString()}</td>
                <td className="border px-2 py-1">{row.level}</td>
                <td className="border px-2 py-1 max-w-xs break-words">{row.message}</td>
                <td className="border px-2 py-1 max-w-xs break-words">{row.href}</td>
                <td className="border px-2 py-1 max-w-xs break-words whitespace-pre-wrap">{row.stack}</td>
                <td className="border px-2 py-1 max-w-xs break-words whitespace-pre-wrap">{JSON.stringify(row.meta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-2">
        {prevPage ? <a className="px-3 py-1 border" href={`?page=${prevPage}&pageSize=${pageSize}${level ? `&level=${level}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`}>Previous</a> : <span className="px-3 py-1 text-muted">Previous</span>}
        <a className="px-3 py-1 border" href={`?page=${nextPage}&pageSize=${pageSize}${level ? `&level=${level}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`}>Next</a>
      </div>
    </div>
  )
}
