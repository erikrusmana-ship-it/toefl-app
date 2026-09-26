import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Admin - Client Logs',
}

type ClientLogRow = {
  id: string | number
  created_at: string
  level: string
  message: string | null
  href: string | null
  stack: string | null
  meta: unknown
}

type LogsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function LogsPage({ searchParams }: LogsPageProps) {
  // require admin
  const client = await createClient()
  const { data: claimsData } = await client.auth.getClaims()
  const claims = claimsData?.claims as { app_metadata?: { role?: string } } | undefined
  if (claims?.app_metadata?.role !== 'admin') redirect('/admin/login')

  const params = (await searchParams) || {}
  const page = Math.max(1, Number(firstParam(params.page) || '1'))
  const pageSize = Math.min(200, Math.max(10, Number(firstParam(params.pageSize) || '50')))
  const level = firstParam(params.level) || undefined
  const q = firstParam(params.q) || undefined

  const supabase = createSupabaseAdminClient()

  let builder = supabase.from('client_logs').select('id, level, message, href, stack, meta, created_at', { count: 'exact' })
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
  // CSV export is handled by a separate route handler to avoid returning
  // Response objects from the page component (which breaks App Router typing).
  const exportBase = '/admin/logs/export'

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
          <a href={`${exportBase}?${new URLSearchParams({ ...(q ? { q } : {}), ...(level ? { level } : {}), page: String(page), pageSize: String(pageSize) })}`} className="ml-2 underline">Export page CSV</a>
          <a href={`${exportBase}?${new URLSearchParams({ ...(q ? { q } : {}), ...(level ? { level } : {}), exportAll: '1' })}`} className="ml-2 underline">Export all CSV</a>
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
            {(data as ClientLogRow[] | null)?.map((row) => (
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
