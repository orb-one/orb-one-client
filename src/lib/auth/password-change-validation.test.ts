import { expect, it } from 'vitest'

import {
  PASSWORD_CHANGE_MIN_LENGTH,
  validatePasswordChangeForm,
} from '@/lib/auth/password-change-validation'

it('accepts valid password change values without including confirmation', () => {
  expect(
    validatePasswordChangeForm(
      createFormData({
        currentPassword: 'old-password123!',
        newPassword: 'new-password123!',
        newPasswordConfirm: 'new-password123!',
      }),
    ),
  ).toEqual({
    ok: true,
    request: {
      currentPassword: 'old-password123!',
      newPassword: 'new-password123!',
    },
  })
})

it.each([
  {
    name: 'current password',
    values: { currentPassword: '   ' },
    error: 'currentPasswordRequired',
    field: 'currentPassword',
  },
  {
    name: 'new password',
    values: { newPassword: '   ' },
    error: 'newPasswordRequired',
    field: 'newPassword',
  },
  {
    name: 'new password confirmation',
    values: { newPasswordConfirm: '   ' },
    error: 'newPasswordConfirmRequired',
    field: 'newPasswordConfirm',
  },
] as const)('rejects a missing $name', ({ values, error, field }) => {
  expect(validatePasswordChangeForm(createFormData(values))).toEqual({
    ok: false,
    error,
    field,
  })
})

it('rejects a new password shorter than the server limit', () => {
  const newPassword = 'a'.repeat(PASSWORD_CHANGE_MIN_LENGTH - 1)

  expect(
    validatePasswordChangeForm(
      createFormData({ newPassword, newPasswordConfirm: newPassword }),
    ),
  ).toEqual({
    ok: false,
    error: 'newPasswordTooShort',
    field: 'newPassword',
  })
})

it('rejects a mismatched password confirmation', () => {
  expect(
    validatePasswordChangeForm(
      createFormData({ newPasswordConfirm: 'different-password123!' }),
    ),
  ).toEqual({
    ok: false,
    error: 'passwordMismatch',
    field: 'newPasswordConfirm',
  })
})

function createFormData(overrides: Partial<Record<string, string>> = {}) {
  const formData = new FormData()
  formData.set(
    'currentPassword',
    overrides.currentPassword ?? 'old-password123!',
  )
  formData.set('newPassword', overrides.newPassword ?? 'new-password123!')
  formData.set(
    'newPasswordConfirm',
    overrides.newPasswordConfirm ?? 'new-password123!',
  )

  return formData
}
