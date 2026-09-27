import { expect, it } from 'vitest'

import {
  NICKNAME_MAX_LENGTH,
  validateProfileForm,
} from '@/lib/auth/profile-validation'

it('trims and accepts a valid nickname', () => {
  expect(validateProfileForm(createFormData('  new-nickname  '))).toEqual({
    ok: true,
    request: { nickname: 'new-nickname' },
  })
})

it('rejects an empty nickname', () => {
  expect(validateProfileForm(createFormData('   '))).toEqual({
    ok: false,
    error: 'nicknameRequired',
  })
})

it('rejects a nickname longer than the server limit', () => {
  expect(
    validateProfileForm(createFormData('a'.repeat(NICKNAME_MAX_LENGTH + 1))),
  ).toEqual({
    ok: false,
    error: 'nicknameTooLong',
  })
})

function createFormData(nickname: string) {
  const formData = new FormData()
  formData.set('nickname', nickname)

  return formData
}
