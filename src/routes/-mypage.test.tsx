import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { getCurrentUser } from '@/lib/api/auth'
import { AuthSessionExpiredError } from '@/lib/api/client'
import { currentUserQueryKey } from '@/lib/auth/auth-queries'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    <TOptions extends object>(options: TOptions) =>
      options,
  Navigate: (props: { replace?: boolean; to: string }) => {
    navigate(props)
    return <span data-testid="navigate" />
  },
}))

vi.mock('@/lib/api/auth', () => ({
  getCurrentUser: vi.fn(),
}))

import { MyPage } from '@/routes/mypage'

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it('renders the signed-in account summary', () => {
  renderMyPage({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })

  expect(screen.getByRole('heading', { name: '마이페이지' })).toBeVisible()
  expect(screen.getByRole('heading', { name: '계정 정보' })).toBeVisible()
  expect(screen.getByText('닉네임')).toBeVisible()
  expect(screen.getByText('orb-user')).toBeVisible()
  expect(screen.getByText('이메일')).toBeVisible()
  expect(screen.getByText('user@example.com')).toBeVisible()
})

it('announces while the current account is loading', () => {
  vi.mocked(getCurrentUser).mockImplementation(
    () => new Promise(() => undefined),
  )

  renderMyPage()

  expect(screen.getByRole('status')).toHaveTextContent(
    '계정 정보를 불러오는 중',
  )
})

it('redirects signed-out users to login', () => {
  renderMyPage(null)

  expect(screen.getByTestId('navigate')).toBeInTheDocument()
  expect(navigate).toHaveBeenCalledWith({ to: '/login', replace: true })
  expect(screen.queryByText('user@example.com')).not.toBeInTheDocument()
})

it('redirects users when their session has expired', async () => {
  vi.mocked(getCurrentUser).mockRejectedValue(new AuthSessionExpiredError())

  renderMyPage()

  expect(await screen.findByTestId('navigate')).toBeInTheDocument()
  expect(navigate).toHaveBeenCalledWith({ to: '/login', replace: true })
})

it('shows an error state and retries the current account request', async () => {
  vi.mocked(getCurrentUser)
    .mockRejectedValueOnce(new Error('Account unavailable'))
    .mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      nickname: 'orb-user',
    })

  renderMyPage()

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '계정 정보를 불러오지 못했습니다.',
  )

  await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))

  expect(await screen.findByText('orb-user')).toBeVisible()
  expect(getCurrentUser).toHaveBeenCalledTimes(2)
})

function renderMyPage(currentUser?: CurrentUser) {
  const queryClient = createQueryClient()

  if (currentUser !== undefined) {
    queryClient.setQueryData(currentUserQueryKey, currentUser)
  }

  return renderWithClient(queryClient, <MyPage />)
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  })
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
