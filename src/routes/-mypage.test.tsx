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

import {
  changeCurrentUserPassword,
  deleteCurrentUser,
  getCurrentUser,
  logoutAccount,
  updateCurrentUser,
} from '@/lib/api/auth'
import { AuthSessionExpiredError } from '@/lib/api/client'
import { currentUserQueryKey } from '@/lib/auth/auth-queries'
import { signOutMockUser } from '@/lib/auth/mock-auth-session'

const { navigate, showToast } = vi.hoisted(() => ({
  navigate: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('@astryxdesign/core/Toast', () => ({
  useToast: () => showToast,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    <TOptions extends object>(options: TOptions) => ({
      ...options,
      useNavigate: () => navigate,
    }),
  Navigate: (props: { replace?: boolean; to: string }) => {
    navigate(props)
    return <span data-testid="navigate" />
  },
}))

vi.mock('@/lib/api/auth', () => ({
  changeCurrentUserPassword: vi.fn(),
  deleteCurrentUser: vi.fn(),
  getCurrentUser: vi.fn(),
  logoutAccount: vi.fn(),
  updateCurrentUser: vi.fn(),
}))

vi.mock('@/lib/auth/mock-auth-session', () => ({
  signOutMockUser: vi.fn(),
}))

import { MyPage } from '@/routes/mypage'

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it('renders the signed-in account profile form', () => {
  renderMyPage({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })

  expect(screen.getByRole('heading', { name: '마이페이지' })).toBeVisible()
  expect(screen.getByRole('heading', { name: '계정 정보' })).toBeVisible()
  expect(screen.getByLabelText('이메일')).toHaveValue('user@example.com')
  expect(screen.getByLabelText('이메일')).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  expect(screen.getByLabelText('닉네임')).toHaveValue('orb-user')
  expect(screen.getByLabelText('닉네임')).toBeRequired()
  expect(screen.queryByText('Required')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '변경사항 저장' })).toHaveAttribute(
    'aria-disabled',
    'true',
  )
})

it('updates the nickname and shared current user cache', async () => {
  vi.mocked(updateCurrentUser).mockResolvedValue({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'updated-user',
  })
  const queryClient = renderMyPage({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })

  const nicknameInput = screen.getByLabelText('닉네임')
  await userEvent.clear(nicknameInput)
  await userEvent.type(nicknameInput, '  updated-user  ')
  await userEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))

  expect(vi.mocked(updateCurrentUser).mock.calls[0]?.[0]).toEqual({
    nickname: 'updated-user',
  })
  expect(await screen.findByText('닉네임을 변경했습니다.')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Dismiss' }),
  ).not.toBeInTheDocument()
  expect(nicknameInput).toHaveValue('updated-user')
  expect(queryClient.getQueryData(currentUserQueryKey)).toEqual({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'updated-user',
  })
})

it('validates an empty nickname and focuses the field', async () => {
  renderMyPage({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })

  const nicknameInput = screen.getByLabelText('닉네임')
  await userEvent.clear(nicknameInput)
  await userEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))

  expect(nicknameInput).toHaveAccessibleDescription(/닉네임을 입력해 주세요/)
  await waitFor(() => expect(nicknameInput).toHaveFocus())
  expect(updateCurrentUser).not.toHaveBeenCalled()
})

it('validates a nickname longer than the server limit', async () => {
  renderMyPage({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })

  const nicknameInput = screen.getByLabelText('닉네임')
  await userEvent.clear(nicknameInput)
  await userEvent.type(nicknameInput, 'a'.repeat(51))
  await userEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))

  expect(nicknameInput).toHaveAccessibleDescription(
    /닉네임은 50자 이하로 입력해 주세요/,
  )
  expect(updateCurrentUser).not.toHaveBeenCalled()
})

it('shows an error when saving the nickname fails', async () => {
  vi.mocked(updateCurrentUser).mockRejectedValue(new Error('Save failed'))
  renderMyPage({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })

  const nicknameInput = screen.getByLabelText('닉네임')
  await userEvent.clear(nicknameInput)
  await userEvent.type(nicknameInput, 'updated-user')
  await userEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '닉네임을 변경하지 못했습니다. 다시 시도해 주세요.',
  )
})

it('redirects when the session expires while saving', async () => {
  vi.mocked(updateCurrentUser).mockRejectedValue(new AuthSessionExpiredError())
  renderMyPage({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })

  const nicknameInput = screen.getByLabelText('닉네임')
  await userEvent.clear(nicknameInput)
  await userEvent.type(nicknameInput, 'updated-user')
  await userEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))

  expect(await screen.findByTestId('navigate')).toBeInTheDocument()
  expect(navigate).toHaveBeenCalledWith({ to: '/login', replace: true })
})

it('signs out and redirects after changing the password', async () => {
  vi.mocked(changeCurrentUserPassword).mockResolvedValue({
    message: 'Password changed successfully',
  })
  vi.mocked(logoutAccount).mockResolvedValue({ message: 'Logout successful' })
  const queryClient = renderMyPage({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })

  await fillPasswordChangeForm()
  await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

  await waitFor(() => {
    expect(logoutAccount).toHaveBeenCalledOnce()
  })
  expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull()
  expect(navigate).toHaveBeenCalledWith({
    to: '/login',
    replace: true,
    search: { passwordChanged: true },
  })
})

it('clears user data and redirects home after account deletion', async () => {
  vi.mocked(deleteCurrentUser).mockResolvedValue(undefined)
  vi.mocked(signOutMockUser).mockResolvedValue()
  const queryClient = renderMyPage({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })
  const userScopedQueryKey = ['solutions', 'mine'] as const

  queryClient.setQueryData(userScopedQueryKey, [{ id: 'solution-1' }])

  await userEvent.click(screen.getByRole('button', { name: '회원탈퇴' }))
  const deletionDialog = screen.getByRole('dialog')

  await userEvent.type(
    within(deletionDialog).getByRole('textbox', { name: '확인 문구' }),
    '탈퇴에 동의합니다',
  )
  await userEvent.click(
    within(deletionDialog).getByRole('button', { name: '회원탈퇴' }),
  )

  await waitFor(() => {
    expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
  })
  expect(deleteCurrentUser).toHaveBeenCalledOnce()
  expect(signOutMockUser).toHaveBeenCalledOnce()
  expect(queryClient.getQueryData(userScopedQueryKey)).toBeUndefined()
  expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull()
  expect(showToast).toHaveBeenCalledWith(
    expect.objectContaining({ body: '회원탈퇴가 완료되었습니다.' }),
  )
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

  expect(await screen.findByDisplayValue('orb-user')).toBeVisible()
  expect(getCurrentUser).toHaveBeenCalledTimes(2)
})

function renderMyPage(currentUser?: CurrentUser) {
  const queryClient = createQueryClient()

  if (currentUser !== undefined) {
    queryClient.setQueryData(currentUserQueryKey, currentUser)
  }

  renderWithClient(queryClient, <MyPage />)

  return queryClient
}

async function fillPasswordChangeForm() {
  await userEvent.type(
    screen.getByLabelText('현재 비밀번호'),
    'old-password123!',
  )
  await userEvent.type(screen.getByLabelText('새 비밀번호'), 'new-password123!')
  await userEvent.type(
    screen.getByLabelText('새 비밀번호 확인'),
    'new-password123!',
  )
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
