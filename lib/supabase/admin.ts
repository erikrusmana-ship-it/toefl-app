import { createClient } from '@supabase/supabase-js'

export function createSupabaseAdminClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL belum dikonfigurasi.')
  }

  if (!secretKey) {
    throw new Error(
      'SUPABASE_SECRET_KEY atau SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.'
    )
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}