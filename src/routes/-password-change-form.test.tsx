import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { changeCurrentUserPassword } from '@/lib/api/auth'
import { ApiError, AuthSessionExpiredError } from '@/lib/api/client'
import { PASSWORD_CHANGE_MIN_LENGTH } from '@/lib/auth/password-change-validation'

vi.mock('@/lib/api/auth', () => ({
  changeCurrentUserPassword: vi.fn(),
}))

import { PasswordChangeForm } from '@/routes/-password-change-form'

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it('renders accessible password fields without library-generated English labels', () => {
  renderPasswordChangeForm()

  expect(
    screen.getByText(
      '현재 비밀번호를 확인한 뒤 사용할 새 비밀번호를 입력하세요. 변경을 완료하면 자동으로 로그아웃됩니다.',
    ),
  ).toBeVisible()
  expect(screen.getByLabelText('현재 비밀번호')).toHaveAttribute(
    'autocomplete',
    'current-password',
  )
  expect(screen.getByLabelText('새 비밀번호')).toHaveAttribute(
    'autocomplete',
    'new-password',
  )
  expect(screen.getByLabelText('새 비밀번호')).toHaveAttribute(
    'minlength',
    String(PASSWORD_CHANGE_MIN_LENGTH),
  )
  expect(screen.getByLabelText('새 비밀번호 확인')).toHaveAttribute(
    'autocomplete',
    'new-password',
  )
  expect(screen.queryByText('Required')).not.toBeInTheDocument()
})

it('follows the form order when navigating with the keyboard', async () => {
  const user = userEvent.setup()
  renderPasswordChangeForm()

  await user.tab()
  expect(screen.getByLabelText('현재 비밀번호')).toHaveFocus()
  await user.tab()
  expect(screen.getByLabelText('새 비밀번호')).toHaveFocus()
  await user.tab()
  expect(screen.getByLabelText('새 비밀번호 확인')).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: '비밀번호 변경' })).toHaveFocus()
})

it('focuses the first invalid field without sending a request', async () => {
  renderPasswordChangeForm()

  await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

  const currentPasswordInput = screen.getByLabelText('현재 비밀번호')
  expect(currentPasswordInput).toHaveAccessibleDescription(
    '현재 비밀번호를 입력해 주세요.',
  )
  await waitFor(() => expect(currentPasswordInput).toHaveFocus())
  expect(changeCurrentUserPassword).not.toHaveBeenCalled()
})

it('submits valid values and reports completion to the parent', async () => {
  vi.mocked(changeCurrentUserPassword).mockResolvedValue({
    message: 'Password changed successfully',
  })
  const onPasswordChanged = vi.fn()
  renderPasswordChangeForm({ onPasswordChanged })

  await fillPasswordForm()
  await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

  expect(vi.mocked(changeCurrentUserPassword).mock.calls[0]?.[0]).toEqual({
    currentPassword: 'old-password123!',
    newPassword: 'new-password123!',
  })
  await waitFor(() => {
    expect(onPasswordChanged).toHaveBeenCalledOnce()
  })
  expect(
    await screen.findByText(
      '비밀번호를 변경했습니다. 새 비밀번호로 다시 로그인해 주세요.',
    ),
  ).toBeVisible()
})

it('shows an inline error and focuses the current password when it is incorrect', async () => {
  vi.mocked(changeCurrentUserPassword).mockRejectedValue(
    apiError(401, 'INVALID_CREDENTIALS'),
  )
  renderPasswordChangeForm()

  await fillPasswordForm()
  await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

  const currentPasswordInput = screen.getByLabelText('현재 비밀번호')
  expect(
    await screen.findByText('현재 비밀번호가 올바르지 않습니다.'),
  ).toBeVisible()
  await waitFor(() => expect(currentPasswordInput).toHaveFocus())
})

it('shows a general error when the request fails', async () => {
  vi.mocked(changeCurrentUserPassword).mockRejectedValue(
    apiError(500, 'INTERNAL_ERROR'),
  )
  renderPasswordChangeForm()

  await fillPasswordForm()
  await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.',
  )
})

it('reports an expired session to the parent without showing a save error', async () => {
  vi.mocked(changeCurrentUserPassword).mockRejectedValue(
    new AuthSessionExpiredError(),
  )
  const onSessionExpired = vi.fn()
  renderPasswordChangeForm({ onSessionExpired })

  await fillPasswordForm()
  await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

  await waitFor(() => {
    expect(onSessionExpired).toHaveBeenCalledOnce()
  })
  expect(
    screen.queryByText('비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.'),
  ).not.toBeInTheDocument()
})

it('keeps the changed state and reports a separate error when sign-out fails', async () => {
  vi.mocked(changeCurrentUserPassword).mockResolvedValue({
    message: 'Password changed successfully',
  })
  const onPasswordChanged = vi
    .fn<() => Promise<void>>()
    .mockRejectedValueOnce(new Error('Sign-out failed'))
    .mockResolvedValueOnce(undefined)
  renderPasswordChangeForm({ onPasswordChanged })

  await fillPasswordForm()
  await userEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

  expect(
    await screen.findByText(
      '비밀번호는 변경했지만 로그아웃하지 못했습니다. 로그아웃을 다시 시도해 주세요.',
    ),
  ).toBeVisible()
  expect(
    screen.queryByText('비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.'),
  ).not.toBeInTheDocument()
  expect(screen.getByLabelText('현재 비밀번호')).toHaveValue('')
  expect(screen.getByRole('button', { name: '비밀번호 변경' })).toBeDisabled()

  await userEvent.click(
    screen.getByRole('button', { name: '로그아웃 다시 시도' }),
  )

  await waitFor(() => {
    expect(onPasswordChanged).toHaveBeenCalledTimes(2)
  })
  expect(
    await screen.findByText(
      '비밀번호를 변경했습니다. 새 비밀번호로 다시 로그인해 주세요.',
    ),
  ).toBeVisible()
  expect(changeCurrentUserPassword).toHaveBeenCalledTimes(1)
})

function renderPasswordChangeForm(
  props: Partial<React.ComponentProps<typeof PasswordChangeForm>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })

  return renderWithClient(
    queryClient,
    <PasswordChangeForm
      onPasswordChanged={vi.fn()}
      onSessionExpired={vi.fn()}
      {...props}
    />,
  )
}

async function fillPasswordForm() {
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

function apiError(status: number, code: string) {
  const body = {
    code,
    message: 'Request failed',
    timestamp: '2026-08-22T00:00:00Z',
  }

  return new ApiError(
    body.message,
    status,
    new Response(JSON.stringify(body), { status }),
    body,
  )
}

function renderWithClient(queryClient: QueryClient, children: ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  )
}
