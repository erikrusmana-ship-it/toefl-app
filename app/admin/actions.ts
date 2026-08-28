'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { retryPendingResultEmails as retryPendingResultEmailBatch } from '@/lib/pending-result-emails'

export type RetryEmailState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

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

export async function retryPendingResultEmails(
  previousState: RetryEmailState,
): Promise<RetryEmailState> {
  void previousState
  await requireAdmin()

  try {
    const result = await retryPendingResultEmailBatch(10)
    revalidatePath('/admin')

    if (result.selected === 0) {
      return { status: 'success', message: 'Tidak ada email hasil tertunda.' }
    }

    return {
      status: result.failed > 0 ? 'error' : 'success',
      message: `${result.sent} email terkirim, ${result.failed} gagal, dan ${result.skipped} dilewati.`,
    }
  } catch (error) {
    console.error('Pending result email retry failed:', error)
    return { status: 'error', message: 'Pengiriman ulang gagal. Periksa konfigurasi email dan log server.' }
  }
}
