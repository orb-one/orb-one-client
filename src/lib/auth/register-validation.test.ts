import { expect, it } from 'vitest'

import { validateRegisterForm } from '@/lib/auth/register-validation'

it('returns normalized register request values', () => {
  const result = validateRegisterForm(
    createRegisterFormData({
      email: ' user@example.com ',
      nickname: ' orbone-user ',
      password: 'password123!',
      passwordConfirm: 'password123!',
    }),
  )

  expect(result).toEqual({
    ok: true,
    request: {
      email: 'user@example.com',
      nickname: 'orbone-user',
      password: 'password123!',
    },
  })
})

it('rejects blank emails', () => {
  const result = validateRegisterForm(
    createRegisterFormData({
      email: '   ',
    }),
  )

  expect(result).toEqual({
    ok: false,
    error: 'emailRequired',
  })
})

it('rejects invalid email formats', () => {
  const result = validateRegisterForm(
    createRegisterFormData({
      email: 'user.example.com',
    }),
  )

  expect(result).toEqual({
    ok: false,
    error: 'emailInvalid',
  })
})

it('rejects blank nicknames', () => {
  const result = validateRegisterForm(
    createRegisterFormData({
      nickname: '   ',
    }),
  )

  expect(result).toEqual({
    ok: false,
    error: 'nicknameRequired',
  })
})

it('rejects blank passwords', () => {
  const result = validateRegisterForm(
    createRegisterFormData({
      password: '   ',
      passwordConfirm: '   ',
    }),
  )

  expect(result).toEqual({
    ok: false,
    error: 'passwordRequired',
  })
})

it('rejects short passwords', () => {
  const result = validateRegisterForm(
    createRegisterFormData({
      password: 'short12',
      passwordConfirm: 'short12',
    }),
  )

  expect(result).toEqual({
    ok: false,
    error: 'passwordTooShort',
  })
})

it('rejects mismatched passwords', () => {
  const result = validateRegisterForm(
    createRegisterFormData({
      password: 'password123!',
      passwordConfirm: 'different123!',
    }),
  )

  expect(result).toEqual({
    ok: false,
    error: 'passwordMismatch',
  })
})

function createRegisterFormData(
  overrides: Partial<Record<string, string>> = {},
) {
  const formData = new FormData()
  const values = {
    email: 'user@example.com',
    nickname: 'orbone-user',
    password: 'password123!',
    passwordConfirm: 'password123!',
    ...overrides,
  }

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value)
  }

  return formData
}
