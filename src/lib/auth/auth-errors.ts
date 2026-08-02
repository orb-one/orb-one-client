import { ApiError } from '@/lib/api/client'
import {
  authErrorTranslations,
  defaultLocale,
  type Locale,
} from '@/lib/i18n/messages'

export function getAuthErrorMessage(
  error: unknown,
  locale: Locale,
  fallback: string,
) {
  if (!(error instanceof ApiError)) {
    return fallback
  }

  if (locale === defaultLocale) {
    return error.message.trim().length > 0 ? error.message : fallback
  }

  if (error.code) {
    return authErrorTranslations[locale][error.code]
  }

  return fallback
}
