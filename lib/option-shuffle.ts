export type OptionKey = 'A' | 'B' | 'C' | 'D'

export type StoredOption = {
  answerKey: OptionKey
  text: string
}

export type DisplayOption = StoredOption & {
  displayKey: OptionKey
}

const DISPLAY_KEYS: OptionKey[] = ['A', 'B', 'C', 'D']

function hashSeed(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Mengacak posisi pilihan secara deterministik berdasarkan peserta dan soal.
 * answerKey tetap merupakan posisi asli untuk penilaian di server, sedangkan
 * displayKey adalah huruf yang dilihat peserta.
 */
export function buildShuffledOptions(
  participantId: number,
  questionId: number,
  options: StoredOption[]
): DisplayOption[] {
  const shuffled = options.map((option) => ({ ...option }))
  const random = seededRandom(hashSeed(`unpas-ept:${participantId}:${questionId}`))

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }

  return shuffled.map((option, index) => ({
    ...option,
    displayKey: DISPLAY_KEYS[index],
  }))
}
