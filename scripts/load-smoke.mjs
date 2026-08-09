const target = (process.env.LOAD_TARGET || 'http://127.0.0.1:3000').replace(/\/$/, '')
const concurrency = Math.max(1, Number(process.env.LOAD_CONCURRENCY || 25))
const rounds = Math.max(1, Number(process.env.LOAD_ROUNDS || 3))
const timeoutMs = Math.max(1000, Number(process.env.LOAD_TIMEOUT_MS || 10000))

const scenarios = [
  { path: '/', expected: 200 },
  { path: '/logo-unpas.png', expected: 200 },
  { path: '/api/test-session', expected: 200 },
]

const samples = []

async function request(scenario) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = performance.now()

  try {
    const response = await fetch(`${target}${scenario.path}`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'UNPAS-EPT-Load-Smoke/1.0' },
      signal: controller.signal,
    })
    await response.arrayBuffer()
    samples.push({
      path: scenario.path,
      durationMs: performance.now() - startedAt,
      ok: response.status === scenario.expected,
      status: response.status,
    })
  } catch (error) {
    samples.push({
      path: scenario.path,
      durationMs: performance.now() - startedAt,
      ok: false,
      status: error instanceof Error ? error.name : 'REQUEST_FAILED',
    })
  } finally {
    clearTimeout(timeout)
  }
}

for (let round = 0; round < rounds; round += 1) {
  await Promise.all(Array.from({ length: concurrency }, (_, worker) => (
    request(scenarios[(round * concurrency + worker) % scenarios.length])
  )))
}

const durations = samples.map((sample) => sample.durationMs).sort((a, b) => a - b)
const percentile = (value) => durations[Math.min(durations.length - 1, Math.floor(durations.length * value))] || 0
const failures = samples.filter((sample) => !sample.ok)
const report = {
  target,
  requests: samples.length,
  concurrency,
  failures: failures.length,
  errorRatePercent: Number(((failures.length / Math.max(1, samples.length)) * 100).toFixed(2)),
  latencyMs: {
    p50: Math.round(percentile(0.5)),
    p95: Math.round(percentile(0.95)),
    max: Math.round(durations.at(-1) || 0),
  },
  failedSamples: failures.slice(0, 10),
}

console.log(JSON.stringify(report, null, 2))

if (failures.length > 0 || percentile(0.95) > timeoutMs * 0.8) process.exitCode = 1
