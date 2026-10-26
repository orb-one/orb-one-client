import { ApiError } from './client'

const FIELD_LABEL_MAP: Record<string, string> = {
  startDate: '시작 일시',
  start_date: '시작 일시',
  endDate: '종료 일시',
  end_date: '종료 일시',
  title: '연습 이름',
  problems: '문제',
  problemIds: '문제',
  provider: '플랫폼',
  externalProblemId: '문제 ID',
  external_problem_id: '문제 ID',
  name: '문제 이름',
  url: '문제 링크',
  difficulty: '난이도',
}

const REASON_LABEL_MAP: Record<string, string> = {
  REQUIRED: '필수 입력',
  INVALID_FORMAT: '형식 오류',
  INVALID_VALUE: '값 오류',
  DUPLICATE: '중복',
}

interface FieldErrorItem {
  field?: string
  reason?: string
  message?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function formatFieldError(item: FieldErrorItem): string | null {
  const fieldName = item.field
  const labelKey = fieldName?.replace(/\[\d+\]/g, '')
  const label = labelKey ? (FIELD_LABEL_MAP[labelKey] ?? fieldName) : ''
  const reasonText = item.reason
    ? (REASON_LABEL_MAP[item.reason] ?? item.reason)
    : item.message

  if (label && reasonText) {
    return `${label}: ${reasonText}`
  }
  if (label) {
    return label
  }
  return reasonText ?? null
}

/**
 * API 오류 또는 일반 예외 객체에서 사용자에게 친숙한 에러 메시지를 추출합니다.
 * fieldErrors가 포함된 경우 필드명을 한국어로 변환하여 함께 표시합니다.
 */
export function getReadableErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (!error) {
    return fallbackMessage
  }

  let body: unknown = undefined
  let baseMessage = fallbackMessage

  if (error instanceof ApiError) {
    body = error.body
    baseMessage = error.message || fallbackMessage
  } else if (isRecord(error) && 'body' in error) {
    body = error.body
    if (typeof error.message === 'string' && error.message.length > 0) {
      baseMessage = error.message
    }
  } else if (error instanceof Error) {
    return error.message || fallbackMessage
  }

  if (isRecord(body) && Array.isArray(body.fieldErrors)) {
    const details = body.fieldErrors
      .map((fe) => (isRecord(fe) ? formatFieldError(fe) : null))
      .filter((msg): msg is string => Boolean(msg))

    if (details.length > 0) {
      return `${baseMessage} (${details.join(', ')})`
    }
  }

  return baseMessage
}
