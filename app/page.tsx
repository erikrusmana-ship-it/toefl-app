'use client'
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { fetchWithRetry } from '@/lib/client-network'
import type { OptionKey } from '@/lib/option-shuffle'

type Step = 'access' | 'biodata' | 'listening' | 'structure' | 'reading' | 'selesai'
type Answers = Record<number, string>
type PackageCode = 'model_a' | 'model_b'
type ListeningPart = 'PART A' | 'PART B' | 'PART C'
type ListeningGroup = { title: string; audio: string; firstQuestion: number; lastQuestion: number }
type ViolationType = 'TAB_HIDDEN' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT'
type AntiCheatViolation = { type: ViolationType; label: string; occurredAt: string; section: Exclude<Step, 'access' | 'biodata' | 'selesai'> }
type ActiveStep = Exclude<Step, 'access' | 'biodata' | 'selesai'>
type SaveState = 'idle' | 'saving' | 'saved' | 'pending'
type ProgressData = {
  version: 3
  answersListening: Answers
  answersStructure: Answers
  answersReading: Answers
  violationCount: number
  violations: AntiCheatViolation[]
  heardListeningDirections: ListeningPart[]
  heardListeningGroups: number[]
}

function normalizeAnswers(value: unknown): Answers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Answers = {}
  for (const [questionId, answer] of Object.entries(value)) {
    const id = Number(questionId)
    if (Number.isInteger(id) && id > 0 && typeof answer === 'string' && ['A', 'B', 'C', 'D', 'X'].includes(answer)) result[id] = answer
  }
  return result
}

function normalizeListeningDirections(value: unknown): ListeningPart[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is ListeningPart => (
    item === 'PART A' || item === 'PART B' || item === 'PART C'
  ))))
}

function normalizeListeningGroups(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value
    .map(Number)
    .filter((item) => Number.isSafeInteger(item) && Boolean(LISTENING_GROUPS[item]))))
}

function friendlyError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : ''
  if (/fetch|network|offline/i.test(message)) return 'Koneksi internet terputus. Periksa jaringan lalu coba lagi.'
  if (/rate limit|too many/i.test(message)) return 'Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.'
  if (/sesi peserta/i.test(message)) return 'Sesi tes tidak lagi valid. Hubungi administrator untuk bantuan.'
  return fallback
}

const VIOLATION_LABELS: Record<ViolationType, string> = {
  TAB_HIDDEN: 'Membuka tab lain atau meminimalkan browser',
  WINDOW_BLUR: 'Membuka jendela atau aplikasi lain',
  FULLSCREEN_EXIT: 'Keluar dari mode fullscreen',
}

function isGoogleChrome(): boolean {
  const userAgent = navigator.userAgent
  const isChrome = /Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)
  const isOtherChromium = /Edg\//.test(userAgent) || /EdgiOS\//.test(userAgent) || /OPR\//.test(userAgent) || /Opera/.test(userAgent) || /SamsungBrowser\//.test(userAgent)
  const hasBraveApi = 'brave' in navigator

  return isChrome && !isOtherChromium && !hasBraveApi
}

const LISTENING_DIRECTIONS: Record<ListeningPart, { title: string; audio: string; text: string }> = {
  'PART A': {
    title: 'Part A — Short Conversations',
    audio: '/audio/listening/directions-part-a.mp3',
    text: `Practice Test A. Section 1, Listening Comprehension.

In this section of the test, you will have an opportunity to demonstrate your ability to understand conversations and talks in English. There are three parts to this section, with special directions for each part. Answer all the questions on the basis of what is stated or implied by the speakers in this test.

When you take the actual TOEFL test, you will not be allowed to take notes or write in your test book. Try to work on Practice Test A in the same way.

Part A. Directions.

In Part A, you will hear short conversations between two people. After each conversation, you will hear a question about the conversation. The conversations and questions will not be repeated.

After you hear a question, read the four possible answers in your book and choose the best answer. Then, on your answer sheet, find the number of the question and fill in the space that corresponds to the letter of the answer you have chosen.

Here is an example.

On the recording, you hear:
Woman: I don't like this painting very much.
Man: Neither do I.
Narrator: What does the man mean?

In your test book, you read:
(A) He doesn't like the painting either.
(B) He doesn't know how to paint.
(C) He doesn't have any paintings.
(D) He doesn't know what to do.

You learn from the conversation that neither the man nor the woman likes the painting. The best answer to the question, “What does the man mean?” is (A), “He doesn't like the painting either.” Therefore, the correct choice is (A).

Go on to the next page. Now we will begin Part A with question number one.`,
  },
  'PART B': {
    title: 'Part B — Longer Conversations',
    audio: '/audio/listening/directions-part-b.mp3',
    text: `Now read along as the directions for Part B are being read.

Part B. Directions.

In this part of the test, you will hear longer conversations. After each conversation, you will hear several questions. The conversations and questions will not be repeated.

After you hear a question, read the four possible answers in your book and choose the best answer. Then, on your answer sheet, find the number of the question and fill in the space that corresponds to the letter of the answer you have chosen.

Remember, you should not take notes or write in your book.

Go on to the next page.`,
  },
  'PART C': {
    title: 'Part C — Short Talks',
    audio: '/audio/listening/directions-part-c.mp3',
    text: `Now read along as the directions for Part C are being read.

Part C. Directions.

In this part of the test, you will hear several short talks. After each talk, you will hear some questions. The talks and the questions will not be repeated.

After you hear a question, read the four possible answers in your book and choose the best answer. Then, on your answer sheet, find the number of the question and fill in the space that corresponds to the letter of the answer you have chosen.

Here is an example.

On the recording, you hear:
Narrator: Listen to an instructor talk to his class about a television program.

Instructor: I'd like to tell you about an interesting TV program that will be shown this coming Thursday. It will be on from 9 to 10 p.m. on Channel 4. It's part of a series called Mysteries of Human Biology. The subject of the program is the human brain, how it functions, and how it can malfunction. Topics that will be covered are dreams, memory, and depression. These topics are illustrated with outstanding computer animation that makes the explanations easy to follow. Make an effort to see this show. Since we've been studying the nervous system in class, I know you'll find it very helpful.

Now listen to a sample question.

Narrator: What is the main purpose of the program?

In your test book, you read:
(A) To demonstrate the latest use of computer graphics.
(B) To discuss the possibility of an economic depression.
(C) To explain the workings of the brain.
(D) To dramatize a famous mystery story.

The best answer to the question, “What is the main purpose of the program?” is (C), “To explain the workings of the brain.” Therefore, the correct choice is (C).

Now listen to another sample question.

Narrator: Why does the speaker recommend watching the program?

In your test book, you read:
(A) It is required of all science majors.
(B) It will never be shown again.
(C) It can help viewers improve their memory skills.
(D) It will help with coursework.

The best answer to the question, “Why does the speaker recommend watching the program?” is (D), “It will help with coursework.” Therefore, the correct choice is (D).

Remember, you should not take notes or write in your book. Go on to the next page.`,
  },
}

const LISTENING_GROUPS: Record<number, ListeningGroup> = {
  31: { title: 'Part B — First Conversation', audio: '/audio/listening/conversation-31-33.mp3', firstQuestion: 31, lastQuestion: 33 },
  34: { title: 'Part B — Second Conversation', audio: '/audio/listening/conversation-34-37.mp3', firstQuestion: 34, lastQuestion: 37 },
  38: { title: 'Part C — First Talk', audio: '/audio/listening/talk-38-41.mp3', firstQuestion: 38, lastQuestion: 41 },
  42: { title: 'Part C — Second Talk', audio: '/audio/listening/talk-42-46.mp3', firstQuestion: 42, lastQuestion: 46 },
  47: { title: 'Part C — Third Talk', audio: '/audio/listening/talk-47-50.mp3', firstQuestion: 47, lastQuestion: 50 },
}

function packageAudioPath(path: string, packageCode: PackageCode) {
  const folder = packageCode === 'model_a' ? 'model-a' : 'model-b'
  return path.replace('/audio/listening/', `/audio/${folder}/listening/`)
}

function audioSources(path: string, packageCode: PackageCode, preferred?: string) {
  return Array.from(new Set([
    preferred,
    packageAudioPath(path, packageCode),
    path,
  ].filter((source): source is string => Boolean(source?.trim()))))
}

function listeningDirectionText(part: ListeningPart, packageCode: PackageCode) {
  const packageLetter = packageCode === 'model_a' ? 'A' : 'B'
  return LISTENING_DIRECTIONS[part].text.replaceAll('Practice Test A', `Practice Test ${packageLetter}`)
}

const READING_PASSAGE_LINES: Record<string, string[]> = {
  'Frank Lloyd Wright and Functionalism': [
    'A distinctively American architecture began with Frank Lloyd Wright, who had',
    'taken to heart the admonition that form should follow function, and who thought of',
    'buildings not as separate architectural entities but as parts of an organic whole that',
    'included the land, the community, and the society. In a very real way the houses of',
    'colonial New England and some of the southern plantations had been functional, but',
    'Wright was the first architect to make functionalism the authoritative principle for',
    'public as well as for domestic buildings. As early as 1906 he built the Unity Temple',
    'in Oak Park, Illinois, the first of those churches that did so much to revolutionize',
    'ecclesiastical architecture in the United States. Thereafter he turned his genius to such',
    'miscellaneous structures as houses, schools, office buildings, and factories, among',
    'them the famous Larkin Building in Buffalo, New York, and the Johnson Wax',
    'Company building in Racine, Wisconsin.',
  ],
  'Types of Glaciers': [
    'There are two basic types of glaciers, those that flow outward in all directions with',
    'little regard for any underlying terrain and those that are confined by terrain to a',
    'particular path.',
    'The first category of glaciers includes those massive blankets that cover whole',
    'continents, appropriately called ice sheets. There must be over 50,000 square',
    'kilometers of land covered with ice for the glacier to qualify as an ice sheet. When',
    'portions of an ice sheet spread out over the ocean, they form ice shelves.',
    'About 20,000 years ago the Cordilleran Ice Sheet covered nearly all the mountains',
    'in southern Alaska, western Canada, and the western United States. It was about 3',
    'kilometers deep at its thickest point in northern Alberta. Now there are only two sheets',
    'left on Earth, those covering Greenland and Antarctica.',
    'Any domelike body of ice that also flows out in all directions but covers less than',
    '50,000 square kilometers is called an ice cap. Although ice caps are rare nowadays,',
    'there are a number in northeastern Canada, on Baffin Island, and on the Queen Elizabeth',
    'Islands.',
    'The second category of glaciers includes those of a variety of shapes and sizes',
    'generally called mountain or alpine glaciers. Mountain glaciers are typically identified',
    'by the landform that controls their flow. One form of mountain glacier that resembles',
    'an ice cap in that it flows outward in several directions is called an ice field. The',
    'difference between an ice field and an ice cap is subtle. Essentially, the flow of an ice',
    'field is somewhat controlled by surrounding terrain and thus does not have the domelike',
    'shape of a cap. There are several ice fields in the Wrangell, St. Elias, and Chugach',
    'mountains of Alaska and northern British Columbia.',
    'Less spectacular than large ice fields are the most common types of mountain',
    'glaciers: the cirque and valley glaciers. Cirque glaciers are found in depressions in the',
    'surface of the land and have a characteristic circular shape. The ice of valley glaciers,',
    'bound by terrain, flows down valleys, curves around their corners, and falls over cliffs.',
  ],
  'Australopithecus robustus and Tool Use': [
    'Tools and hand bones excavated from the Swartkrans cave complex in South Africa',
    'suggest that a close relative of early humans known as Australopithecus robustus may',
    'have made and used primitive tools long before the species became extinct 1 million',
    "years ago. It may even have made and used primitive tools long before humanity's",
    'direct ancestor, Homo habilis, or “handy man,” began doing so. Homo habilis and its',
    'successor, Homo erectus, coexisted with Australopithecus robustus on the plains of',
    'South Africa for more than a million years.',
    "The Swartkrans cave in South Africa has been under excavation since the 1940's.",
    'The earliest fossil-containing layers of sedimentary rock in the cave date from about',
    '1.9 million years ago and contain extensive remains of animals, primitive tools, and',
    'two or more species of apelike hominids. The key recent discovery involved bones',
    'from the hand of Australopithecus robustus, the first time such bones have been found.',
    'The most important feature of the Australopithecus robustus hand was the pollical',
    'distal thumb tip, the last bone in the thumb. The bone had an attachment point for a',
    '“uniquely human” muscle, the flexor pollicis longus, that had previously been found',
    'only in more recent ancestors. That muscle gave Australopithecus robustus an opposable',
    'thumb, a feature that would allow them to grip objects, including tools. The researchers',
    'also found primitive bone and stone implements, especially digging tools, in the same',
    'layers of sediments.',
    'Australopithecus robustus were more heavily built—more “robust” in anthropological',
    'terms—than their successors. They had broad faces, heavy jaws, and massive crushing',
    'and grinding teeth that were used for eating hard fruits, seeds, and fibrous underground',
    'plant parts. They walked upright, which would have allowed them to carry and use',
    'tools. Most experts had previously believed that Homo habilis were able to supplant',
    "Australopithecus robustus because the former's ability to use tools gave them an innate",
    'superiority. The discovery that Australopithecus robustus also used tools means that',
    'researchers will have to seek other explanations for their extinction. Perhaps their',
    'reliance on naturally occurring plants led to their downfall as the climate became drier',
    'and cooler, or perhaps Homo habilis, with their bigger brains, were simply able to make more sophisticated tools.',
  ],
  'The Changing Focus of Medical Research': [
    'The first two decades of this century were dominated by the microbe hunters. These',
    'hunters had tracked down one after another of the microbes responsible for the most',
    'dreaded scourges of many centuries: tuberculosis, cholera, diphtheria. But there',
    'remained some terrible diseases for which no microbe could be incriminated: scurvy,',
    'pellagra, rickets, beriberi. Then it was discovered that these diseases were caused by',
    'the lack of vitamins, a trace substance in the diet. The diseases could be prevented or',
    'cured by consuming foods that contained the vitamins. And so in the decades of the',
    "1920's and 1930's, nutrition became a science and the vitamin hunters replaced the",
    'microbe hunters.',
    "In the 1940's and 1950's, biochemists strived to learn why each of the vitamins was",
    'essential for health. They discovered that key enzymes in metabolism depend on one or',
    'another of the vitamins as coenzymes to perform the chemistry that provides cells with',
    'energy for growth and function. Now, these enzyme hunters occupied center stage.',
    'You are aware that the enzyme hunters have been replaced by a new breed of',
    'hunters who are tracking genes—the blueprints for each of the enzymes—and are',
    'discovering the defective genes that cause inherited diseases—diabetes, cystic fibrosis.',
    'These gene hunters, or genetic engineers, use recombinant DNA technology to identify',
    'and clone genes and introduce them into bacterial cells and plants to create factories for',
    'the massive production of hormones and vaccines for medicine and for better crops for',
    'agriculture. Biotechnology has become a multibillion-dollar industry.',
    'In view of the inexorable progress in science, we can expect that the gene hunters',
    'will be replaced in the spotlight. When and by whom? Which kind of hunter will',
    'dominate the scene in the last decade of our waning century and in the early decades',
    'of the next? I wonder whether the hunters who will occupy the spotlight will be',
    'neurobiologists who apply the techniques of the enzyme and gene hunters to the',
    'functions of the brain. What to call them? The head hunters. I will return to them later.',
  ],
  'Industrialization in the United States': [
    'In the mid-nineteenth century, the United States had tremendous natural resources',
    'that could be exploited in order to develop heavy industry. Most of the raw materials',
    'that are valuable in the manufacture of machinery, transportation facilities, and consumer',
    'goods lay ready to be worked into wealth. Iron, coal, and oil—the basic ingredients of',
    'industrial growth—were plentiful and needed only the application of technical expertise,',
    'organizational skill, and labor.',
    'One crucial development in this movement toward industrialization was the growth',
    'of the railroads. The railway network expanded rapidly until the railroad map of the',
    "United States looked like a spider's web, with the steel filaments connecting all important",
    'sources of raw materials, their places of manufacture, and their centers of distribution.',
    'The railroads contributed to the industrial growth not only by connecting these major',
    'centers, but also by themselves consuming enormous amounts of fuel, iron, and coal.',
    'Many factors influenced emerging modes of production. For example, machine',
    'tools, the tools used to make goods, were steadily improved in the latter part of the',
    'nineteenth century—always with an eye to speedier production and lower unit costs.',
    'The products of the factories were rapidly absorbed by the growing cities that sheltered',
    'the workers and the distributors. The increased urban population was nourished by the',
    'increased farm production that, in turn, was made more productive by the use of the',
    'new farm machinery. American agricultural production kept up with the urban demand',
    'and still had surpluses for sale to the industrial centers of Europe.',
    'The labor that ran the factories and built the railways was recruited in part from',
    'American farm areas where people were being displaced by farm machinery, in part',
    'from Asia, and in part from Europe. Europe now began to send tides of immigrants',
    'from eastern and southern Europe—most of whom were originally poor farmers but',
    'who settled in American industrial cities. The money to finance this tremendous',
    'expansion of the American economy still came from European financiers for the most',
    'part, but the Americans were approaching the day when their expansion could be',
    'financed in their own “money market.”',
  ],
}

const READING_PARAGRAPH_STARTS: Record<string, number[]> = {
  'Frank Lloyd Wright and Functionalism': [1],
  'Types of Glaciers': [1, 4, 8, 12, 16, 24],
  'Australopithecus robustus and Tool Use': [1, 8, 13, 20],
  'The Changing Focus of Medical Research': [1, 10, 14, 21],
  'Industrialization in the United States': [1, 7, 13, 21],
  'The Ocean Bottom and the Glomar Challenger': [1, 8, 15, 24],
  "Canada's Postwar Population Growth": [1, 14, 23],
  'Organically Grown Foods': [1, 5, 11, 14, 18],
  'The Origins of Drama in Ancient Greece': [1, 10, 21],
  'Post-Civil War Reconstruction': [1, 6, 9, 14, 17, 20],
}

function listeningPart(soal: SoalItem): ListeningPart {
  if (soal.nomor_soal >= 31 && soal.nomor_soal <= 37) return 'PART B'
  if (soal.nomor_soal >= 38) return 'PART C'
  return 'PART A'
}

interface SoalItem {
  id: number
  package_code: PackageCode
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
}

function Timer({ deadline, onTimeUp }: { deadline: string; onTimeUp: () => void }) {
  const [left, setLeft] = useState<number | null>(null)
  const callbackRef = useRef(onTimeUp)
  const firedRef = useRef(false)

  useEffect(() => { callbackRef.current = onTimeUp }, [onTimeUp])

  useEffect(() => {
    firedRef.current = false
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true
        callbackRef.current()
      }
    }
    const firstTick = window.setTimeout(tick, 0)
    const interval = window.setInterval(tick, 1000)
    return () => {
      window.clearTimeout(firstTick)
      window.clearInterval(interval)
    }
  }, [deadline])

  return (
    <strong style={{ color: '#7c3aed', fontSize: 18 }}>
      {left === null ? '--:--' : `${Math.floor(left / 60).toString().padStart(2, '0')}:${(left % 60).toString().padStart(2, '0')}`}
    </strong>
  )
}

function ReliableAudio({
  sources,
  label,
  onEnded,
  onReady,
  onAllSourcesFailed,
}: {
  sources: string[]
  label: string
  onEnded: () => void
  onReady?: () => void
  onAllSourcesFailed: () => void
}) {
  const [sourceIndex, setSourceIndex] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const source = sources[sourceIndex]

  useEffect(() => {
    audioRef.current?.setAttribute('disableremoteplayback', '')
  }, [source])

  const handleError = () => {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((current) => current + 1)
      return
    }

    onAllSourcesFailed()
  }

  return (
    <audio
      ref={audioRef}
      key={`${sourceIndex}:${source}`}
      aria-label={label}
      controls
      controlsList="nodownload noplaybackrate noremoteplayback"
      autoPlay
      preload="auto"
      onCanPlay={onReady}
      onEnded={onEnded}
      onError={handleError}
      onContextMenu={(event) => event.preventDefault()}
      src={source}
      style={{ width: '100%', margin: '12px 0' }}
    />
  )
}

function WrittenExpressionQuestion({ text, options }: { text: string; options: Array<[string, string]> }) {
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const matches: Array<{ start: number; end: number; label: string }> = []
  let searchCursor = 0

  for (const [label, option] of options) {
    const phrase = option.trim()
    if (!phrase) continue

    const expression = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi')
    expression.lastIndex = searchCursor
    const found = expression.exec(text)

    if (!found) continue

    const end = found.index + found[0].length
    matches.push({ start: found.index, end, label })
    searchCursor = end
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

function ReadingPassage({ title, text }: { title?: string; text?: string }) {
  const storedLines = text?.includes('\n') ? text.split('\n').filter((line) => line.trim()) : undefined
  const lines = title ? READING_PASSAGE_LINES[title] || storedLines : storedLines

  if (!lines) {
    return (
      <div style={{ color: '#1f2937', fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 16 }}>
        {(text || '').split(/\n\s*\n/).map((paragraph, index) => (
          <p key={index} style={{ lineHeight: 1.75, margin: index === 0 ? '14px 0 0' : '16px 0 0', textIndent: 28 }}>
            {paragraph}
          </p>
        ))}
      </div>
    )
  }

  const paragraphStarts = new Set(title ? READING_PARAGRAPH_STARTS[title] : [1])

  return (
    <div style={{ marginTop: 14, color: '#1f2937', fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 16 }}>
      {lines.map((line, index) => {
        const lineNumber = index + 1
        const showNumber = lineNumber === 1 || lineNumber % 5 === 0
        const startsParagraph = paragraphStarts.has(lineNumber)

        return (
          <div key={lineNumber} style={{ display: 'grid', gridTemplateColumns: '62px minmax(0, 1fr)', gap: 10, lineHeight: 1.65, marginTop: startsParagraph && lineNumber !== 1 ? 14 : 0 }}>
            <span style={{ color: '#6b7280', fontSize: 13, fontStyle: 'italic', fontWeight: 700, textAlign: 'right', paddingTop: 2 }}>
              {showNumber ? `Line ${lineNumber}` : ''}
            </span>
            <span style={{ paddingLeft: startsParagraph ? 28 : 0 }}>{line}</span>
          </div>
        )
      })}
    </div>
  )
}

async function fetchQuestionBank() {
  const response = await fetch('/api/questions', {
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || 'Bank soal belum dapat dimuat.')
  }

  const questions = payload?.questions
  if (
    !questions ||
    !Array.isArray(questions.listening) ||
    !Array.isArray(questions.structure) ||
    !Array.isArray(questions.reading) ||
    questions.listening.length !== 50 ||
    questions.structure.length !== 40 ||
    questions.reading.length !== 50
  ) {
    throw new Error('Bank soal paket peserta belum lengkap.')
  }

  return {
    packageCode: payload.package_code as PackageCode,
    listening: questions.listening as SoalItem[],
    structure: questions.structure as SoalItem[],
    reading: questions.reading as SoalItem[],
  }
}

export default function HomePage() {
  const [accessCode, setAccessCode] = useState('')
  const [nama, setNama] = useState('')
  const [npm, setNpm] = useState('')
  const [prodi, setProdi] = useState('')
  const [email, setEmail] = useState('')
  const [packageCode, setPackageCode] = useState<PackageCode>('model_b')
  const [packageName, setPackageName] = useState('Paket B')
  const [pesertaId, setPesertaId] = useState<number | null>(null)
  const [step, setStep] = useState<Step>('access')
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [resumeAvailable, setResumeAvailable] = useState(false)
  const [checkingResume, setCheckingResume] = useState(true)
  const [sectionDeadline, setSectionDeadline] = useState(() => new Date(Date.now() + 40 * 60 * 1000).toISOString())
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [pageMessage, setPageMessage] = useState('')

  const [listening, setListening] = useState<SoalItem[]>([])
  const [structure, setStructure] = useState<SoalItem[]>([])
  const [reading, setReading] = useState<SoalItem[]>([])
  const [answersListening, setAnswersListening] = useState<Answers>({})
  const [answersStructure, setAnswersStructure] = useState<Answers>({})
  const [answersReading, setAnswersReading] = useState<Answers>({})
  const [listeningDirection, setListeningDirection] = useState<ListeningPart | null>(null)
  const [listeningGroup, setListeningGroup] = useState<ListeningGroup | null>(null)
  const [directionAudioFinished, setDirectionAudioFinished] = useState(false)
  const [heardListeningDirections, setHeardListeningDirections] = useState<ListeningPart[]>([])
  const [heardListeningGroups, setHeardListeningGroups] = useState<number[]>([])
  const [audioRetryToken, setAudioRetryToken] = useState(0)
  const [audioError, setAudioError] = useState('')
  const [navigating, setNavigating] = useState(false)
  const [antiCheatWarning, setAntiCheatWarning] = useState<AntiCheatViolation | null>(null)
  const [violationCount, setViolationCount] = useState(0)
  const submitting = useRef(false)
  const violationsRef = useRef<AntiCheatViolation[]>([])
  const antiCheatActiveRef = useRef(false)
  const lastViolationAtRef = useRef(0)
  const forcedTerminationRef = useRef(false)
  const submitRef = useRef<() => void>(() => undefined)
  const saveSequenceRef = useRef(0)
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve())
  const progressRevisionRef = useRef(0)
  const navigationLockedRef = useRef(false)
  const readingBelumTersedia = reading.length === 0

  useEffect(() => {
    let active = true
    fetch('/api/test-session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (active) setResumeAvailable(Boolean(data?.hasSession && !data?.progress?.submitted))
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setCheckingResume(false)
      })
    return () => { active = false }
  }, [])

  const verifyAccessCode = async (event: FormEvent) => {
    event.preventDefault()
    const normalizedCode = accessCode.trim().toUpperCase()
    if (!normalizedCode) return

    setLoading(true)
    let packageInfo: { valid?: boolean; package_code?: string; package_name?: string } | null = null
    try {
      const response = await fetch('/api/test-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', code: normalizedCode }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Kode akses belum dapat diperiksa.')
      packageInfo = data
    } catch (error) {
      alert(friendlyError(error, error instanceof Error ? error.message : 'Kode akses belum dapat diperiksa.'))
      return
    } finally {
      setLoading(false)
    }

    if (!packageInfo?.valid || !['model_a', 'model_b'].includes(String(packageInfo.package_code))) {
      alert('Kode akses tidak valid atau sudah dinonaktifkan.')
      return
    }

    setAccessCode(normalizedCode)
    setPackageCode(packageInfo.package_code as PackageCode)
    setPackageName(packageInfo.package_name || 'Paket Tes')
    setIsFetching(false)
    setStep('biodata')
  }

  const resumePreviousTest = async () => {
    setLoading(true)
    setPageMessage('')
    try {
      if (!isGoogleChrome()) throw new Error('Chrome required')
      if (!document.fullscreenEnabled) throw new Error('Fullscreen unavailable')

      const sessionResponse = await fetch('/api/test-session', { cache: 'no-store' })
      const sessionData = await sessionResponse.json()
      if (!sessionResponse.ok || !sessionData?.hasSession || sessionData?.progress?.submitted) {
        setResumeAvailable(false)
        throw new Error('Sesi peserta tidak valid.')
      }

      const restoredPackageCode = ['model_a', 'model_b'].includes(String(sessionData.progress?.package_code))
        ? sessionData.progress.package_code as PackageCode
        : 'model_b'
      const bank = await fetchQuestionBank()

      if (bank.packageCode !== restoredPackageCode) {
        throw new Error('Paket soal pada sesi tidak konsisten.')
      }

      await document.documentElement.requestFullscreen({ navigationUI: 'hide' })

      const serverProgress = sessionData.progress as {
        section?: ActiveStep
        question?: number
        section_deadline?: string
        progress_revision?: number
        progress?: Partial<ProgressData>
      }
      const activeStep: ActiveStep = ['listening', 'structure', 'reading'].includes(String(serverProgress.section))
        ? serverProgress.section as ActiveStep
        : 'listening'
      const maxQuestions = activeStep === 'listening' ? bank.listening.length : activeStep === 'structure' ? bank.structure.length : bank.reading.length
      const restoredIndex = Math.max(0, Math.min((Number(serverProgress.question) || 1) - 1, Math.max(0, maxQuestions - 1)))
      const storedProgress = serverProgress.progress || {}
      const storedViolations = Array.isArray(storedProgress.violations)
        ? storedProgress.violations.filter((item): item is AntiCheatViolation => Boolean(item && typeof item === 'object' && 'type' in item && 'occurredAt' in item)).slice(0, 10)
        : []
      const storedDirections = normalizeListeningDirections(storedProgress.heardListeningDirections)
      const storedGroups = normalizeListeningGroups(storedProgress.heardListeningGroups)
      const restoredQuestion = activeStep === 'listening' ? bank.listening[restoredIndex] : null
      const restoredPart = restoredQuestion ? listeningPart(restoredQuestion) : null
      const shouldReplayDirection = Boolean(
        restoredQuestion &&
        [1, 31, 38].includes(restoredQuestion.nomor_soal) &&
        restoredPart &&
        !storedDirections.includes(restoredPart)
      )
      const restoredGroup = restoredQuestion ? LISTENING_GROUPS[restoredQuestion.nomor_soal] : undefined
      const shouldReplayGroup = Boolean(
        restoredGroup &&
        !storedGroups.includes(restoredGroup.firstQuestion)
      )

      setListening(bank.listening)
      setStructure(bank.structure)
      setReading(bank.reading)
      setPackageCode(restoredPackageCode)
      setPackageName(sessionData.progress?.package_name || (restoredPackageCode === 'model_a' ? 'TOEFL Model A' : 'Paket B'))
      setAnswersListening(normalizeAnswers(storedProgress.answersListening))
      setAnswersStructure(normalizeAnswers(storedProgress.answersStructure))
      setAnswersReading(normalizeAnswers(storedProgress.answersReading))
      setHeardListeningDirections(storedDirections)
      setHeardListeningGroups(storedGroups)
      setPesertaId(Number(sessionData.participantId))
      setIndex(restoredIndex)
      setDirectionAudioFinished(false)
      setListeningDirection(shouldReplayDirection ? restoredPart : null)
      setListeningGroup(shouldReplayGroup && restoredGroup
        ? restoredGroup
        : null)
      setSectionDeadline(serverProgress.section_deadline || new Date(Date.now() + 40 * 60 * 1000).toISOString())
      progressRevisionRef.current = Math.max(0, Number(serverProgress.progress_revision) || 0)
      violationsRef.current = storedViolations
      setViolationCount(storedViolations.length)
      forcedTerminationRef.current = false
      lastViolationAtRef.current = Date.now()
      antiCheatActiveRef.current = true
      setResumeAvailable(false)
      setStep(activeStep)
    } catch (error) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined)
      const message = error instanceof Error && error.message === 'Chrome required'
        ? 'Tes hanya dapat dilanjutkan menggunakan Google Chrome.'
        : error instanceof Error && error.message === 'Fullscreen unavailable'
          ? 'Perangkat atau browser ini tidak mendukung mode fullscreen.'
          : friendlyError(error, 'Tes sebelumnya belum dapat dilanjutkan. Periksa koneksi lalu coba lagi.')
      setPageMessage(message)
    } finally {
      setLoading(false)
    }
  }

  const discardPreviousSession = async () => {
    await fetch('/api/test-session', { method: 'DELETE' }).catch(() => undefined)
    setResumeAvailable(false)
    setPageMessage('Sesi pada perangkat ini telah dihapus. Anda dapat memulai tes baru.')
  }

  const start = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPageMessage('')

    // Baca langsung dari form agar nilai yang diisi oleh autofill Chrome tetap
    // terkirim meskipun browser tidak memicu onChange pada controlled input.
    const formData = new FormData(event.currentTarget)
    const participantNama = String(formData.get('nama') || '').trim()
    const participantNpm = String(formData.get('npm') || '').trim()
    const participantProdi = String(formData.get('prodi') || '').trim()
    const participantEmail = String(formData.get('email') || '').trim().toLowerCase()

    if (participantNama.length < 2) {
      setPageMessage('Nama Lengkap belum terisi dengan benar.')
      return
    }
    if (participantNpm.length < 2) {
      setPageMessage('NPM belum terisi dengan benar.')
      return
    }
    if (participantProdi.length < 2) {
      setPageMessage('Prodi belum terisi dengan benar.')
      return
    }
    if (participantEmail.length < 5) {
      setPageMessage('Alamat Email belum terisi dengan benar.')
      return
    }

    setNama(participantNama)
    setNpm(participantNpm)
    setProdi(participantProdi)
    setEmail(participantEmail)

    if (!isGoogleChrome()) {
      alert('Tes hanya dapat dimulai menggunakan Google Chrome. Silakan buka kembali halaman ini di Google Chrome.')
      return
    }

    if (!document.fullscreenEnabled) {
      alert('Perangkat atau browser ini tidak mendukung mode fullscreen yang diwajibkan untuk tes.')
      return
    }

    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    } catch {
      alert('Fullscreen harus diizinkan untuk memulai tes. Klik Mulai Tes TOEFL lalu pilih Izinkan jika diminta.')
      return
    }

    violationsRef.current = []
    forcedTerminationRef.current = false
    lastViolationAtRef.current = Date.now()
    setViolationCount(0)
    setAntiCheatWarning(null)

    setLoading(true)
    let participant: { participant_id?: number; section_deadline?: string; package_code?: string; package_name?: string } | null = null
    let bank: Awaited<ReturnType<typeof fetchQuestionBank>> | null = null
    try {
      const response = await fetch('/api/test-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          code: accessCode,
          nama: participantNama,
          npm: participantNpm,
          prodi: participantProdi,
          email: participantEmail,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Tes belum dapat dimulai.')
      participant = data

      if (
        !participant?.participant_id ||
        !['model_a', 'model_b'].includes(String(participant.package_code))
      ) {
        throw new Error('Sesi peserta tidak berhasil dibuat.')
      }

      bank = await fetchQuestionBank()
      if (bank.packageCode !== participant.package_code) {
        throw new Error('Paket soal pada sesi tidak konsisten.')
      }
    } catch (error) {
      setLoading(false)
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined)
      const message = error instanceof Error ? error.message : 'Tes belum dapat dimulai.'
      if (participant?.participant_id) {
        setResumeAvailable(true)
        setStep('access')
        setPageMessage('Sesi sudah dibuat, tetapi bank soal belum berhasil dimuat. Gunakan tombol Lanjutkan Tes untuk mencoba kembali tanpa membuat peserta baru.')
        return
      }
      if (/kode akses/i.test(message)) setStep('access')
      return alert(`Gagal memulai tes: ${message}`)
    }

    if (!participant?.participant_id || !bank) {
      setLoading(false)
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined)
      return alert('Gagal memulai tes: sesi peserta tidak berhasil dibuat.')
    }

    setListening(bank.listening)
    setStructure(bank.structure)
    setReading(bank.reading)
    setPesertaId(Number(participant.participant_id))
    if (['model_a', 'model_b'].includes(String(participant.package_code))) setPackageCode(participant.package_code as PackageCode)
    if (participant.package_name) setPackageName(participant.package_name)
    progressRevisionRef.current = 0
    setSectionDeadline(participant.section_deadline || new Date(Date.now() + 40 * 60 * 1000).toISOString())
    setIndex(0)
    setDirectionAudioFinished(false)
    setHeardListeningDirections([])
    setHeardListeningGroups([])
    setListeningDirection('PART A')
    antiCheatActiveRef.current = true
    setLoading(false)
    setStep('listening')
  }

  const nextSectionListening = useCallback(() => {
    setListeningDirection(null)
    setListeningGroup(null)
    setIndex(0)
    setSectionDeadline(new Date(Date.now() + 25 * 60 * 1000).toISOString())
    setStep('structure')
  }, [])
  const nextSectionStructure = useCallback(() => {
    setIndex(0)
    setSectionDeadline(new Date(Date.now() + 55 * 60 * 1000).toISOString())
    setStep('reading')
  }, [])

  const submit = useCallback(async () => {
    if (!pesertaId || submitting.current) return
    submitting.current = true
    setPageMessage('')
    antiCheatActiveRef.current = false
    setLoading(true)
    const violations = [...violationsRef.current]
    const statusTes = forcedTerminationRef.current ? 'dihentikan_pelanggaran' : 'selesai'
    const allQuestions = [...listening, ...structure, ...reading]
    const allAnswers = { ...answersListening, ...answersStructure, ...answersReading }
    const answersPayload = allQuestions.map((question) => ({
      question_id: question.id,
      answer: allAnswers[question.id] || 'X',
    }))

    const scoreResponse = await fetchWithRetry('/api/test-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answersPayload, violations, status: statusTes }),
    }, { attempts: 3, timeoutMs: 20_000, baseDelayMs: 750 })
    const scoreData = await scoreResponse.json().catch(() => null)

    if (!scoreResponse.ok || !scoreData?.success) {
      setPageMessage(scoreData?.error || 'Hasil belum tersimpan. Periksa koneksi lalu klik Selesaikan kembali.')
      submitting.current = false
      antiCheatActiveRef.current = true
      setLoading(false)
      return
    }

    setLoading(false)
    await fetch('/api/test-session', { method: 'DELETE' }).catch(() => undefined)
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined)
    setStep('selesai')
  }, [pesertaId, listening, structure, reading, answersListening, answersStructure, answersReading])

  useEffect(() => {
    submitRef.current = () => { void submit() }
  }, [submit])

  const persistProgress = useCallback(() => {
    if (!pesertaId || submitting.current || !['listening', 'structure', 'reading'].includes(step)) return Promise.resolve(false)
    const sequence = ++saveSequenceRef.current
    const revision = ++progressRevisionRef.current
    const progress: ProgressData = {
      version: 3,
      answersListening,
      answersStructure,
      answersReading,
      violationCount,
      violations: violationsRef.current.slice(0, 10),
      heardListeningDirections,
      heardListeningGroups,
    }

    // Semua autosave diproses berurutan. Ini mencegah request lama yang lambat
    // menimpa jawaban atau posisi terbaru pada koneksi yang tidak stabil.
    const queuedSave = saveQueueRef.current.catch(() => undefined).then(async () => {
      setSaveState('saving')
      try {
        const response = await fetchWithRetry('/api/test-session', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: step, question: index + 1, revision, progress }),
        }, { attempts: 3, timeoutMs: 10_000, baseDelayMs: 600 })
        const result = await response.json().catch(() => null)
        if (!response.ok) throw new Error(result?.error || 'Autosave failed')
        if (sequence === saveSequenceRef.current) {
          if (typeof result?.section_deadline === 'string') setSectionDeadline(result.section_deadline)
          setSaveState('saved')
          setPageMessage('')
        }
        return true
      } catch (error) {
        if (sequence === saveSequenceRef.current) setSaveState('pending')
        console.error('Autosave tertunda:', error)
        return false
      }
    })
    saveQueueRef.current = queuedSave
    return queuedSave
  }, [pesertaId, step, index, answersListening, answersStructure, answersReading, violationCount, heardListeningDirections, heardListeningGroups])

  useEffect(() => {
    if (!pesertaId || !['listening', 'structure', 'reading'].includes(step)) return
    const timeout = window.setTimeout(() => { void persistProgress() }, 900)
    return () => window.clearTimeout(timeout)
  }, [pesertaId, persistProgress, step])

  useEffect(() => {
    if (!pesertaId || !['listening', 'structure', 'reading'].includes(step)) return
    const interval = window.setInterval(() => { void persistProgress() }, 30000)
    return () => window.clearInterval(interval)
  }, [pesertaId, persistProgress, step])

  useEffect(() => {
    if (!pesertaId || !['listening', 'structure', 'reading'].includes(step)) return
    const saveWhenOnline = () => { void persistProgress() }
    window.addEventListener('online', saveWhenOnline)
    return () => window.removeEventListener('online', saveWhenOnline)
  }, [pesertaId, persistProgress, step])

  const recordViolation = useCallback((type: ViolationType) => {
    if (!antiCheatActiveRef.current || submitting.current) return

    const now = Date.now()
    if (now - lastViolationAtRef.current < 1800) return
    lastViolationAtRef.current = now

    const violation: AntiCheatViolation = {
      type,
      label: VIOLATION_LABELS[type],
      occurredAt: new Date(now).toISOString(),
      section: step as AntiCheatViolation['section'],
    }
    const violations = [...violationsRef.current, violation]
    violationsRef.current = violations
    setViolationCount(violations.length)

    if (violations.length >= 2) {
      antiCheatActiveRef.current = false
      forcedTerminationRef.current = true
      setAntiCheatWarning(null)
      alert('Pelanggaran kedua terdeteksi. Tes dihentikan dan hasil yang telah dikerjakan akan dikirim otomatis.')
      submitRef.current()
      return
    }

    setAntiCheatWarning(violation)
  }, [step])

  useEffect(() => {
    if (step === 'access' || step === 'biodata' || step === 'selesai') return

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') recordViolation('TAB_HIDDEN')
    }
    const handleBlur = () => {
      window.setTimeout(() => {
        if (!document.hasFocus()) recordViolation('WINDOW_BLUR')
      }, 0)
    }
    const handleFullscreen = () => {
      if (!document.fullscreenElement) recordViolation('FULLSCREEN_EXIT')
    }
    const blockContextMenu = (event: MouseEvent) => event.preventDefault()
    const blockClipboard = (event: ClipboardEvent) => event.preventDefault()
    const blockShortcut = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const blockedWithModifier = ['c', 'v', 'x', 'p', 's', 'u', 'a', 't', 'n', 'w', 'l'].includes(key)
      if ((event.ctrlKey || event.metaKey) && blockedWithModifier) event.preventDefault()
      if (event.key === 'F12' || (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key))) event.preventDefault()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('fullscreenchange', handleFullscreen)
    document.addEventListener('contextmenu', blockContextMenu)
    document.addEventListener('copy', blockClipboard)
    document.addEventListener('cut', blockClipboard)
    document.addEventListener('paste', blockClipboard)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('keydown', blockShortcut, true)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('fullscreenchange', handleFullscreen)
      document.removeEventListener('contextmenu', blockContextMenu)
      document.removeEventListener('copy', blockClipboard)
      document.removeEventListener('cut', blockClipboard)
      document.removeEventListener('paste', blockClipboard)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('keydown', blockShortcut, true)
    }
  }, [recordViolation, step])

  const resumeAfterWarning = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      lastViolationAtRef.current = Date.now()
      setAntiCheatWarning(null)
    } catch {
      alert('Anda harus mengizinkan fullscreen untuk kembali mengerjakan tes.')
    }
  }

  if (step === 'access') {
    return (
      <main style={landingPage}>
        <section style={landingHero}>
          <div style={landingLogoFrame}>
            <img src="/logo-unpas.png" alt="Logo UNPAS" style={{ width: 300, height: 300, objectFit: 'contain' }} />
          </div>
          <h1 style={landingTitle}>English Proficiency Test</h1>
          <p style={landingSubtitle}>Laboratorium Prodi Sastra Inggris UNPAS</p>

          <div style={testSummaryGrid}>
            <div style={summaryItem}><strong>120 menit</strong><span>Total durasi tes</span></div>
            <div style={summaryItem}><strong>3 section</strong><span>Listening, Structure, Reading</span></div>
            <div style={summaryItem}><strong>140 soal</strong><span>50 + 40 + 50 soal</span></div>
          </div>

          <div style={rulesPanel}>
            <strong style={{ display: 'block', fontSize: 18 }}>PERHATIAN!</strong>
            <strong style={{ display: 'block', marginTop: 6 }}>Aturan sebelum memulai</strong>
            <ul style={{ margin: '10px 0 0', paddingLeft: 20, lineHeight: 1.7, fontWeight: 700 }}>
              <li>Gunakan Google Chrome dan izinkan mode fullscreen.</li>
              <li>Siapkan headset atau earphone untuk Section Listening.</li>
              <li>Jangan membuka tab, jendela, atau aplikasi lain selama tes.</li>
              <li>Kode akses hanya bisa digunakan satu kali.</li>
            </ul>
          </div>

          {resumeAvailable && (
            <div style={resumeCard}>
              <div>
                <strong style={{ display: 'block', color: '#166534' }}>Tes sebelumnya ditemukan</strong>
                <span style={{ color: '#4b5563', fontSize: 14 }}>Jawaban dan sisa waktu tersimpan. Lanjutkan dari posisi terakhir pada perangkat ini.</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" disabled={loading} onClick={() => { void resumePreviousTest() }} style={purpleButton(loading)}>
                  {loading ? 'Membuka sesi...' : 'Lanjutkan Tes'}
                </button>
                <button type="button" disabled={loading} onClick={() => { void discardPreviousSession() }} style={grayButton(loading)}>Hapus sesi</button>
              </div>
            </div>
          )}
          {checkingResume && <p style={{ color: '#6b7280', fontSize: 13 }}>Memeriksa tes yang belum selesai...</p>}
          {pageMessage && <p role="alert" style={errorNotice}>{pageMessage}</p>}

          <div style={accessCard}>
            <span style={accessTab}>Masukkan Kode</span>
            <h2 style={{ margin: '18px 0 6px', color: '#4c1d95' }}>Kode Akses Tes</h2>
            <p style={{ margin: '0 0 18px', color: '#6b7280' }}>Masukkan kode yang diberikan oleh administrator.</p>
            <form onSubmit={verifyAccessCode} style={form}>
              <label style={fieldLabel}>
                Kode Akses
                <input
                  required
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value.toUpperCase())}
                  placeholder="Contoh: UNPAS-AB12-CD34-EF56-GH78"
                  style={{ ...input, textAlign: 'center', letterSpacing: 1.2, fontWeight: 700 }}
                />
              </label>
              <button type="submit" disabled={loading} style={purpleButton(loading)}>
                {loading ? 'Memeriksa kode...' : 'Lanjutkan'}
              </button>
            </form>
          </div>
        </section>
      </main>
    )
  }

  if (step === 'biodata') {
    return (
      <main style={centerPage}>
        <div style={card}>
          <div style={logoFrame}>
            <img src="/logo-unpas.png" alt="Logo UNPAS" style={{ display: 'block', width: 330, height: 330, objectFit: 'contain', flex: '0 0 auto' }} />
          </div>
          <h2 style={{ color: '#4c1d95', textAlign: 'center' }}>Form Peserta English Proficiency Test</h2>
          <p style={{ marginTop: -4, textAlign: 'center', color: '#166534', fontWeight: 700 }}>Kode akses diterima · {packageName}</p>
          {pageMessage && <p role="alert" style={errorNotice}>{pageMessage}</p>}
          {isFetching ? <p style={{ textAlign: 'center' }}>Memuat bank soal...</p> : (
            <form onSubmit={start} style={form}>
              <label style={fieldLabel}>Nama Lengkap<input required minLength={2} name="nama" autoComplete="name" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Masukkan nama lengkap" style={input} /></label>
              <label style={fieldLabel}>NPM<input required minLength={2} name="npm" inputMode="numeric" value={npm} onChange={(e) => setNpm(e.target.value)} placeholder="Masukkan NPM" style={input} /></label>
              <label style={fieldLabel}>Prodi<input required minLength={2} name="prodi" value={prodi} onChange={(e) => setProdi(e.target.value)} placeholder="Masukkan program studi" style={input} /></label>
              <label style={fieldLabel}>Alamat Email<input required minLength={5} name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" style={input} /></label>
              <div style={antiCheatNotice}>
                <strong>Aturan anti-cheating</strong>
                <span>Gunakan Google Chrome dan izinkan fullscreen. Membuka tab, jendela, atau aplikasi lain dihitung sebagai pelanggaran. Pelanggaran kedua akan mengakhiri tes otomatis.</span>
              </div>
              <button type="submit" disabled={loading} style={purpleButton(loading)}>{loading ? 'Menyimpan...' : 'Mulai English Proficiency Test'}</button>
            </form>
          )}
        </div>
      </main>
    )
  }

  if (step === 'selesai') {
    return (
      <main style={centerPage}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={logoFrame}>
            <img src="/logo-unpas.png" alt="Logo UNPAS" style={{ display: 'block', width: 330, height: 330, objectFit: 'contain', flex: '0 0 auto' }} />
          </div>
          <h2 style={{ color: '#4c1d95', lineHeight: 1.6, margin: 0 }}>
            Selamat Anda telah melaksanakan TOEFL, semoga hasil yang diraih sesuai dengan harapan
          </h2>
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
  const timeUp = step === 'listening' ? nextSectionListening : step === 'structure' ? (readingBelumTersedia ? submit : nextSectionStructure) : submit
  const title = step === 'listening' ? 'Section 1: Listening' : step === 'structure' ? 'Section 2: Structure' : 'Section 3: Reading'
  const bagianStructure = step === 'structure'
    ? question.nomor_soal <= 15
      ? 'Structure (Questions 1–15)'
      : 'Written Expression (Questions 16–40)'
    : null
  const subtitle = isReading
    ? (question.passage_title || 'Reading Comprehension')
    : step === 'listening'
      ? listeningPart(question)
      : (bagianStructure || question.part || title)
  const originalOptions: Array<{ answerKey: OptionKey; text: string }> = [
    { answerKey: 'A', text: question.pilihan_a },
    { answerKey: 'B', text: question.pilihan_b },
    { answerKey: 'C', text: question.pilihan_c },
    { answerKey: 'D', text: question.pilihan_d },
  ]
  const options = originalOptions.map((option) => ({ ...option, displayKey: option.answerKey }))
  const writtenExpressionOptions: Array<[OptionKey, string]> = options.map(({ displayKey, text }) => [displayKey, text])

  const selectAnswer = (answer: string) => {
    if (step === 'listening') setAnswersListening((old) => ({ ...old, [question.id]: answer }))
    else if (step === 'structure') setAnswersStructure((old) => ({ ...old, [question.id]: answer }))
    else setAnswersReading((old) => ({ ...old, [question.id]: answer }))
  }

  const next = () => {
    if (navigationLockedRef.current) return
    navigationLockedRef.current = true
    setNavigating(true)
    window.setTimeout(() => {
      navigationLockedRef.current = false
      setNavigating(false)
    }, 450)

    setAudioError('')
    if (step === 'listening' && !answersListening[question.id]) {
      setAnswersListening((old) => ({ ...old, [question.id]: 'X' }))
    }

    if (!isLast) {
      const nextIndex = index + 1
      if (step === 'listening') {
        const nextPart = listeningPart(listening[nextIndex])
        const nextGroup = LISTENING_GROUPS[listening[nextIndex].nomor_soal]
        setListeningGroup(nextGroup || null)
        if (nextPart !== listeningPart(question)) {
          setDirectionAudioFinished(false)
          setListeningDirection(nextPart)
        }
      }
      return setIndex(nextIndex)
    }
    if (step === 'listening') return nextSectionListening()
    if (step === 'structure') return readingBelumTersedia ? submit() : nextSectionStructure()
    submit()
  }

  const audioSelesai = () => {
    next()
  }

  const completeListeningDirection = () => {
    if (!listeningDirection) return
    setHeardListeningDirections((current) => (
      current.includes(listeningDirection) ? current : [...current, listeningDirection]
    ))
    setAudioError('')
    setListeningDirection(null)
  }

  const completeListeningGroup = () => {
    if (!listeningGroup) return
    setHeardListeningGroups((current) => (
      current.includes(listeningGroup.firstQuestion)
        ? current
        : [...current, listeningGroup.firstQuestion]
    ))
    setAudioError('')
    setListeningGroup(null)
  }

  const retryCurrentAudio = () => {
    setAudioError('')
    if (listeningDirection) setDirectionAudioFinished(false)
    setAudioRetryToken((current) => current + 1)
  }

  return (
    <main style={{ ...testPage, maxWidth: isReading ? 900 : 700 }}>
      {antiCheatWarning && (
        <div style={antiCheatOverlay} role="alertdialog" aria-modal="true" aria-labelledby="anti-cheat-title">
          <div style={antiCheatDialog}>
            <div style={warningIcon}>!</div>
            <h2 id="anti-cheat-title" style={{ margin: 0, color: '#991b1b' }}>Peringatan Pelanggaran 1 dari 2</h2>
            <p style={{ margin: 0, lineHeight: 1.6 }}><strong>Terdeteksi:</strong> {antiCheatWarning.label}.</p>
            <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>Kembali ke tes dalam mode fullscreen. Jika terjadi satu pelanggaran lagi, tes akan dihentikan dan hasil dikirim otomatis.</p>
            <button type="button" onClick={() => { void resumeAfterWarning() }} style={{ ...purpleButton(false), width: '100%' }}>
              Kembali ke Tes dalam Fullscreen
            </button>
          </div>
        </div>
      )}
      <div style={testBanner}>
        <img src="/logo-unpas.png" alt="Logo UNPAS" style={{ width: 56, height: 56, objectFit: 'contain', background: '#fff', borderRadius: 10, padding: 4 }} />
        <div>
          <strong style={{ display: 'block', fontSize: 16 }}>English Proficiency Test</strong>
          <span style={{ fontSize: 13, opacity: 0.9 }}>Laboratorium Prodi Sastra Inggris UNPAS · {packageName}</span>
        </div>
        <span style={antiCheatBadge}>Anti-cheating aktif · {violationCount}/2</span>
      </div>
      {pageMessage && <p role="alert" style={errorNotice}>{pageMessage}</p>}
      <div style={topBar}>
        <div><h3 style={{ margin: 0, color: '#4c1d95' }}>{title}</h3><span>{subtitle}</span></div>
        <div style={{ textAlign: 'right' }}>
          <Timer key={step} deadline={sectionDeadline} onTimeUp={timeUp} />
          <small style={{ display: 'block', marginTop: 4, color: saveState === 'pending' ? '#b45309' : '#6b7280' }}>
            {saveState === 'saving' ? 'Menyimpan...' : saveState === 'pending' ? 'Autosave tertunda — mencoba lagi' : saveState === 'saved' ? 'Jawaban tersimpan' : 'Autosave aktif'}
          </small>
        </div>
      </div>
      {step === 'listening' && listeningDirection ? (
        <section style={directionCard}>
          <div style={{ textAlign: 'center' }}>
            <span style={directionBadge}>{listeningDirection}</span>
            <h2 style={{ margin: '14px 0 6px', color: '#4c1d95' }}>{LISTENING_DIRECTIONS[listeningDirection].title}</h2>
            <p style={{ marginTop: 0, color: '#6b7280' }}>Listen to the directions and read along.</p>
          </div>
          <ReliableAudio
            key={`direction:${packageCode}:${listeningDirection}:${audioRetryToken}`}
            label={`Directions ${listeningDirection}`}
            sources={audioSources(LISTENING_DIRECTIONS[listeningDirection].audio, packageCode)}
            onEnded={() => setDirectionAudioFinished(true)}
            onReady={() => setAudioError('')}
            onAllSourcesFailed={() => {
              setDirectionAudioFinished(true)
              setAudioError('Audio directions belum dapat dimuat. Baca petunjuk di bawah, lalu coba lagi atau lanjutkan dengan pengawasan administrator.')
            }}
          />
          <div style={directionText}>{listeningDirectionText(listeningDirection, packageCode)}</div>
          {audioError && (
            <button type="button" onClick={retryCurrentAudio} style={{ ...grayButton(false), width: '100%', marginTop: 12 }}>
              Coba Muat Ulang Audio
            </button>
          )}
          <button
            type="button"
            disabled={!directionAudioFinished}
            onClick={completeListeningDirection}
            style={{ ...purpleButton(!directionAudioFinished), width: '100%', marginTop: 24 }}
          >
            {directionAudioFinished ? `Mulai ${listeningDirection}` : 'Dengarkan audio sampai selesai...'}
          </button>
        </section>
      ) : step === 'listening' && listeningGroup ? (
        <section style={directionCard}>
          <div style={{ textAlign: 'center' }}>
            <span style={directionBadge}>{listeningPart(question)}</span>
            <h2 style={{ margin: '14px 0 6px', color: '#4c1d95' }}>{listeningGroup.title}</h2>
            <p style={{ margin: '0 0 18px', color: '#6b7280' }}>
              Dengarkan audio berikut sebelum mengerjakan soal {listeningGroup.firstQuestion}–{listeningGroup.lastQuestion}.
            </p>
          </div>
          <ReliableAudio
            key={`group:${packageCode}:${listeningGroup.firstQuestion}:${audioRetryToken}`}
            label={`Audio soal ${listeningGroup.firstQuestion} sampai ${listeningGroup.lastQuestion}`}
            sources={audioSources(listeningGroup.audio, packageCode)}
            onEnded={completeListeningGroup}
            onReady={() => setAudioError('')}
            onAllSourcesFailed={() => setAudioError('Semua sumber audio percakapan gagal dimuat. Periksa koneksi lalu klik Coba Muat Ulang Audio.')}
          />
          {audioError && (
            <button type="button" onClick={retryCurrentAudio} style={{ ...grayButton(false), width: '100%', marginTop: 12 }}>
              Coba Muat Ulang Audio
            </button>
          )}
          <p style={{ margin: '14px 0 0', textAlign: 'center', color: '#5b21b6', fontWeight: 700 }}>
            Setelah audio selesai, halaman soal {listeningGroup.firstQuestion} akan terbuka otomatis.
          </p>
        </section>
      ) : step === 'listening' && (
        <ReliableAudio
          key={`question:${packageCode}:${question.id}:${audioRetryToken}`}
          label={`Audio soal Listening nomor ${question.nomor_soal}`}
          sources={audioSources(`/audio/listening/no-${question.nomor_soal}.mp3`, packageCode, question.audio_url)}
          onEnded={audioSelesai}
          onReady={() => setAudioError('')}
          onAllSourcesFailed={() => setAudioError('Semua sumber audio soal gagal dimuat. Klik Coba Muat Ulang Audio atau minta bantuan pengawas.')}
        />
      )}
      {audioError && <p role="alert" style={errorNotice}>{audioError}</p>}
      {audioError && step === 'listening' && !listeningDirection && !listeningGroup && (
        <button type="button" onClick={retryCurrentAudio} style={{ ...grayButton(false), width: '100%', marginBottom: 16 }}>
          Coba Muat Ulang Audio
        </button>
      )}
      {!listeningDirection && !listeningGroup && <div style={isReading ? readingLayout : undefined}>
        {isReading && <div style={box}><h4>{question.passage_title}</h4><ReadingPassage title={question.passage_title} text={question.passage_text} /></div>}
        <div style={isReading ? readingQuestionPanel : undefined}>
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
                <WrittenExpressionQuestion text={question.pertanyaan || ''} options={writtenExpressionOptions} />
              </>
            ) : <p>{question.pertanyaan}</p>}
          </div>
          <div style={optionList}>{options.map(({ displayKey, answerKey, text }) => (
            <button
              key={answerKey}
              type="button"
              onClick={() => selectAnswer(answerKey)}
              style={optionButton(answers[question.id] === answerKey)}
            >
              ({displayKey}) {text}
            </button>
          ))}</div>
        </div>
      </div>}
      {!listeningDirection && !listeningGroup && step === 'listening' && !answers[question.id] && (
        <p style={{ margin: '0 0 10px', color: '#6b7280', fontSize: 13, textAlign: 'right' }}>
          Jika tidak menjawab, klik Selanjutnya untuk melewati soal ini.
        </p>
      )}
      {!listeningDirection && !listeningGroup && <div style={navigation}>
        <button
          type="button"
          onClick={() => setIndex((old) => Math.max(0, old - 1))}
          disabled={index === 0 || step === 'listening'}
          style={grayButton(index === 0 || step === 'listening')}
        >
          {step === 'listening' ? 'Tidak dapat kembali' : 'Sebelumnya'}
        </button>
        <button
          type="button"
          onClick={next}
          disabled={loading || navigating || (step !== 'listening' && !answers[question.id])}
          style={purpleButton(loading || navigating || (step !== 'listening' && !answers[question.id]))}
        >
          {loading ? 'Menyimpan...' : navigating ? 'Memproses...' : isLast ? (isReading || readingBelumTersedia ? 'Selesaikan Uji Coba' : 'Lanjut Section Berikutnya') : 'Selanjutnya'}
        </button>
      </div>}
    </main>
  )
}

const centerPage: CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#f5f3ff', fontFamily: 'system-ui, sans-serif' }
const landingPage: CSSProperties = { minHeight: '100vh', padding: '32px 20px 56px', background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 70%)', color: '#1f2937', fontFamily: 'system-ui, sans-serif' }
const landingHero: CSSProperties = { width: '100%', maxWidth: 860, margin: '0 auto', textAlign: 'center' }
const landingLogoFrame: CSSProperties = { height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }
const landingTitle: CSSProperties = { margin: '6px 0 4px', color: '#4c1d95', fontSize: 'clamp(30px, 5vw, 48px)', lineHeight: 1.15 }
const landingSubtitle: CSSProperties = { margin: 0, color: '#6d28d9', fontSize: 'clamp(16px, 2.5vw, 20px)', fontWeight: 700 }
const testSummaryGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, margin: '28px 0 16px' }
const summaryItem: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, padding: 16, border: '1px solid #ddd6fe', borderRadius: 12, background: '#fff', boxShadow: '0 6px 20px -16px rgba(76,29,149,.6)' }
const rulesPanel: CSSProperties = { maxWidth: 660, margin: '0 auto 24px', padding: 18, borderRadius: 12, background: '#fffbeb', border: '1px solid #fbbf24', color: '#78350f', textAlign: 'left' }
const resumeCard: CSSProperties = { maxWidth: 660, margin: '0 auto 20px', padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderRadius: 12, background: '#ecfdf5', border: '1px solid #6ee7b7', textAlign: 'left' }
const errorNotice: CSSProperties = { margin: '12px auto', padding: 12, maxWidth: 660, borderRadius: 9, border: '1px solid #fca5a5', background: '#fef2f2', color: '#991b1b', fontWeight: 600, lineHeight: 1.5 }
const accessCard: CSSProperties = { maxWidth: 520, margin: '0 auto', padding: 28, borderRadius: 16, borderTop: '6px solid #7c3aed', background: '#fff', boxShadow: '0 18px 40px -20px rgba(76,29,149,.45)', textAlign: 'left' }
const accessTab: CSSProperties = { display: 'inline-block', padding: '7px 14px', borderRadius: 999, background: '#ede9fe', color: '#5b21b6', fontSize: 13, fontWeight: 800 }
const testPage: CSSProperties = { minHeight: '100vh', margin: '0 auto', padding: 20, background: '#fff', color: '#1f2937', fontFamily: 'system-ui, sans-serif' }
const card: CSSProperties = { width: '100%', maxWidth: 520, padding: 32, borderRadius: 16, borderTop: '6px solid #7c3aed', background: '#fff', boxShadow: '0 10px 25px -5px rgba(124,58,237,.15)' }
const logoFrame: CSSProperties = { height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: '0 auto 8px' }
const form: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 15 }
const fieldLabel: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 7, color: '#4c1d95', fontSize: 14, fontWeight: 700 }
const input: CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 12, border: '1px solid #ddd6fe', borderRadius: 8, color: '#111827', fontSize: 15, fontWeight: 400 }
const antiCheatNotice: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5, padding: 12, border: '1px solid #f59e0b', borderRadius: 8, background: '#fffbeb', color: '#78350f', fontSize: 13, lineHeight: 1.5 }
const testBanner: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', color: '#fff', boxShadow: '0 8px 18px -10px rgba(76,29,149,.7)', flexWrap: 'wrap' }
const antiCheatBadge: CSSProperties = { marginLeft: 'auto', padding: '5px 9px', borderRadius: 999, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.35)', color: '#fff', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }
const antiCheatOverlay: CSSProperties = { position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(17,24,39,.86)' }
const antiCheatDialog: CSSProperties = { width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 18, padding: 28, borderRadius: 16, borderTop: '7px solid #dc2626', background: '#fff', color: '#1f2937', boxShadow: '0 24px 60px rgba(0,0,0,.35)', textAlign: 'center' }
const warningIcon: CSSProperties = { width: 54, height: 54, display: 'grid', placeItems: 'center', alignSelf: 'center', borderRadius: '50%', background: '#fee2e2', color: '#b91c1c', fontSize: 32, fontWeight: 900 }
const topBar: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 20, paddingBottom: 10, marginBottom: 20, borderBottom: '2px solid #f3e8ff' }
const box: CSSProperties = { padding: 15, borderRadius: 8, background: '#faf5ff', color: '#1f2937', marginBottom: 20 }
const directionCard: CSSProperties = { padding: 24, border: '1px solid #ddd6fe', borderRadius: 14, background: '#faf5ff', boxShadow: '0 8px 20px -14px rgba(76,29,149,.55)' }
const directionBadge: CSSProperties = { display: 'inline-block', padding: '6px 14px', borderRadius: 999, background: '#7c3aed', color: '#fff', fontWeight: 800, letterSpacing: 1 }
const directionText: CSSProperties = { maxHeight: 430, overflowY: 'auto', padding: 18, borderRadius: 10, background: '#fff', border: '1px solid #ede9fe', whiteSpace: 'pre-line', lineHeight: 1.75, color: '#1f2937' }
const readingLayout: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 20 }
const readingQuestionPanel: CSSProperties = { padding: 18, border: '1px solid #ddd6fe', borderRadius: 10, background: '#fff' }
const optionList: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, margin: '20px 0' }
const navigation: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10 }
const optionButton = (active: boolean): CSSProperties => ({ padding: 12, textAlign: 'left', borderRadius: 8, border: active ? '2px solid #7c3aed' : '1px solid #ddd6fe', background: active ? '#f3e8ff' : '#fff', color: '#111827', cursor: 'pointer' })
const purpleButton = (disabled: boolean): CSSProperties => ({ padding: '10px 20px', border: 'none', borderRadius: 6, background: '#7c3aed', color: '#fff', fontWeight: 'bold', opacity: disabled ? .5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' })
const grayButton = (disabled: boolean): CSSProperties => ({ padding: '10px 20px', border: 'none', borderRadius: 6, background: '#e5e7eb', color: '#111827', fontWeight: 'bold', opacity: disabled ? .5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' })
