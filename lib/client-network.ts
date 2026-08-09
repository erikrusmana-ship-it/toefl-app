export class RequestTimeoutError extends Error {
  constructor(message = 'Permintaan melewati batas waktu.') {
    super(message)
    this.name = 'RequestTimeoutError'
  }
}

type RetryOptions = {
  attempts?: number
  timeoutMs?: number
  baseDelayMs?: number
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: RetryOptions = {}
) {
  const attempts = Math.max(1, options.attempts ?? 2)
  const timeoutMs = options.timeoutMs ?? 12_000
  const baseDelayMs = options.baseDelayMs ?? 500
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(input, { ...init, signal: controller.signal })
      if (response.ok || response.status < 500 || attempt === attempts) return response
      lastError = new Error(`Server merespons ${response.status}.`)
    } catch (error) {
      lastError = error
      if (attempt === attempts) {
        if (error instanceof DOMException && error.name === 'AbortError') throw new RequestTimeoutError()
        throw error
      }
    } finally {
      window.clearTimeout(timeout)
    }

    await new Promise((resolve) => window.setTimeout(resolve, baseDelayMs * attempt))
  }

  throw lastError instanceof Error ? lastError : new Error('Permintaan gagal.')
}
