import { expect, it } from 'vitest'

import { isRateLimitError, parseApiErrorResponse } from '@/lib/api/errors'

it.each(['DUPLICATE_EMAIL', 'USER_OWNS_GROUP'] as const)(
  'parses the recognized %s API error response',
  (code) => {
    const response = {
      code,
      message: 'API error',
      timestamp: '2026-07-12T00:00:00Z',
    }

    expect(parseApiErrorResponse(response)).toEqual(response)
  },
)

it.each([
  null,
  { code: 'FUTURE_ERROR', message: 'Future error', timestamp: 'now' },
  { code: 'UNAUTHENTICATED', message: 401, timestamp: 'now' },
  { code: 'UNAUTHENTICATED', message: 'Unauthorized' },
])('rejects malformed or unrecognized API error responses', (response) => {
  expect(parseApiErrorResponse(response)).toBeNull()
})

it('recognizes rate limit errors by HTTP status or API error code', () => {
  expect(isRateLimitError({ status: 429 })).toBe(true)
  expect(isRateLimitError({ code: 'RATE_LIMITED' })).toBe(true)
  expect(isRateLimitError({ status: 500, code: 'INTERNAL_SERVER_ERROR' })).toBe(
    false,
  )
  expect(isRateLimitError(new Error('Network error'))).toBe(false)
})
