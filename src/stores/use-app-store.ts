import { create } from 'zustand'

interface AppState {
  launchCount: number
  incrementLaunchCount: () => void
  resetLaunchCount: () => void
}

export const useAppStore = create<AppState>((set) => ({
  launchCount: 0,
  incrementLaunchCount: () => {
    set((state) => ({ launchCount: state.launchCount + 1 }))
  },
  resetLaunchCount: () => {
    set({ launchCount: 0 })
  },
}))
