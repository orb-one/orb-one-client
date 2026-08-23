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

import { deleteCurrentUser } from '@/lib/api/auth'
import { ApiError, AuthSessionExpiredError } from '@/lib/api/client'
import { useAppStore } from '@/stores/use-app-store'

const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }))

vi.mock('@astryxdesign/core/Toast', () => ({
  useToast: () => showToast,
}))

vi.mock('@/lib/api/auth', () => ({
  deleteCurrentUser: vi.fn(),
}))

import { AccountDeletionSection } from '@/routes/-account-deletion-section'

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
  useAppStore.getState().setLocale('ko')
})

it('requires the exact confirmation phrase before enabling deletion', async () => {
  renderSection()

  await userEvent.click(screen.getByRole('button', { name: '회원탈퇴' }))

  const dialog = screen.getByRole('dialog')
  const confirmationInput = screen.getByRole('textbox', { name: '확인 문구' })
  const deleteButton = within(dialog).getByRole('button', {
    name: '회원탈퇴',
  })

  expect(dialog).toHaveAccessibleName('정말 회원탈퇴할까요?')
  expect(dialog).toHaveTextContent('계정과 저장한 풀이가 영구 삭제되며')
  expect(dialog).toHaveTextContent('“탈퇴에 동의합니다”를 정확히 입력')
  expect(deleteButton).toBeDisabled()
  expect(deleteCurrentUser).not.toHaveBeenCalled()

  await userEvent.type(confirmationInput, '탈퇴에 동의합니다 ')

  expect(deleteButton).toBeDisabled()

  await userEvent.clear(confirmationInput)
  await userEvent.type(confirmationInput, '탈퇴에 동의합니다')

  expect(deleteButton).toBeEnabled()

  await userEvent.click(screen.getByRole('button', { name: '취소' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(deleteCurrentUser).not.toHaveBeenCalled()
})

it('deletes the account only after consent and reports success', async () => {
  vi.mocked(deleteCurrentUser).mockResolvedValue(undefined)
  const onDeleted = vi.fn()

  renderSection({ onDeleted })

  await confirmDeletion()

  await waitFor(() => {
    expect(onDeleted).toHaveBeenCalledOnce()
  })
  expect(deleteCurrentUser).toHaveBeenCalledOnce()
  expect(showToast).toHaveBeenCalledWith(
    expect.objectContaining({
      body: '회원탈퇴가 완료되었습니다.',
      uniqueID: 'account.deletion.success',
    }),
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('keeps the account active and explains how to resolve group ownership', async () => {
  vi.mocked(deleteCurrentUser).mockRejectedValue(
    apiError(409, {
      code: 'USER_OWNS_GROUP',
      message: 'User owns a group',
      timestamp: '2026-08-23T00:00:00Z',
    }),
  )
  const onDeleted = vi.fn()

  renderSection({ onDeleted })

  await confirmDeletion()

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '소유한 그룹이 있어 탈퇴할 수 없습니다.',
  )
  expect(screen.getByRole('alert')).toHaveTextContent(
    '그룹 소유권을 이전하거나 그룹을 폐쇄한 뒤 다시 시도해 주세요.',
  )
  expect(onDeleted).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('shows a persistent error when account deletion fails', async () => {
  vi.mocked(deleteCurrentUser).mockRejectedValue(new Error('Delete failed'))

  renderSection()

  await confirmDeletion()

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '회원탈퇴를 완료하지 못했습니다. 다시 시도해 주세요.',
  )
})

it('hands expired sessions back to the protected route', async () => {
  vi.mocked(deleteCurrentUser).mockRejectedValue(new AuthSessionExpiredError())
  const onSessionExpired = vi.fn()

  renderSection({ onSessionExpired })

  await confirmDeletion()

  await waitFor(() => {
    expect(onSessionExpired).toHaveBeenCalledOnce()
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('renders the account deletion flow in English', async () => {
  useAppStore.getState().setLocale('en')

  renderSection()

  expect(screen.getByRole('heading', { name: 'Delete account' })).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Delete account' }))
  expect(
    screen.getByRole('textbox', { name: 'Confirmation phrase' }),
  ).toHaveAccessibleDescription(
    'To continue, enter “I agree to delete my account” exactly as shown.',
  )
})

async function confirmDeletion() {
  await userEvent.click(screen.getByRole('button', { name: '회원탈퇴' }))
  const dialog = screen.getByRole('dialog')

  await userEvent.type(
    within(dialog).getByRole('textbox', { name: '확인 문구' }),
    '탈퇴에 동의합니다',
  )
  await userEvent.click(
    within(dialog).getByRole('button', { name: '회원탈퇴' }),
  )
}

function renderSection({
  onDeleted = vi.fn(),
  onSessionExpired = vi.fn(),
}: Partial<SectionCallbacks> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return renderWithClient(
    queryClient,
    <AccountDeletionSection
      onDeleted={onDeleted}
      onSessionExpired={onSessionExpired}
    />,
  )
}

function renderWithClient(queryClient: QueryClient, children: ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  )
}

function apiError(status: number, body: unknown) {
  return new ApiError(
    'API error',
    status,
    new Response(JSON.stringify(body), { status }),
    body,
  )
}

interface SectionCallbacks {
  onDeleted: () => void | Promise<void>
  onSessionExpired: () => void
}
