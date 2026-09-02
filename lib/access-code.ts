import { createHash } from 'crypto'

export function normalizeAccessCode(value: string): string {
  return value.trim().toUpperCase()
}

export function hashAccessCode(value: string): string {
  const normalized = normalizeAccessCode(value)

  return createHash('sha256')
    .update(normalized, 'utf8')
    .digest('hex')
}