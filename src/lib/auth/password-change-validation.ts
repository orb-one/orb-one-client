import type { PasswordChangeRequest } from '@/lib/api/auth'
import { getStringFormValue } from '@/lib/auth/form-validation'

export const PASSWORD_CHANGE_MIN_LENGTH = 8

export type PasswordChangeField =
  | 'currentPassword'
  | 'newPassword'
  | 'newPasswordConfirm'

export type PasswordChangeFormError =
  | 'currentPasswordRequired'
  | 'newPasswordRequired'
  | 'newPasswordTooShort'
  | 'newPasswordConfirmRequired'
  | 'passwordMismatch'

export type PasswordChangeFormValidationResult =
  | {
      ok: true
      request: PasswordChangeRequest
    }
  | {
      ok: false
      error: PasswordChangeFormError
      field: PasswordChangeField
    }

/** 서버 PasswordChangeRequest의 @NotBlank, @Size(min = 8) 계약을 검증합니다. */
export function validatePasswordChangeForm(
  formData: FormData,
): PasswordChangeFormValidationResult {
  const currentPassword = getStringFormValue(formData, 'currentPassword')
  const newPassword = getStringFormValue(formData, 'newPassword')
  const newPasswordConfirm = getStringFormValue(formData, 'newPasswordConfirm')

  if (currentPassword.trim().length === 0) {
    return {
      ok: false,
      error: 'currentPasswordRequired',
      field: 'currentPassword',
    }
  }

  if (newPassword.trim().length === 0) {
    return {
      ok: false,
      error: 'newPasswordRequired',
      field: 'newPassword',
    }
  }

  if (newPassword.length < PASSWORD_CHANGE_MIN_LENGTH) {
    return {
      ok: false,
      error: 'newPasswordTooShort',
      field: 'newPassword',
    }
  }

  if (newPasswordConfirm.trim().length === 0) {
    return {
      ok: false,
      error: 'newPasswordConfirmRequired',
      field: 'newPasswordConfirm',
    }
  }

  if (newPassword !== newPasswordConfirm) {
    return {
      ok: false,
      error: 'passwordMismatch',
      field: 'newPasswordConfirm',
    }
  }

  return {
    ok: true,
    request: { currentPassword, newPassword },
  }
}
