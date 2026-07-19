import { LayerProvider } from '@astryxdesign/core/Layer'
import { QueryClientProvider } from '@tanstack/react-query'
import { LinkProvider } from '@astryxdesign/core/Link'
import { Theme } from '@astryxdesign/core/theme'
import { useToast } from '@astryxdesign/core/Toast'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { useState, type PropsWithChildren } from 'react'

import { AstryxRouterLink } from '@/app/astryx-router-link'
import { createAppQueryClient } from '@/app/query-client'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <Theme theme={neutralTheme} mode="system">
      <LayerProvider toast={{ position: 'bottomEnd' }}>
        <LinkProvider component={AstryxRouterLink}>
          <AppQueryProvider>{children}</AppQueryProvider>
        </LinkProvider>
      </LayerProvider>
    </Theme>
  )
}

function AppQueryProvider({ children }: PropsWithChildren) {
  const showToast = useToast()
  const [queryClient] = useState(() => createAppQueryClient(showToast))

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
