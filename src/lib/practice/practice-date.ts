/**
 * 숫자 입력을 받아 YYYY-MM-DD 형식으로 포맷팅합니다.
 */
export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length >= 7) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
  } else if (digits.length >= 5) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }
  return digits
}

/**
 * YYYY-MM-DD 형식의 문자열이 유효한 실제 달력 날짜인지 검증합니다.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false
  }

  const parts = dateStr.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])

  if (year < 1970 || year > 2100) {
    return false
  }

  if (month < 1 || month > 12) {
    return false
  }

  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export type PracticeDateValidationResult =
  | { success: true; startDate: string; endDate: string }
  | { success: false; error: string }

/**
 * 시작일과 종료일 문자열을 검증하고 API 요청용 ISO 형식(시작 00:00:00, 종료 23:59:59)으로 변환합니다.
 */
export function validateAndFormatPracticeDates(
  startDateStr: string,
  endDateStr: string,
): PracticeDateValidationResult {
  if (!startDateStr || !endDateStr) {
    return {
      success: false,
      error: '시작 일시와 종료 일시를 모두 입력해주세요.',
    }
  }

  if (!isValidDateString(startDateStr)) {
    return {
      success: false,
      error: '시작 일시를 올바른 날짜로 입력해주세요. (예: 2026-01-01)',
    }
  }

  if (!isValidDateString(endDateStr)) {
    return {
      success: false,
      error: '종료 일시를 올바른 날짜로 입력해주세요. (예: 2026-01-01)',
    }
  }

  if (startDateStr > endDateStr) {
    return {
      success: false,
      error: '종료 일시는 시작 일시보다 빠를 수 없습니다.',
    }
  }

  return {
    success: true,
    startDate: `${startDateStr}T00:00:00`,
    endDate: `${endDateStr}T23:59:59`,
  }
}

/**
 * ISO 날짜 문자열에서 YYYY-MM-DD 날짜 부분만 추출합니다.
 */
export function extractDateOnly(dateIso: string | undefined): string {
  if (!dateIso) return ''
  const trimmed = dateIso.trim()
  if (trimmed.length >= 10) {
    const candidate = trimmed.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
      return candidate
    }
  }
  return formatDateInput(trimmed)
}
