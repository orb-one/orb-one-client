import { create } from 'zustand'

import { defaultLocale, type Locale } from '@/lib/i18n/messages'

interface AppState {
  launchCount: number
  locale: Locale
  incrementLaunchCount: () => void
  resetLaunchCount: () => void
  setLocale: (locale: Locale) => void
}

export const useAppStore = create<AppState>((set) => ({
  launchCount: 0,
  locale: defaultLocale,
  incrementLaunchCount: () => {
    set((state) => ({ launchCount: state.launchCount + 1 }))
  },
  resetLaunchCount: () => {
    set({ launchCount: 0 })
  },
  setLocale: (locale) => {
    set({ locale })
  },
}))
