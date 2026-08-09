'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims as { app_metadata?: { role?: string } } | undefined
  if (claims?.app_metadata?.role !== 'admin') redirect('/admin/login')
  return supabase
}

export async function logoutAdmin() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

export async function toggleAccessCode(formData: FormData) {
  const supabase = await requireAdmin()
  const id = Number(formData.get('id'))
  const nextState = formData.get('nextState') === 'true'
  if (!Number.isInteger(id) || id < 1) return

  const { error } = await supabase.from('test_access_codes').update({ is_active: nextState }).eq('id', id)
  if (error) throw new Error(`Gagal mengubah kode akses: ${error.message}`)
  revalidatePath('/admin')
}
