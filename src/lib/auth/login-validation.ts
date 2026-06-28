import type { LoginRequest } from '@/lib/api/auth'
import { getStringFormValue, isEmailFormat } from '@/lib/auth/form-validation'

export type LoginFormError =
  | 'emailRequired'
  | 'emailInvalid'
  | 'passwordRequired'

export type LoginFormValidationResult =
  | {
      ok: true
      request: LoginRequest
    }
  | {
      ok: false
      error: LoginFormError
    }

// server LoginRequest의 필수 형식 오류를 API 호출 전에 차단
export function validateLoginForm(
  formData: FormData,
): LoginFormValidationResult {
  const email = getStringFormValue(formData, 'email').trim()
  const password = getStringFormValue(formData, 'password')

  if (email.length === 0) {
    return { ok: false, error: 'emailRequired' }
  }

  if (!isEmailFormat(email)) {
    return { ok: false, error: 'emailInvalid' }
  }

  if (password.trim().length === 0) {
    return { ok: false, error: 'passwordRequired' }
  }

  return {
    ok: true,
    request: {
      email,
      password,
    },
  }
}
