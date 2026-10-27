import { ApiError } from '@/lib/api/client'
import { getReadableErrorMessage } from '@/lib/api/error-message'

export function isMissingProblemReference(error: unknown) {
  return (
    error instanceof ApiError &&
    typeof error.body === 'object' &&
    error.body !== null &&
    'code' in error.body &&
    error.body.code === 'PROBLEM_NOT_FOUND'
  )
}

export function getProblemReferenceErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (isMissingProblemReference(error)) {
    return '선택한 문제를 찾을 수 없습니다. 다른 문제를 선택해 주세요.'
  }

  return getReadableErrorMessage(error, fallback)
}
