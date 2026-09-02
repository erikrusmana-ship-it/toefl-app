import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Admin - Client Logs',
}

export default async function LogsPage() {
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('client_logs')
    .select('id, level, message, href, stack, meta, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Client Logs</h1>
        <p className="mt-4 text-red-600">Failed to load logs: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Client Logs</h1>
      <p className="text-sm text-muted-foreground">Showing up to 200 recent logs</p>

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
    </div>
  )
}
