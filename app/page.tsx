'use client'
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CONVERSION_LISTENING = [31, 31, 31, 31, 31, 31, 31, 31, 32, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 51, 52, 52, 53, 54, 54, 55, 56, 57, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 68]
const CONVERSION_STRUCTURE = [31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 33, 35, 37, 38, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 60, 61, 63, 65, 66, 67, 68, 68]
const CONVERSION_READING = [31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 67, 67]

type Step = 'biodata' | 'listening' | 'structure' | 'reading' | 'selesai'
type Answers = Record<number, string>

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
  rawL: number; scaledL: number
  rawS: number; scaledS: number
  rawR: number; scaledR: number
  totalScore: number; cefr: string
}

function Timer({ seconds, onTimeUp }: { seconds: number; onTimeUp: () => void }) {
  const [left, setLeft] = useState(seconds)
  const callbackRef = useRef(onTimeUp)

  useEffect(() => { callbackRef.current = onTimeUp }, [onTimeUp])
  useEffect(() => { setLeft(seconds) }, [seconds])

  useEffect(() => {
    if (left <= 0) return
    const id = window.setInterval(() => {
      setLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(id)
          callbackRef.current()
          return 0
        }
        return previous - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [left])

  return (
    <strong style={{ color: '#7c3aed', fontSize: 18 }}>
      {Math.floor(left / 60).toString().padStart(2, '0')}:{(left % 60).toString().padStart(2, '0')}
    </strong>
  )
}

function WrittenExpressionQuestion({ text, options }: { text: string; options: Array<[string, string]> }) {
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const matches: Array<{ start: number; end: number; label: string }> = []

  for (const [label, option] of options) {
    const phrase = option.trim()
    if (!phrase) continue

    const expression = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi')
    let found: RegExpExecArray | null

    while ((found = expression.exec(text)) !== null) {
      matches.push({ start: found.index, end: found.index + found[0].length, label })
    }
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end)

  const result: ReactNode[] = []
  let cursor = 0

  for (const match of matches) {
    if (match.start < cursor) continue

    if (match.start > cursor) result.push(text.slice(cursor, match.start))
    result.push(
      <span key={`${match.start}-${match.label}`} style={{ textDecoration: 'underline', textDecorationThickness: '2px', textUnderlineOffset: '3px', fontWeight: 600 }}>
        {text.slice(match.start, match.end)}<sup style={{ marginLeft: 2, color: '#7c3aed', textDecoration: 'none' }}>{match.label}</sup>
      </span>
    )
    cursor = match.end
  }

  if (cursor < text.length) result.push(text.slice(cursor))
  return <p style={{ lineHeight: 1.9, marginBottom: 0 }}>{result}</p>
}

// Section pada database boleh berupa "Listening", "Listening Comprehension",
// "Structure & Written Expression", atau "Reading Comprehension".
function pilihSoalTes(data: SoalItem[], kataKunci: string, maksimum: number): SoalItem[] {
  const kandidat = data
    .filter((soal) => soal.section?.trim().toLowerCase().includes(kataKunci))
    .sort((a, b) => a.nomor_soal - b.nomor_soal || a.id - b.id)

  // Abaikan soal dengan konten yang sama persis. Ini mencegah data impor yang
  // berulang (misalnya audio no-1.mp3 dipakai lagi pada nomor 11, 21, dst.).
  const unik = new Map<string, SoalItem>()
  for (const soal of kandidat) {
    const identitasSoal = [
      soal.audio_url,
      soal.passage_title,
      soal.passage_text,
      soal.pertanyaan,
      soal.pilihan_a,
      soal.pilihan_b,
      soal.pilihan_c,
      soal.pilihan_d,
      soal.kunci_jawaban,
    ].map((nilai) => nilai || '').join('|')

    if (!unik.has(identitasSoal)) unik.set(identitasSoal, soal)
  }

  return Array.from(unik.values()).slice(0, maksimum)
}

export default function HomePage() {
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [pesertaId, setPesertaId] = useState<number | null>(null)
  const [step, setStep] = useState<Step>('biodata')
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  const [listening, setListening] = useState<SoalItem[]>([])
  const [structure, setStructure] = useState<SoalItem[]>([])
  const [reading, setReading] = useState<SoalItem[]>([])
  const [answersListening, setAnswersListening] = useState<Answers>({})
  const [answersStructure, setAnswersStructure] = useState<Answers>({})
  const [answersReading, setAnswersReading] = useState<Answers>({})
  const [score, setScore] = useState<ScoreResult | null>(null)
  const submitting = useRef(false)
  const readingBelumTersedia = reading.length === 0

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('soal').select('*').order('id', { ascending: true })
      if (error) {
        alert(`Gagal mengambil bank soal: ${error.message}`)
      } else {
        const all = (data || []) as SoalItem[]
        setListening(pilihSoalTes(all, 'listen', 50))
        setStructure(pilihSoalTes(all, 'struct', 40))
        setReading(pilihSoalTes(all, 'read', 50))
      }
      setIsFetching(false)
    }
    load()
  }, [])

  const start = async (event: FormEvent) => {
    event.preventDefault()
    if (!listening.length || !structure.length) {
      alert('Soal Listening atau Structure belum tersedia. Cek kolom section pada tabel soal.')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.from('peserta').insert([{ nama, email }]).select().single()
    setLoading(false)
    if (error) return alert(`Gagal menyimpan biodata: ${error.message}`)

    setPesertaId(data.id)
    setIndex(0)
    setStep('listening')
  }

  const nextSectionListening = useCallback(() => { setIndex(0); setStep('structure') }, [])
  const nextSectionStructure = useCallback(() => { setIndex(0); setStep('reading') }, [])

  const hitungSkor = useCallback((): ScoreResult => {
    const rawL = listening.filter((s) => answersListening[s.id] === s.kunci_jawaban).length
    const rawS = structure.filter((s) => answersStructure[s.id] === s.kunci_jawaban).length
    const rawR = reading.filter((s) => answersReading[s.id] === s.kunci_jawaban).length
    const scaledL = CONVERSION_LISTENING[rawL] ?? 31
    const scaledS = CONVERSION_STRUCTURE[rawS] ?? 31
    const scaledR = CONVERSION_READING[rawR] ?? 31
    const totalScore = Math.round(((scaledL + scaledS + scaledR) * 10) / 3)
    const cefr = totalScore >= 627 ? 'C1 (Advanced)' : totalScore >= 543 ? 'B2 (Upper-Intermediate)' : totalScore >= 460 ? 'B1 (Intermediate)' : 'A2 (Elementary)'
    return { rawL, scaledL, rawS, scaledS, rawR, scaledR, totalScore, cefr }
  }, [listening, structure, reading, answersListening, answersStructure, answersReading])

  const submit = useCallback(async () => {
    if (!pesertaId || submitting.current) return
    submitting.current = true
    setLoading(true)
    const result = hitungSkor()
    const allQuestions = [...listening, ...structure, ...reading]
    const allAnswers = { ...answersListening, ...answersStructure, ...answersReading }
    const payload = allQuestions
      .filter((s) => allAnswers[s.id])
      .map((s) => ({ peserta_id: pesertaId, section: s.section, nomor_soal: s.nomor_soal, jawaban: allAnswers[s.id] }))

    const { error: answerError } = await supabase.from('jawaban_peserta').insert(payload)
    const { error: participantError } = await supabase
      .from('peserta')
      .update({ skor_akhir: result.totalScore, cefr_level: result.cefr })
      .eq('id', pesertaId)

    if (answerError || participantError) {
      alert(`Gagal menyimpan hasil: ${answerError?.message || participantError?.message}`)
      submitting.current = false
      setLoading(false)
      return
    }

    setScore(result)
    setLoading(false)
    setStep('selesai')
  }, [pesertaId, hitungSkor, listening, structure, reading, answersListening, answersStructure, answersReading])

  if (step === 'biodata') {
    return (
      <main style={centerPage}>
        <div style={card}>
          <img src="/logo-unpas.png" alt="Logo UNPAS" style={{ display: 'block', width: 120, margin: '0 auto 16px' }} />
          <h2 style={{ color: '#4c1d95', textAlign: 'center' }}>Form Peserta Tes TOEFL</h2>
          {isFetching ? <p style={{ textAlign: 'center' }}>Memuat bank soal...</p> : (
            <form onSubmit={start} style={form}>
              <input required value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama Lengkap" style={input} />
              <input required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="NPM / Email" style={input} />
              <button type="submit" disabled={loading} style={purpleButton(loading)}>{loading ? 'Menyimpan...' : 'Mulai Tes TOEFL'}</button>
            </form>
          )}
        </div>
      </main>
    )
  }

  if (step === 'selesai') {
    return (
      <main style={centerPage}>
        <div style={card}>
          <h2 style={{ color: '#4c1d95', textAlign: 'center' }}>Hasil Skor TOEFL ITP</h2>
          <p style={{ textAlign: 'center' }}>Peserta: <strong>{nama}</strong> ({email})</p>
          {readingBelumTersedia && (
            <div style={{ ...box, color: '#92400e', background: '#fffbeb', textAlign: 'center' }}>
              Mode uji coba selesai. Section Reading belum diunggah, sehingga skor TOEFL belum ditampilkan.
            </div>
          )}
          {score && !readingBelumTersedia && <>
            <div style={{ ...box, textAlign: 'center' }}><p>Total TOEFL Score</p><strong style={{ fontSize: 48, color: '#581c87' }}>{score.totalScore}</strong><p>CEFR: {score.cefr}</p></div>
            <table style={{ width: '100%', textAlign: 'center' }}><thead><tr><th>Section</th><th>Benar</th><th>Converted</th></tr></thead><tbody>
              <tr><td>Listening</td><td>{score.rawL} / {listening.length}</td><td>{score.scaledL}</td></tr>
              <tr><td>Structure</td><td>{score.rawS} / {structure.length}</td><td>{score.scaledS}</td></tr>
              <tr><td>Reading</td><td>{score.rawR} / {reading.length}</td><td>{score.scaledR}</td></tr>
            </tbody></table>
          </>}
        </div>
      </main>
    )
  }

  const questions = step === 'listening' ? listening : step === 'structure' ? structure : reading
  const answers = step === 'listening' ? answersListening : step === 'structure' ? answersStructure : answersReading
  const question = questions[index]

  if (!question) return <main style={centerPage}>Soal section ini tidak ditemukan.</main>

  const isReading = step === 'reading'
  const isWrittenExpression = step === 'structure' && question.nomor_soal >= 16
  const isLast = index === questions.length - 1
  const duration = step === 'listening' ? 40 * 60 : step === 'structure' ? 25 * 60 : 55 * 60
  const timeUp = step === 'listening' ? nextSectionListening : step === 'structure' ? (readingBelumTersedia ? submit : nextSectionStructure) : submit
  const title = step === 'listening' ? 'Section 1: Listening' : step === 'structure' ? 'Section 2: Structure' : 'Section 3: Reading'
  const bagianStructure = step === 'structure'
    ? question.nomor_soal <= 15
      ? 'Structure (Questions 1–15)'
      : 'Written Expression (Questions 16–40)'
    : null
  const subtitle = isReading
    ? (question.passage_title || 'Reading Comprehension')
    : (bagianStructure || question.part || title)
  const options: Array<[string, string]> = [['A', question.pilihan_a], ['B', question.pilihan_b], ['C', question.pilihan_c], ['D', question.pilihan_d]]

  const selectAnswer = (answer: string) => {
    if (step === 'listening') setAnswersListening((old) => ({ ...old, [question.id]: answer }))
    else if (step === 'structure') setAnswersStructure((old) => ({ ...old, [question.id]: answer }))
    else setAnswersReading((old) => ({ ...old, [question.id]: answer }))
  }

  const next = () => {
    if (!isLast) return setIndex((old) => old + 1)
    if (step === 'listening') return nextSectionListening()
    if (step === 'structure') return readingBelumTersedia ? submit() : nextSectionStructure()
    submit()
  }

  return (
    <main style={{ ...testPage, maxWidth: isReading ? 900 : 700 }}>
      <div style={testBanner}>
        <img src="/logo-unpas.png" alt="Logo UNPAS" style={{ width: 56, height: 56, objectFit: 'contain', background: '#fff', borderRadius: 10, padding: 4 }} />
        <div>
          <strong style={{ display: 'block', fontSize: 16 }}>TOEFL ITP Online Test</strong>
          <span style={{ fontSize: 13, opacity: 0.9 }}>Laboratorium Prodi Sastra Inggris UNPAS</span>
        </div>
      </div>
      <div style={topBar}><div><h3 style={{ margin: 0, color: '#4c1d95' }}>{title}</h3><span>{subtitle}</span></div><Timer seconds={duration} onTimeUp={timeUp} /></div>
      {step === 'listening' && <audio key={question.id} controls autoPlay src={question.audio_url || `/audio/listening/no-${question.nomor_soal}.mp3`} style={{ width: '100%', marginBottom: 20 }} />}
      <div style={isReading ? readingLayout : undefined}>
        {isReading && <div style={box}><h4>{question.passage_title}</h4><p style={{ lineHeight: 1.6, textAlign: 'justify' }}>{question.passage_text}</p></div>}
        <div>
          {bagianStructure && (
            <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#ede9fe', color: '#5b21b6', fontWeight: 'bold' }}>
              {bagianStructure}
            </div>
          )}
          <div style={step === 'structure' ? box : undefined}>
            <h4>Soal {index + 1} dari {questions.length}</h4>
            {isWrittenExpression ? (
              <>
                <p style={{ marginBottom: 8, color: '#6b21a8', fontWeight: 600 }}>Pilih bagian bergaris bawah yang harus diperbaiki.</p>
                <WrittenExpressionQuestion text={question.pertanyaan || ''} options={options} />
              </>
            ) : <p>{question.pertanyaan}</p>}
          </div>
          <div style={optionList}>{options.map(([key, text]) => <button key={key} type="button" onClick={() => selectAnswer(key)} style={optionButton(answers[question.id] === key)}>({key}) {text}</button>)}</div>
        </div>
      </div>
      <div style={navigation}>
        <button type="button" onClick={() => setIndex((old) => Math.max(0, old - 1))} disabled={index === 0} style={grayButton(index === 0)}>Sebelumnya</button>
        <button type="button" onClick={next} disabled={!answers[question.id] || loading} style={purpleButton(!answers[question.id] || loading)}>
          {loading ? 'Menyimpan...' : isLast ? (isReading || readingBelumTersedia ? 'Selesaikan Uji Coba' : 'Lanjut Section Berikutnya') : 'Selanjutnya'}
        </button>
      </div>
    </main>
  )
}

const centerPage: CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#f5f3ff', fontFamily: 'system-ui, sans-serif' }
const testPage: CSSProperties = { margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif' }
const card: CSSProperties = { width: '100%', maxWidth: 520, padding: 32, borderRadius: 16, borderTop: '6px solid #7c3aed', background: '#fff', boxShadow: '0 10px 25px -5px rgba(124,58,237,.15)' }
const form: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 15 }
const input: CSSProperties = { padding: 12, border: '1px solid #ddd6fe', borderRadius: 8 }
const testBanner: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', color: '#fff', boxShadow: '0 8px 18px -10px rgba(76,29,149,.7)' }
const topBar: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 20, paddingBottom: 10, marginBottom: 20, borderBottom: '2px solid #f3e8ff' }
const box: CSSProperties = { padding: 15, borderRadius: 8, background: '#faf5ff', marginBottom: 20 }
const readingLayout: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }
const optionList: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, margin: '20px 0' }
const navigation: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10 }
const optionButton = (active: boolean): CSSProperties => ({ padding: 12, textAlign: 'left', borderRadius: 8, border: active ? '2px solid #7c3aed' : '1px solid #ddd6fe', background: active ? '#f3e8ff' : '#fff', cursor: 'pointer' })
const purpleButton = (disabled: boolean): CSSProperties => ({ padding: '10px 20px', border: 'none', borderRadius: 6, background: '#7c3aed', color: '#fff', fontWeight: 'bold', opacity: disabled ? .5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' })
const grayButton = (disabled: boolean): CSSProperties => ({ padding: '10px 20px', border: 'none', borderRadius: 6, background: '#e5e7eb', color: '#111827', fontWeight: 'bold', opacity: disabled ? .5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' })
