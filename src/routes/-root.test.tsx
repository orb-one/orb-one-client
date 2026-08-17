import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { logoutAccount } from '@/lib/api/auth'
import { currentUserQueryKey } from '@/lib/auth/auth-queries'
import { messages } from '@/lib/i18n/messages'
import { useAppStore } from '@/stores/use-app-store'

const navigate = vi.fn()
const { dismissToast, showToast } = vi.hoisted(() => {
  const dismissToast = vi.fn()

  return {
    dismissToast,
    showToast: vi.fn(() => dismissToast),
  }
})

vi.mock('@tanstack/react-router', () => ({
  createRootRoute: <TOptions extends object>(options: TOptions) => ({
    ...options,
    useNavigate: () => navigate,
  }),
  Outlet: () => <span>Route content</span>,
}))

vi.mock('@astryxdesign/core/Toast', () => ({
  useToast: () => showToast,
}))

vi.mock('@/lib/api/auth', () => ({
  getCurrentUser: vi.fn(() => new Promise(() => undefined)),
  logoutAccount: vi.fn(),
}))

import { RootLayout } from '@/routes/__root'

afterEach(() => {
  cleanup()
  useAppStore.getState().setLocale('ko')
  vi.clearAllMocks()
})

it('renders the signed-out application shell with accessible navigation', () => {
  renderRoot(null)

  const navigation = screen.getByRole('navigation', { name: '주요 탐색' })

  expect(navigation).toHaveClass(
    'bg-surface',
    'backdrop-blur-md',
    'supports-[backdrop-filter]:bg-surface/80',
  )
  expect(
    within(navigation).getByRole('link', { name: 'Orb One' }),
  ).toHaveAttribute('href', '/')
  expect(
    within(navigation).getByRole('link', { name: '로그인' }),
  ).toHaveAttribute('href', '/login')
  expect(
    within(navigation).queryByRole('link', { name: '풀이' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('main')).toContainElement(
    screen.getByText('Route content'),
  )
})

it('renders the signed-in user and logout action in the application shell', () => {
  renderRoot({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })

  expect(
    screen.getByRole('img', { name: '현재 로그인한 사용자' }),
  ).toBeVisible()
  expect(screen.getByTestId('current-user')).toHaveTextContent('orb-user')
  expect(screen.getByRole('link', { name: '풀이' })).toHaveAttribute(
    'href',
    '/solutions',
  )
  expect(screen.getByRole('button', { name: '로그아웃' })).toBeEnabled()
})

it('announces when the sign-in state is loading', () => {
  renderPendingRoot()

  expect(screen.getByRole('status')).toHaveTextContent('로그인 상태 확인 중')
  expect(screen.queryByRole('link', { name: '풀이' })).not.toBeInTheDocument()
})

it('uses the active locale for the application navigation', () => {
  useAppStore.getState().setLocale('en')

  renderRoot(null)

  const navigation = screen.getByRole('navigation', {
    name: 'Main navigation',
  })

  expect(within(navigation).getByRole('link', { name: 'Login' })).toBeVisible()
  expect(
    within(navigation).queryByRole('link', { name: 'Solutions' }),
  ).not.toBeInTheDocument()
})

it('clears the current user without invalidating the query after logout succeeds', async () => {
  vi.mocked(logoutAccount).mockResolvedValue({ message: 'Logout successful' })
  const queryClient = createQueryClient()
  const cancelQueries = vi.spyOn(queryClient, 'cancelQueries')
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

  queryClient.setQueryData(currentUserQueryKey, {
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })
  renderWithClient(queryClient, <RootLayout />)

  await userEvent.click(screen.getByRole('button', { name: '로그아웃' }))

  await waitFor(() => {
    expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull()
  })
  expect(cancelQueries).toHaveBeenCalledWith({ queryKey: currentUserQueryKey })
  expect(invalidateQueries).not.toHaveBeenCalled()
  expect(navigate).toHaveBeenCalledWith({ to: '/' })
})

it('shows and dismisses an Astryx toast when logout fails', async () => {
  vi.mocked(logoutAccount).mockRejectedValue(new Error('Logout failed'))
  renderRoot({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })

  await userEvent.click(screen.getByRole('button', { name: '로그아웃' }))

  expect(showToast).toHaveBeenCalledWith({
    body: messages.ko.navigation.logoutError,
    type: 'error',
    isAutoHide: true,
    autoHideDuration: 5000,
    uniqueID: 'auth.logout.error',
    collisionBehavior: 'overwrite',
  })

  await userEvent.click(screen.getByRole('button', { name: '로그아웃' }))

  expect(showToast).toHaveBeenCalledTimes(2)
  expect(dismissToast).toHaveBeenCalledOnce()
})

function renderRoot(currentUser: CurrentUser) {
  const queryClient = createQueryClient()

  queryClient.setQueryData(currentUserQueryKey, currentUser)

  return renderWithClient(queryClient, <RootLayout />)
}

function renderPendingRoot() {
  return renderWithClient(createQueryClient(), <RootLayout />)
}

function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  })

  return queryClient
}

function renderWithClient(queryClient: QueryClient, children: ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  )
}

type CurrentUser = {
  id: string
  email: string
  nickname: string
} | null
