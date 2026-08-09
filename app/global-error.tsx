'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global application error:', error)
  }, [error])

  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f3ff', color: '#1f2937' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
          <section style={{ width: '100%', maxWidth: 520, padding: 32, borderRadius: 20, background: '#fff', textAlign: 'center', boxShadow: '0 20px 45px rgba(76,29,149,.16)' }}>
            <h1 style={{ color: '#4c1d95' }}>Aplikasi sementara terganggu</h1>
            <p style={{ lineHeight: 1.7 }}>Silakan periksa koneksi dan coba kembali. Jika sedang mengerjakan tes, sesi terakhir akan dipulihkan.</p>
            {error.digest && <p style={{ color: '#6b7280', fontSize: 12 }}>Kode insiden: {error.digest}</p>}
            <button type="button" onClick={reset} style={{ marginTop: 16, padding: '12px 22px', border: 0, borderRadius: 10, background: '#6d28d9', color: '#fff', fontWeight: 700 }}>Coba Lagi</button>
          </section>
        </main>
      </body>
    </html>
  )
}

