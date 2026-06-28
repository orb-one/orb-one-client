import type { RegisterRequest } from '@/lib/api/auth'

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
      request: RegisterRequest
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

function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === 'string' ? value : ''
}

// Spring @Email과 완전 동일한 파서는 아니며 명백한 형식 오류의 1차 필터
function isEmailFormat(value: string) {
  return /^[\w.!#$%&'*+/=?^`{|}~-]+@[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)*$/i.test(
    value,
  )
}
