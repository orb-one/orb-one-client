import type { NicknameUpdateRequest } from '@/lib/api/auth'
import { getStringFormValue } from '@/lib/auth/form-validation'

export type ProfileFormError = 'nicknameRequired' | 'nicknameTooLong'

// server NicknameUpdateRequest @Size(max = 50)와 동일한 프론트 기준
export const NICKNAME_MAX_LENGTH = 50

export type ProfileFormValidationResult =
  | {
      ok: true
      request: NicknameUpdateRequest
    }
  | {
      ok: false
      error: ProfileFormError
    }

export function validateProfileForm(
  formData: FormData,
): ProfileFormValidationResult {
  const nickname = getStringFormValue(formData, 'nickname').trim()

  if (nickname.length === 0) {
    return { ok: false, error: 'nicknameRequired' }
  }

  if (nickname.length > NICKNAME_MAX_LENGTH) {
    return { ok: false, error: 'nicknameTooLong' }
  }

  return {
    ok: true,
    request: { nickname },
  }
}
