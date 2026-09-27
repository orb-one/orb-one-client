import { messages } from '@/lib/i18n/messages'
import { useAppStore } from '@/stores/use-app-store'

export function useI18n() {
  const locale = useAppStore((state) => state.locale)

  return { locale, t: messages[locale] }
}

export function useTranslations() {
  const { t } = useI18n()

  return t
}
