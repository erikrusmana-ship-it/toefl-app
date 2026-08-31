type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

type Sleep = (
  milliseconds: number
) => Promise<void>

const RETRY_DELAYS_MS = [
  100,
  300,
] as const

async function sleep(
  milliseconds: number
) {
  await new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      )
    }
  )
}

async function isFutureJwtResponse(
  response: Response
) {
  if (response.ok) {
    return false
  }

  const payload = await response
    .clone()
    .json()
    .catch(() => null) as {
      code?: unknown
      message?: unknown
    } | null

  return (
    payload?.code === 'PGRST303' &&
    typeof payload.message === 'string' &&
    /JWT issued at future/i.test(
      payload.message
    )
  )
}

/**
 * Mengulangi request Supabase yang ditolak karena perbedaan waktu JWT.
 *
 * Retry sengaja dibatasi hanya untuk PGRST303 dengan pesan
 * "JWT issued at future". Penolakan ini terjadi sebelum query atau
 * mutation dijalankan, sehingga request aman dicoba kembali. Error
 * jaringan atau database lain dikembalikan tanpa retry agar tidak
 * berisiko menggandakan mutation.
 */
export function createSupabaseRetryFetch(
  baseFetch: FetchLike = fetch,
  wait: Sleep = sleep
): FetchLike {
  return async (
    input,
    init
  ) => {
    for (
      let attempt = 0;
      ;
      attempt += 1
    ) {
      const attemptInput =
        input instanceof Request
          ? input.clone()
          : input

      const response =
        await baseFetch(
          attemptInput,
          init
        )

      const shouldRetry =
        attempt <
          RETRY_DELAYS_MS.length &&
        await isFutureJwtResponse(
          response
        )

      if (!shouldRetry) {
        return response
      }

      console.warn(
        JSON.stringify({
          level: 'warning',
          message:
            'Mencoba ulang autentikasi Supabase yang belum sinkron.',
          code: 'PGRST303',
          attempt: attempt + 1,
        })
      )

      await wait(
        RETRY_DELAYS_MS[
          attempt
        ]
      )
    }
  }
}
