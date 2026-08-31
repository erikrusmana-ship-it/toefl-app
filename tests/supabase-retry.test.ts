import assert from 'node:assert/strict'
import test from 'node:test'

import { createSupabaseRetryFetch } from '../lib/supabase-retry.ts'

const futureJwtResponse = () =>
  Response.json(
    {
      code: 'PGRST303',
      message: 'JWT issued at future',
    },
    {
      status: 401,
    }
  )

test(
  'retries PGRST303 twice and returns the recovered response',
  async () => {
    let attempts = 0
    const delays: number[] = []

    const retryFetch =
      createSupabaseRetryFetch(
        async () => {
          attempts += 1

          if (attempts < 3) {
            return futureJwtResponse()
          }

          return Response.json({
            valid: true,
          })
        },
        async (milliseconds) => {
          delays.push(milliseconds)
        }
      )

    const response = await retryFetch(
      'https://example.test/rest/v1/rpc'
    )

    assert.equal(response.status, 200)
    assert.equal(attempts, 3)
    assert.deepEqual(
      delays,
      [100, 300]
    )
  }
)

test(
  'does not retry a different Supabase error',
  async () => {
    let attempts = 0

    const retryFetch =
      createSupabaseRetryFetch(
        async () => {
          attempts += 1

          return Response.json(
            {
              code: '23505',
              message:
                'duplicate key value',
            },
            {
              status: 409,
            }
          )
        },
        async () => {
          throw new Error(
            'Tidak boleh menunggu.'
          )
        }
      )

    const response = await retryFetch(
      'https://example.test/rest/v1/data'
    )

    assert.equal(response.status, 409)
    assert.equal(attempts, 1)
  }
)

test(
  'clones a POST Request so its body is available on retry',
  async () => {
    const receivedBodies: string[] = []

    const retryFetch =
      createSupabaseRetryFetch(
        async (input) => {
          const request =
            input instanceof Request
              ? input
              : new Request(input)

          receivedBodies.push(
            await request.text()
          )

          return receivedBodies.length === 1
            ? futureJwtResponse()
            : Response.json({
                success: true,
              })
        },
        async () => undefined
      )

    const request = new Request(
      'https://example.test/rest/v1/rpc',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          participantId: 42,
        }),
      }
    )

    const response =
      await retryFetch(request)

    assert.equal(response.status, 200)
    assert.deepEqual(
      receivedBodies,
      [
        '{"participantId":42}',
        '{"participantId":42}',
      ]
    )
  }
)
