import { defaultLocale, messages, type Locale } from '@/lib/i18n/messages'

export function useTranslations(locale: Locale = defaultLocale) {
  return messages[locale]
}
