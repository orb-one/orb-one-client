export const API_ERROR_CODES = [
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'INVALID_REFRESH_TOKEN',
  'DUPLICATE_EMAIL',
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

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return (
    typeof value === 'string' &&
    (API_ERROR_CODES as readonly string[]).includes(value)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
