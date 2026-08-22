import { AppShell } from '@astryxdesign/core/AppShell'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Link } from '@astryxdesign/core/Link'
import { NavIcon } from '@astryxdesign/core/NavIcon'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav'
import { useToast } from '@astryxdesign/core/Toast'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { LogOut, Orbit } from 'lucide-react'
import { useRef } from 'react'

import { logoutAccount } from '@/lib/api/auth'
import { AuthSessionExpiredError } from '@/lib/api/client'
import {
  currentUserQueryKey,
  currentUserQueryOptions,
} from '@/lib/auth/auth-queries'
import { signOutMockUser } from '@/lib/auth/mock-auth-session'
import { useTranslations } from '@/lib/i18n/use-translations'

const logoutErrorToastId = 'auth.logout.error'

export const Route = createRootRoute({
  component: RootLayout,
})

export function RootLayout() {
  const t = useTranslations()

  return (
    <AppShell
      contentPadding={0}
      height="auto"
      mobileNav={false}
      variant="section"
      topNav={
        <TopNav
          label={t.navigation.mainLabel}
          className="bg-surface supports-[backdrop-filter]:bg-surface/80 backdrop-blur-md"
          heading={
            <TopNavHeading
              heading={t.common.productName}
              headingHref="/"
              logo={
                <NavIcon
                  icon={<Icon icon={Orbit} size="sm" color="inherit" />}
                />
              }
            />
          }
          endContent={<RootAuthNav />}
        />
      }
    >
      <Outlet />
    </AppShell>
  )
}

function RootAuthNav() {
  const t = useTranslations()
  const copy = t.navigation
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const showToast = useToast()
  const dismissLogoutErrorToastRef = useRef<(() => void) | null>(null)
  const currentUserQuery = useQuery(currentUserQueryOptions())
  const logoutMutation = useMutation({
    mutationFn: logoutAccount,
    onSuccess: handleLogoutSuccess,
    onError: handleLogoutError,
  })
  const currentUser = currentUserQuery.data ?? null

  async function handleLogoutSuccess() {
    await queryClient.cancelQueries({ queryKey: currentUserQueryKey })
    // 실제 로그아웃 성공 후 /users/me mock도 비로그인 상태로 맞춘다.
    await signOutMockUser()
    dismissLogoutErrorToast()
    queryClient.setQueryData(currentUserQueryKey, null)
    void navigate({ to: '/' })
  }

  function handleLogoutError(error: Error) {
    if (error instanceof AuthSessionExpiredError) {
      return
    }

    dismissLogoutErrorToast()
    dismissLogoutErrorToastRef.current = showToast({
      body: copy.logoutError,
      type: 'error',
      isAutoHide: true,
      autoHideDuration: 5000,
      uniqueID: logoutErrorToastId,
      collisionBehavior: 'overwrite',
    })
  }

  function dismissLogoutErrorToast() {
    dismissLogoutErrorToastRef.current?.()
    dismissLogoutErrorToastRef.current = null
  }

  if (currentUserQuery.isPending) {
    return (
      <HStack role="status" aria-live="polite" vAlign="center">
        <Skeleton width={96} height={32} radius="rounded" />
        <VisuallyHidden>{copy.loadingUser}</VisuallyHidden>
      </HStack>
    )
  }

  if (currentUser) {
    return (
      <HStack gap={2} vAlign="center">
        <Link href="/solutions" isStandalone>
          {copy.solutions}
        </Link>
        <Link href="/mypage" label={copy.mypage} isStandalone>
          <HStack gap={1.5} vAlign="center" data-testid="current-user">
            <Avatar
              name={currentUser.nickname}
              alt={copy.currentUser}
              size="xsmall"
            />
            <Text
              type="supporting"
              color="primary"
              maxLines={1}
              className="max-w-24 sm:max-w-40"
            >
              {currentUser.nickname}
            </Text>
          </HStack>
        </Link>
        <IconButton
          label={logoutMutation.isPending ? copy.loggingOut : copy.logout}
          tooltip={logoutMutation.isPending ? copy.loggingOut : copy.logout}
          size="sm"
          variant="ghost"
          isLoading={logoutMutation.isPending}
          isDisabled={logoutMutation.isPending}
          icon={<Icon icon={LogOut} color="inherit" />}
          onClick={() => {
            dismissLogoutErrorToast()
            logoutMutation.mutate()
          }}
        />
      </HStack>
    )
  }

  return <Button label={copy.login} href="/login" size="sm" variant="ghost" />
}
