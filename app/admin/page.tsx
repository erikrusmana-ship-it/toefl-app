'use client'
/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CONVERSION_LISTENING = [31, 31, 31, 31, 31, 31, 31, 31, 32, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 51, 52, 52, 53, 54, 54, 55, 56, 57, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 68]
const CONVERSION_STRUCTURE = [31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 33, 35, 37, 38, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 60, 61, 63, 65, 66, 67, 68, 68]
const CONVERSION_READING = [31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 67, 67]

type Step = 'biodata' | 'listening' | 'structure' | 'reading' | 'selesai'
type Jawaban = Record<number, string>

interface SoalItem {
  id: number
  section: string
  nomor_soal: number
  part?: string
  audio_url?: string
  passage_title?: string
  passage_text?: string
  pertanyaan?: string
  pilihan_a: string
  pilihan_b: string
  pilihan_c: string
  pilihan_d: string
  kunci_jawaban: string
}

interface ScoreResult {
  rawL: number
  scaledL: number
  rawS: number
  scaledS: number
  rawR: number
  scaledR: number
  totalScore: number
  cefr: string
}

function HeaderTimer({ durationSeconds, onTimeUp }: { durationSeconds: number; onTimeUp: () => void }) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds)
  const onTimeUpRef = useRef(onTimeUp)

  useEffect(() => {
    onTimeUpRef.current = onTimeUp
  }, [onTimeUp])

  useEffect(() => {
    setTimeLeft(durationSeconds)
  }, [durationSeconds])

  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer)
          onTimeUpRef.current()
          return 0
        }
        return previous - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [timeLeft])

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const seconds = (timeLeft % 60).toString().padStart(2, '0')

  return <strong style={{ color: '#7c3aed', fontSize: 18 }}>{minutes}:{seconds}</strong>
}

// Mengambil satu soal per nomor soal dan membatasi jumlah soal per section.
// Data bank soal di Supabase tetap utuh; yang ditampilkan ke peserta saja dibatasi.
function ambilSoalUntukTes(data: SoalItem[], section: string, jumlahMaksimal: number) {
  const terurut = data
    .filter((soal) => soal.section?.trim().toLowerCase() === section)
    .sort((a, b) => a.nomor_soal - b.nomor_soal || a.id - b.id)

  const unik = new Map<number, SoalItem>()
  for (const soal of terurut) {
    if (!unik.has(soal.nomor_soal)) unik.set(soal.nomor_soal, soal)
  }

  return [...unik.values()].slice(0, jumlahMaksimal)
}

export default function HomePage() {
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [pesertaId, setPesertaId] = useState<number | null>(null)
  const [step, setStep] = useState<Step>('biodata')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isFetchingSoal, setIsFetchingSoal] = useState(true)

  const [soalListening, setSoalListening] = useState<SoalItem[]>([])
  const [soalStructure, setSoalStructure] = useState<SoalItem[]>([])
  const [soalReading, setSoalReading] = useState<SoalItem[]>([])

  // Jawaban dikunci memakai ID soal agar nomor soal duplikat tidak mengacaukan state.
  const [jawabanListening, setJawabanListening] = useState<Jawaban>({})
  const [jawabanStructure, setJawabanStructure] = useState<Jawaban>({})
  const [jawabanReading, setJawabanReading] = useState<Jawaban>({})
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const submitLock = useRef(false)

  useEffect(() => {
    const loadSoal = async () => {
      setIsFetchingSoal(true)

      const { data, error } = await supabase
        .from('soal')
        .select('*')
        .order('id', { ascending: true })

      if (error) {
        console.error('Gagal mengambil bank soal:', error.message)
        alert(`Gagal mengambil bank soal: ${error.message}`)
        setIsFetchingSoal(false)
        return
      }

      const daftarSoal = (data || []) as SoalItem[]
      setSoalListening(ambilSoalUntukTes(daftarSoal, 'listening', 50))
      setSoalStructure(ambilSoalUntukTes(daftarSoal, 'structure', 40))
      setSoalReading(ambilSoalUntukTes(daftarSoal, 'reading', 50))
      setIsFetchingSoal(false)
    }

    loadSoal()
  }, [])

  const simpanJawaban = (setJawaban: Dispatch<SetStateAction<Jawaban>>, idSoal: number, jawaban: string) => {
    setJawaban((previous) => ({ ...previous, [idSoal]: jawaban }))
  }

  const mulaiTes = async (event: FormEvent) => {
    event.preventDefault()

    if (soalListening.length === 0 || soalStructure.length === 0 || soalReading.length === 0) {
      alert('Soal belum lengkap. Pastikan section pada Supabase bernama listening, structure, dan reading.')
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('peserta')
      .insert([{ nama, email }])
      .select()
      .single()
    setLoading(false)

    if (error) {
      alert(`Gagal menyimpan biodata: ${error.message}`)
      return
    }

    setPesertaId(data.id)
    setCurrentIndex(0)
    setStep('listening')
  }

  const finishListening = useCallback(() => {
    setCurrentIndex(0)
    setStep('structure')
  }, [])

  const finishStructure = useCallback(() => {
    setCurrentIndex(0)
    setStep('reading')
  }, [])

  const calculateScores = useCallback((): ScoreResult => {
    const rawL = soalListening.filter((soal) => jawabanListening[soal.id] === soal.kunci_jawaban).length
    const rawS = soalStructure.filter((soal) => jawabanStructure[soal.id] === soal.kunci_jawaban).length
    const rawR = soalReading.filter((soal) => jawabanReading[soal.id] === soal.kunci_jawaban).length

    const scaledL = CONVERSION_LISTENING[rawL] ?? 31
    const scaledS = CONVERSION_STRUCTURE[rawS] ?? 31
    const scaledR = CONVERSION_READING[rawR] ?? 31
    const totalScore = Math.round(((scaledL + scaledS + scaledR) * 10) / 3)

    let cefr = 'A2 (Elementary)'
    if (totalScore >= 627) cefr = 'C1 (Advanced)'
    else if (totalScore >= 543) cefr = 'B2 (Upper-Intermediate)'
    else if (totalScore >= 460) cefr = 'B1 (Intermediate)'

    return { rawL, scaledL, rawS, scaledS, rawR, scaledR, totalScore, cefr }
  }, [soalListening, soalStructure, soalReading, jawabanListening, jawabanStructure, jawabanReading])

  const submitTes = useCallback(async () => {
    if (!pesertaId || submitLock.current) return
    submitLock.current = true
    setLoading(true)

    const scores = calculateScores()
    const semuaSoal = [...soalListening, ...soalStructure, ...soalReading]
    const semuaJawaban = { ...jawabanListening, ...jawabanStructure, ...jawabanReading }
    const payload = semuaSoal
      .filter((soal) => semuaJawaban[soal.id])
      .map((soal) => ({
        peserta_id: pesertaId,
        section: soal.section.trim().toLowerCase(),
        nomor_soal: soal.nomor_soal,
        jawaban: semuaJawaban[soal.id],
      }))

    const { error: jawabanError } = await supabase.from('jawaban_peserta').insert(payload)
    const { error: pesertaError } = await supabase
      .from('peserta')
      .update({ skor_akhir: scores.totalScore, cefr_level: scores.cefr })
      .eq('id', pesertaId)

    if (jawabanError || pesertaError) {
      alert(`Gagal menyimpan hasil: ${jawabanError?.message || pesertaError?.message}`)
      submitLock.current = false
      setLoading(false)
      return
    }

    setScoreResult(scores)
    setLoading(false)
    setStep('selesai')
  }, [pesertaId, calculateScores, soalListening, soalStructure, soalReading, jawabanListening, jawabanStructure, jawabanReading])

  if (step === 'biodata') {
    return (
      <main style={halamanTengah}>
        <div style={card}>
          <img src="/logo-unpas.png" alt="Logo UNPAS" style={{ display: 'block', width: 120, margin: '0 auto 16px' }} />
          <h2 style={{ marginTop: 0, color: '#4c1d95', textAlign: 'center' }}>Form Peserta Tes TOEFL</h2>

          {isFetchingSoal ? <p style={{ textAlign: 'center' }}>Memuat bank soal...</p> : (
            <form onSubmit={mulaiTes} style={formStyle}>
              <input required value={nama} onChange={(event) => setNama(event.target.value)} placeholder="Nama Lengkap" style={input} />
              <input required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="NPM / Email" style={input} />
              <button type="submit" disabled={loading} style={tombolUngu(loading)}>
                {loading ? 'Menyimpan...' : 'Mulai Tes TOEFL'}
              </button>
            </form>
          )}
        </div>
      </main>
    )
  }

  if (step === 'selesai') {
    return (
      <main style={halamanTengah}>
        <div style={card}>
          <h2 style={{ color: '#4c1d95', textAlign: 'center' }}>Hasil Skor TOEFL ITP</h2>
          <p style={{ textAlign: 'center' }}>Peserta: <strong>{nama}</strong> ({email})</p>
          {scoreResult && (
            <>
              <div style={{ ...box, textAlign: 'center' }}>
                <p style={{ margin: 0 }}>Total TOEFL Score</p>
                <strong style={{ color: '#581c87', fontSize: 48 }}>{scoreResult.totalScore}</strong>
                <p>CEFR: {scoreResult.cefr}</p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead><tr><th>Section</th><th>Benar</th><th>Converted</th></tr></thead>
                <tbody>
                  <tr><td>Listening</td><td>{scoreResult.rawL} / {soalListening.length}</td><td>{scoreResult.scaledL}</td></tr>
                  <tr><td>Structure</td><td>{scoreResult.rawS} / {soalStructure.length}</td><td>{scoreResult.scaledS}</td></tr>
                  <tr><td>Reading</td><td>{scoreResult.rawR} / {soalReading.length}</td><td>{scoreResult.scaledR}</td></tr>
                </tbody>
              </table>
            </>
          )}
        </div>
      </main>
    )
  }

  const soalAktif = step === 'listening' ? soalListening : step === 'structure' ? soalStructure : soalReading
  const jawabanAktif = step === 'listening' ? jawabanListening : step === 'structure' ? jawabanStructure : jawabanReading
  const cur = soalAktif[currentIndex]

  // Pengaman apabila database tidak memberikan soal pada section yang aktif.
  if (!cur) return <main style={halamanTengah}><p>Soal untuk section ini tidak ditemukan.</p></main>

  const isReading = step === 'reading'
  const title = step === 'listening' ? 'Section 1: Listening' : step === 'structure' ? 'Section 2: Structure' : 'Section 3: Reading'
  const subtitle = isReading ? (cur.passage_title || 'Reading Comprehension') : (cur.part || (step === 'listening' ? 'Listening Comprehension' : 'Structure & Written Expression'))
  const duration = step === 'listening' ? 40 * 60 : step === 'structure' ? 25 * 60 : 55 * 60
  const onTimeUp = step === 'listening' ? finishListening : step === 'structure' ? finishStructure : submitTes
  const sudahMenjawab = Boolean(jawabanAktif[cur.id])
  const soalTerakhir = currentIndex === soalAktif.length - 1

  const pilih = (jawaban: string) => {
    if (step === 'listening') simpanJawaban(setJawabanListening, cur.id, jawaban)
    else if (step === 'structure') simpanJawaban(setJawabanStructure, cur.id, jawaban)
    else simpanJawaban(setJawabanReading, cur.id, jawaban)
  }

  const next = () => {
    if (!soalTerakhir) {
      setCurrentIndex((previous) => previous + 1)
      return
    }
    if (step === 'listening') finishListening()
    else if (step === 'structure') finishStructure()
    else submitTes()
  }

  const pilihan = [
    { key: 'A', text: cur.pilihan_a },
    { key: 'B', text: cur.pilihan_b },
    { key: 'C', text: cur.pilihan_c },
    { key: 'D', text: cur.pilihan_d },
  ]

  return (
    <main style={{ ...halamanSoal, maxWidth: isReading ? 900 : 700 }}>
      <Header title={title} subtitle={subtitle} timer={<HeaderTimer durationSeconds={duration} onTimeUp={onTimeUp} />} />

      {step === 'listening' && (
        <audio
          key={cur.id}
          controls
          autoPlay
          src={cur.audio_url || `/audio/listening/no-${cur.nomor_soal}.mp3`}
          style={{ width: '100%', marginBottom: 20 }}
        />
      )}

      <div style={isReading ? readingGrid : undefined}>
        {isReading && <div style={box}><h4>{cur.passage_title}</h4><p style={{ lineHeight: 1.6, textAlign: 'justify' }}>{cur.passage_text}</p></div>}
        <div>
          <div style={!isReading && step === 'structure' ? box : undefined}>
            <h4 style={{ marginTop: 0 }}>Soal {currentIndex + 1} dari {soalAktif.length}</h4>
            {cur.pertanyaan && <p>{cur.pertanyaan}</p>}
          </div>

          <div style={pilihanContainer}>
            {pilihan.map((opsi) => (
              <button key={opsi.key} type="button" onClick={() => pilih(opsi.key)} style={pilihanStyle(jawabanAktif[cur.id] === opsi.key)}>
                ({opsi.key}) {opsi.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={navigasi}>
        <button type="button" onClick={() => setCurrentIndex((previous) => Math.max(0, previous - 1))} disabled={currentIndex === 0} style={tombolAbu(currentIndex === 0)}>
          Sebelumnya
        </button>
        <button type="button" onClick={next} disabled={!sudahMenjawab || loading} style={tombolUngu(!sudahMenjawab || loading)}>
          {loading ? 'Menyimpan...' : soalTerakhir ? (step === 'reading' ? 'Selesaikan Tes' : step === 'listening' ? 'Lanjut ke Structure' : 'Lanjut ke Reading') : 'Selanjutnya'}
        </button>
      </div>
    </main>
  )
}

function Header({ title, subtitle, timer }: { title: string; subtitle: string; timer: ReactNode }) {
  return <div style={header}><div><h3 style={{ margin: 0, color: '#4c1d95' }}>{title}</h3><span>{subtitle}</span></div>{timer}</div>
}

const halamanTengah: CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#f5f3ff', fontFamily: 'system-ui, sans-serif' }
const halamanSoal: CSSProperties = { margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif' }
const card: CSSProperties = { width: '100%', maxWidth: 520, padding: 32, borderRadius: 16, borderTop: '6px solid #7c3aed', backgroundColor: '#fff', boxShadow: '0 10px 25px -5px rgba(124,58,237,.15)' }
const formStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 15 }
const input: CSSProperties = { padding: 12, border: '1px solid #ddd6fe', borderRadius: 8 }
const header: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 20, paddingBottom: 10, borderBottom: '2px solid #f3e8ff' }
const box: CSSProperties = { marginBottom: 20, padding: 15, borderRadius: 8, backgroundColor: '#faf5ff' }
const readingGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }
const pilihanContainer: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, margin: '20px 0' }
const navigasi: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10 }
const pilihanStyle = (aktif: boolean): CSSProperties => ({ padding: 12, textAlign: 'left', borderRadius: 8, border: aktif ? '2px solid #7c3aed' : '1px solid #ddd6fe', backgroundColor: aktif ? '#f3e8ff' : '#fff', cursor: 'pointer' })
const tombolUngu = (disabled: boolean): CSSProperties => ({ padding: '10px 20px', border: 'none', borderRadius: 6, backgroundColor: '#7c3aed', color: '#fff', fontWeight: 'bold', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1 })
const tombolAbu = (disabled: boolean): CSSProperties => ({ padding: '10px 20px', border: 'none', borderRadius: 6, backgroundColor: '#e5e7eb', color: '#111827', fontWeight: 'bold', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1 })
