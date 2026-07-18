import { QueryClientProvider } from '@tanstack/react-query'
import { LinkProvider } from '@astryxdesign/core/Link'
import { Theme, useTheme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { useLayoutEffect, useRef, type PropsWithChildren } from 'react'
import { Toaster } from 'sonner'

import { AstryxRouterLink } from '@/app/astryx-router-link'
import { createAppQueryClient } from '@/app/query-client'

const queryClient = createAppQueryClient()

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <Theme theme={neutralTheme} mode="system">
      <LegacyThemeClassBridge />
      <LinkProvider component={AstryxRouterLink}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            closeButton
            richColors
            duration={5000}
            position="bottom-right"
          />
        </QueryClientProvider>
      </LinkProvider>
    </Theme>
  )
}

/**
 * Keeps the legacy shadcn `.dark` selector aligned with Astryx while routes
 * are migrated incrementally. Remove this bridge with the final legacy route.
 */
function LegacyThemeClassBridge() {
  const { mode } = useTheme()
  const initialDarkClass = useRef<boolean | null>(null)

  useLayoutEffect(() => {
    const root = document.documentElement

    initialDarkClass.current ??= root.classList.contains('dark')
    root.classList.toggle('dark', mode === 'dark')
  }, [mode])

  useLayoutEffect(
    () => () => {
      if (initialDarkClass.current !== null) {
        document.documentElement.classList.toggle(
          'dark',
          initialDarkClass.current,
        )
      }
    },
    [],
  )

  return null
}
