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

export async function adminExpelParticipant(formData: FormData) {
  const supabase = await requireAdmin()
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id) || id < 1) return

  const { error } = await supabase.from('peserta').update({
    status_tes: 'dihentikan_pelanggaran',
    submitted_at: new Date().toISOString(),
    admin_reviewed: true,
    admin_review_action: 'expel',
    admin_reviewed_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) throw new Error(`Gagal mengeluarkan peserta: ${error.message}`)
  // record admin action audit
  try {
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('admin_actions').insert({ peserta_id: id, admin_user_id: userData?.user?.id || null, action: 'expel', reason: String(formData.get('reason') || '') })
  } catch (err) {
    console.error('Failed to write admin action audit', err)
  }
  revalidatePath('/admin')
}

export async function adminAllowParticipant(formData: FormData) {
  const supabase = await requireAdmin()
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id) || id < 1) return

  const { data, error: selErr } = await supabase.from('peserta').select('progress_revision').eq('id', id).limit(1).single()
  if (selErr) throw new Error('Peserta tidak ditemukan')
  const bump = (Number(data?.progress_revision || 0) + 1000)

  const { error } = await supabase.from('peserta').update({
    admin_reviewed: true,
    admin_review_action: 'allow',
    admin_reviewed_at: new Date().toISOString(),
    progress_revision: bump,
    status_tes: 'sedang',
    last_activity_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) throw new Error(`Gagal mengizinkan peserta: ${error.message}`)
  // record admin action audit
  try {
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('admin_actions').insert({ peserta_id: id, admin_user_id: userData?.user?.id || null, action: 'allow', reason: String(formData.get('reason') || '') })
  } catch (err) {
    console.error('Failed to write admin action audit', err)
  }
  revalidatePath('/admin')
}

export async function forceAdvanceParticipant(formData: FormData) {
  const supabase = await requireAdmin()

  const id = Number(formData.get('id'))
  const action = String(formData.get('action') || 'next')
  if (!Number.isInteger(id) || id < 1) return

  const { data, error } = await supabase.from('peserta').select('id,current_section,current_question,progress_revision').eq('id', id).limit(1).single()
  if (error || !data) throw new Error('Peserta tidak ditemukan')

  const section = String(data.current_section || 'listening')
  const q = Number(data.current_question || 1)
  let newSection = section
  let newQuestion = q

  // compute next position: advance question, or if at end, move to next section
  const sectionMax: Record<string, number> = { listening: 50, structure: 40, reading: 50 }
  if (action === 'next') {
    if (q < (sectionMax[section] || 50)) {
      newQuestion = q + 1
    } else {
      if (section === 'listening') {
        newSection = 'structure'
        newQuestion = 1
      } else if (section === 'structure') {
        newSection = 'reading'
        newQuestion = 1
      } else {
        // already at end; mark submitted
        await supabase.from('peserta').update({ status_tes: 'selesai', submitted_at: new Date().toISOString() }).eq('id', id)
        revalidatePath('/admin')
        return
      }
    }
  } else if (action === 'section') {
    const target = String(formData.get('target') || '')
    if (['listening', 'structure', 'reading'].includes(target)) {
      newSection = target
      newQuestion = 1
    }
  }

  // bump progress_revision to ensure client accepts server override
  const bump = (Number(data.progress_revision || 0) + 1000)

  const { error: updateError } = await supabase.from('peserta').update({
    current_section: newSection,
    current_question: newQuestion,
    progress_revision: bump,
    last_activity_at: new Date().toISOString(),
    status_tes: 'sedang'
  }).eq('id', id)

  if (updateError) throw new Error(`Gagal memaksa peserta lanjut: ${updateError.message}`)
  // record admin action audit
  try {
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('admin_actions').insert({ peserta_id: id, admin_user_id: userData?.user?.id || null, action: action === 'next' ? 'force_advance' : `force_${action}`, meta: { from: { section, question: q }, to: { section: newSection, question: newQuestion } } })
  } catch (err) {
    console.error('Failed to write admin action audit', err)
  }
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
