import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

import { useTranslations } from '@/lib/i18n/use-translations'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const t = useTranslations()

  return (
    <div className="bg-background text-foreground min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link to="/" className="text-sm font-semibold">
            {t.common.productName}
          </Link>
          <nav className="text-muted-foreground flex items-center gap-3 text-sm">
            <Link
              to="/login"
              className="hover:text-foreground [&.active]:text-foreground transition-colors"
            >
              {t.navigation.login}
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
