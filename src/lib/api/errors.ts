export const API_ERROR_CODES = [
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'INVALID_REFRESH_TOKEN',
  'DUPLICATE_EMAIL',
  'USER_OWNS_GROUP',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export interface ApiErrorResponse {
  code: ApiErrorCode
  message: string
  timestamp: string
}

export function parseApiErrorResponse(value: unknown): ApiErrorResponse | null {
  if (!isRecord(value)) {
    return null
  }

  const { code, message, timestamp } = value

  if (
    !isApiErrorCode(code) ||
    typeof message !== 'string' ||
    typeof timestamp !== 'string'
  ) {
    return null
  }

  return { code, message, timestamp }
}

/** 서버 오류 본문 유무와 관계없이 HTTP 429를 Rate Limit 오류로 판별합니다. */
export function isRateLimitError(value: unknown) {
  return (
    isRecord(value) && (value.status === 429 || value.code === 'RATE_LIMITED')
  )
}

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return (
    typeof value === 'string' &&
    (API_ERROR_CODES as readonly string[]).includes(value)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
