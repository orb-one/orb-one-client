import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { LogOut, UserCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { logoutAccount } from '@/lib/api/auth'
import {
  currentUserQueryKey,
  currentUserQueryOptions,
} from '@/lib/auth/auth-queries'
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
            <RootAuthNav />
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  )
}

function RootAuthNav() {
  const t = useTranslations()
  const copy = t.navigation
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const currentUserQuery = useQuery(currentUserQueryOptions())
  const logoutMutation = useMutation({
    mutationFn: logoutAccount,
    onSuccess: handleLogoutSuccess,
  })
  const currentUser = currentUserQuery.data ?? null

  function handleLogoutSuccess() {
    queryClient.setQueryData(currentUserQueryKey, null)
    void queryClient.invalidateQueries({ queryKey: currentUserQueryKey })
    void navigate({ to: '/' })
  }

  if (currentUser) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <div
          className="text-foreground flex min-w-0 items-center gap-1.5"
          aria-label={copy.currentUser}
        >
          <UserCircle className="text-muted-foreground size-4" />
          <span className="max-w-32 truncate sm:max-w-40">
            {currentUser.nickname}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={logoutMutation.isPending}
          onClick={() => {
            logoutMutation.mutate()
          }}
        >
          <LogOut className="size-4" />
          {logoutMutation.isPending ? copy.loggingOut : copy.logout}
        </Button>
      </div>
    )
  }

  return (
    <Link
      to="/login"
      className="hover:text-foreground [&.active]:text-foreground transition-colors"
    >
      {copy.login}
    </Link>
  )
}
