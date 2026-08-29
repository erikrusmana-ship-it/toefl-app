export const VIOLATION_LABELS = {
  TAB_HIDDEN: 'Membuka tab lain atau meminimalkan browser',
  WINDOW_BLUR: 'Membuka jendela atau aplikasi lain',
  FULLSCREEN_EXIT: 'Keluar dari mode fullscreen',
} as const

export type ViolationType = keyof typeof VIOLATION_LABELS
export type AntiCheatSection = 'listening' | 'structure' | 'reading'

export type AntiCheatViolation = {
  type: ViolationType
  label: string
  occurredAt: string
  section: AntiCheatSection
}

const VIOLATION_PRIORITY: ViolationType[] = [
  'TAB_HIDDEN',
  'WINDOW_BLUR',
  'FULLSCREEN_EXIT',
]

const TEST_SECTIONS = new Set<AntiCheatSection>([
  'listening',
  'structure',
  'reading',
])

/**
 * Satu perpindahan tab/aplikasi dapat memicu visibilitychange, blur, dan
 * fullscreenchange hampir bersamaan. Pilih sinyal yang paling menjelaskan
 * tindakan peserta agar satu kejadian tidak memiliki label acak.
 */
export function classifyViolationIncident(
  signals: Iterable<ViolationType>
): ViolationType | null {
  const received = new Set(signals)
  return VIOLATION_PRIORITY.find((type) => received.has(type)) || null
}

/**
 * Normalisasi dipakai oleh client saat resume dan oleh API saat submit.
 * Label selalu dibuat oleh server dari type, bukan dipercaya dari payload.
 */
export function normalizeAntiCheatViolations(
  value: unknown,
  maximum = 10
): AntiCheatViolation[] | null {
  if (!Array.isArray(value) || value.length > maximum) return null

  const normalized: AntiCheatViolation[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null

    const row = item as Record<string, unknown>
    const type = row.type
    const section = row.section
    const occurredAt = row.occurredAt

    if (typeof type !== 'string' || !(type in VIOLATION_LABELS)) return null
    if (typeof section !== 'string' || !TEST_SECTIONS.has(section as AntiCheatSection)) return null
    if (typeof occurredAt !== 'string' || occurredAt.length > 64) return null

    const occurredAtMs = Date.parse(occurredAt)
    if (!Number.isFinite(occurredAtMs)) return null

    const violationType = type as ViolationType
    normalized.push({
      type: violationType,
      label: VIOLATION_LABELS[violationType],
      occurredAt: new Date(occurredAtMs).toISOString(),
      section: section as AntiCheatSection,
    })
  }

  return normalized
}
