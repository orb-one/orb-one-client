import { expect, it } from 'vitest'

import { parseApiErrorResponse } from '@/lib/api/errors'

it('parses recognized API error responses', () => {
  const response = {
    code: 'DUPLICATE_EMAIL',
    message: '이미 가입된 이메일입니다.',
    timestamp: '2026-07-12T00:00:00Z',
  }

  expect(parseApiErrorResponse(response)).toEqual(response)
})

it.each([
  null,
  { code: 'FUTURE_ERROR', message: 'Future error', timestamp: 'now' },
  { code: 'UNAUTHENTICATED', message: 401, timestamp: 'now' },
  { code: 'UNAUTHENTICATED', message: 'Unauthorized' },
])('rejects malformed or unrecognized API error responses', (response) => {
  expect(parseApiErrorResponse(response)).toBeNull()
})
