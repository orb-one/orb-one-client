import type { RegisterCredentials } from '@/lib/api/auth'
import { getStringFormValue, isEmailFormat } from '@/lib/auth/form-validation'

export type RegisterFormError =
  | 'emailRequired'
  | 'emailInvalid'
  | 'nicknameRequired'
  | 'passwordRequired'
  | 'passwordTooShort'
  | 'passwordMismatch'

// server RegisterRequest @Size(min = 8)와 동일한 프론트 기준
export const REGISTER_PASSWORD_MIN_LENGTH = 8

export type RegisterFormValidationResult =
  | {
      ok: true
      request: RegisterCredentials
    }
  | {
      ok: false
      error: RegisterFormError
    }

// server RegisterRequest의 필수 형식 오류를 API 호출 전에 차단
export function validateRegisterForm(
  formData: FormData,
): RegisterFormValidationResult {
  const email = getStringFormValue(formData, 'email').trim()
  const nickname = getStringFormValue(formData, 'nickname').trim()
  const password = getStringFormValue(formData, 'password')
  const passwordConfirm = getStringFormValue(formData, 'passwordConfirm')

  if (email.length === 0) {
    return { ok: false, error: 'emailRequired' }
  }

  if (!isEmailFormat(email)) {
    return { ok: false, error: 'emailInvalid' }
  }

  if (nickname.length === 0) {
    return { ok: false, error: 'nicknameRequired' }
  }

  if (password.trim().length === 0) {
    return { ok: false, error: 'passwordRequired' }
  }

  if (password.length < REGISTER_PASSWORD_MIN_LENGTH) {
    return { ok: false, error: 'passwordTooShort' }
  }

  if (password !== passwordConfirm) {
    return { ok: false, error: 'passwordMismatch' }
  }

  return {
    ok: true,
    request: {
      email,
      password,
      nickname,
    },
  }
}
