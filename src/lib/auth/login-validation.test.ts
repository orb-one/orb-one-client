import { expect, it } from 'vitest'

import { validateLoginForm } from '@/lib/auth/login-validation'

it('returns normalized login request values', () => {
  const result = validateLoginForm(
    createLoginFormData({
      email: ' user@example.com ',
      password: 'password123!',
    }),
  )

  expect(result).toEqual({
    ok: true,
    request: {
      email: 'user@example.com',
      password: 'password123!',
    },
  })
})

it('rejects blank emails', () => {
  const result = validateLoginForm(
    createLoginFormData({
      email: '   ',
    }),
  )

  expect(result).toEqual({
    ok: false,
    error: 'emailRequired',
  })
})

it('rejects invalid email formats', () => {
  const result = validateLoginForm(
    createLoginFormData({
      email: 'user.example.com',
    }),
  )

  expect(result).toEqual({
    ok: false,
    error: 'emailInvalid',
  })
})

it('rejects blank passwords', () => {
  const result = validateLoginForm(
    createLoginFormData({
      password: '   ',
    }),
  )

  expect(result).toEqual({
    ok: false,
    error: 'passwordRequired',
  })
})

function createLoginFormData(overrides: Partial<Record<string, string>> = {}) {
  const formData = new FormData()
  const values = {
    email: 'user@example.com',
    password: 'password123!',
    ...overrides,
  }

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value)
  }

  return formData
}
