import { expect, it } from 'vitest'

import { ApiError } from '@/lib/api/client'
import { getAuthErrorMessage } from '@/lib/auth/auth-errors'

it('uses the server message for the default Korean locale', () => {
  const error = createApiError(
    {
      code: 'INVALID_CREDENTIALS',
      message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      timestamp: '2026-07-12T00:00:00Z',
    },
    '이메일 또는 비밀번호가 올바르지 않습니다.',
  )

  expect(getAuthErrorMessage(error, 'ko', '일반 오류')).toBe(
    '이메일 또는 비밀번호가 올바르지 않습니다.',
  )
})

it('maps recognized server codes for non-default locales', () => {
  const error = createApiError({
    code: 'INVALID_CREDENTIALS',
    message: '이메일 또는 비밀번호가 올바르지 않습니다.',
    timestamp: '2026-07-12T00:00:00Z',
  })

  expect(getAuthErrorMessage(error, 'en', 'Fallback.')).toBe(
    'The email or password is incorrect.',
  )
})

it('does not expose a Korean server message for unrecognized codes in other locales', () => {
  const error = createApiError(
    {
      code: 'FUTURE_ERROR',
      message: '새로운 서버 오류입니다.',
      timestamp: '2026-07-12T00:00:00Z',
    },
    '새로운 서버 오류입니다.',
  )

  expect(getAuthErrorMessage(error, 'en', 'Fallback.')).toBe('Fallback.')
})

it('uses the fallback for non-API errors and empty default messages', () => {
  expect(
    getAuthErrorMessage(new Error('Network error'), 'en', 'Fallback.'),
  ).toBe('Fallback.')
  expect(
    getAuthErrorMessage(createApiError(undefined, ''), 'ko', 'Fallback.'),
  ).toBe('Fallback.')
})

function createApiError(body: unknown, message = 'Server error.') {
  return new ApiError(message, 400, new Response(null, { status: 400 }), body)
}
