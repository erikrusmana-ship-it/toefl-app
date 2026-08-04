'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Contoh data struktur 50 soal Listening
const SOAL_LISTENING = Array.from({ length: 50 }, (_, i) => {
  const nomor = i + 1
  let part = 'Part A: Short Conversation'
  if (nomor >= 31 && nomor <= 37) part = 'Part B: Longer Conversation'
  if (nomor >= 38) part = 'Part C: Monologue'

  return {
    id: nomor,
    part: part,
    audioUrl: `/audio/listening/no-${nomor}.mp3`, // Lokasi file audio
    pilihan: ['(A) Option A text', '(B) Option B text', '(C) Option C text', '(D) Option D text'],
  }
})

export default function HomePage() {
  // State Biodata
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [pesertaId, setPesertaId] = useState<number | null>(null)

  // State Navigasi
  const [step, setStep] = useState<'biodata' | 'listening' | 'selesai'>('biodata')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [jawaban, setJawaban] = useState<{ [key: number]: string }>({})
  const [loading, setLoading] = useState(false)

  // 1. Simpan Biodata dan Lanjut ke Listening
  const handleStartTest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from('peserta')
      .insert([{ nama, email }])
      .select()
      .single()

    setLoading(false)

    if (error) {
      alert('Gagal menyimpan biodata: ' + error.message)
    } else {
      setPesertaId(data.id)
      setStep('listening') // Pindah langsung ke Listening Comprehension
    }
  }

  // 2. Simpan Pilihan Jawaban
  const handleSelectOption = (nomorSoal: number, opsi: string) => {
    setJawaban((prev) => ({ ...prev, [nomorSoal]: opsi }))
  }

  // 3. Kirim Semua Jawaban ke Supabase
  const handleSubmitAllAnswers = async () => {
    setLoading(true)
    const { error } = await supabase.from('jawaban_peserta').insert(
      Object.keys(jawaban).map((no) => ({
        peserta_id: pesertaId,
        nomor_soal: Number(no),
        jawaban: jawaban[Number(no)],
      }))
    )
    setLoading(false)

    if (error) {
      alert('Gagal mengirim jawaban: ' + error.message)
    } else {
      setStep('selesai')
    }
  }

  const currentSoal = SOAL_LISTENING[currentIndex]

  // ================= TAMPILAN 1: BIODATA =================
  if (step === 'biodata') {
    return (
      <main style={{ padding: '40px 20px', maxWidth: '450px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Biodata Peserta TOEFL</h2>
        <form onSubmit={handleStartTest} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ fontWeight: 'bold' }}>Nama Lengkap:</label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>
          <div>
            <label style={{ fontWeight: 'bold' }}>Email / NIM:</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '12px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'Menyimpan...' : 'Mulai Section 1: Listening'}
          </button>
        </form>
      </main>
    )
  }

  // ================= TAMPILAN 2: LISTENING COMPREHENSION =================
  if (step === 'listening') {
    return (
      <main style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        {/* Header Section */}
        <div style={{ borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Section 1: Listening Comprehension</h2>
          <p style={{ color: '#0070f3', fontWeight: 'bold', margin: '5px 0 0 0' }}>{currentSoal.part}</p>
        </div>

        {/* Audio Player */}
        <div style={{ backgroundColor: '#f7f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>Dengarkan audio berikut:</p>
          <audio key={currentSoal.id} controls style={{ width: '100%' }}>
            <source src={currentSoal.audioUrl} type="audio/mpeg" />
            Browser Anda tidak mendukung pemutar audio.
          </audio>
        </div>

        {/* Soal & Pilihan Jawaban */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '15px' }}>Soal No. {currentSoal.id} dari 50</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentSoal.pilihan.map((opsi, index) => {
              const char = String.fromCharCode(65 + index) // A, B, C, D
              const isSelected = jawaban[currentSoal.id] === char
              return (
                <button
                  key={index}
                  onClick={() => handleSelectOption(currentSoal.id, char)}
                  style={{
                    padding: '12px 15px',
                    textAlign: 'left',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #0070f3' : '1px solid #ccc',
                    backgroundColor: isSelected ? '#e6f0ff' : '#fff',
                    cursor: 'pointer',
                    fontWeight: isSelected ? 'bold' : 'normal',
                  }}
                >
                  {opsi}
                </button>
              )
            })}
          </div>
        </div>

        {/* Navigasi Soal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #ccc', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer' }}
          >
            Sebelumnya
          </button>

          {currentIndex < 49 ? (
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(49, prev + 1))}
              style={{ padding: '10px 20px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Selanjutnya
            </button>
          ) : (
            <button
              onClick={handleSubmitAllAnswers}
              disabled={loading}
              style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {loading ? 'Mengirim...' : 'Selesai & Kirim Jawaban'}
            </button>
          )}
        </div>
      </main>
    )
  }

  // ================= TAMPILAN 3: SELESAI =================
  return (
    <main style={{ padding: '50px 20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Tes Listening Selesai!</h1>
      <p>Jawaban Anda telah berhasil disimpan ke database.</p>
    </main>
  )
}