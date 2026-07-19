import type { Locale } from '@/lib/i18n/messages'

const localeTags = {
  ko: 'ko-KR',
  en: 'en-US',
} as const satisfies Record<Locale, string>

export function formatSolutionDate(value: string | null, locale: Locale) {
  if (value === null) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatSolutionNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(localeTags[locale]).format(value)
}

// API가 정수로 전달하는 실행 지표는 온라인 저지 표기 관례인 KB와 ms로 표시한다.
export function formatSolutionMemoryUsage(value: number, locale: Locale) {
  return `${formatSolutionNumber(value, locale)} KB`
}

export function formatSolutionElapsedTime(value: number, locale: Locale) {
  return `${formatSolutionNumber(value, locale)} ms`
}

export function getSafeProblemUrl(value: string | null) {
  if (value === null) {
    return null
  }

  try {
    const url = new URL(value)

    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null
  } catch {
    return null
  }
}
