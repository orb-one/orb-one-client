import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { LoginPage } from '@/routes/login'
import { RegisterPage } from '@/routes/register'
import { useAppStore } from '@/stores/use-app-store'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    <TOptions extends object>(options: TOptions) => ({
      ...options,
      useNavigate: () => vi.fn(),
    }),
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

afterEach(() => {
  cleanup()
  useAppStore.getState().setLocale('ko')
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('shows the Korean server message for invalid login credentials', async () => {
  const serverMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'

  mockApiError('INVALID_CREDENTIALS', serverMessage, 401)
  renderRoute(<LoginPage />)

  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com')
  await userEvent.type(screen.getByLabelText('비밀번호'), 'wrong-password')
  await userEvent.click(screen.getByRole('button', { name: '로그인' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(serverMessage)
})

it('shows the Korean server message for duplicate registration emails', async () => {
  const serverMessage = '이미 가입된 이메일입니다.'

  mockApiError('DUPLICATE_EMAIL', serverMessage, 409)
  renderRoute(<RegisterPage />)

  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com')
  await userEvent.type(screen.getByLabelText('닉네임'), 'orb-user')
  await userEvent.type(
    screen.getByLabelText('비밀번호', { selector: '#register-password' }),
    'password123!',
  )
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'password123!')
  await userEvent.click(screen.getByRole('button', { name: '회원가입' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(serverMessage)
})

it('shows the client translation when the app locale is English', async () => {
  useAppStore.getState().setLocale('en')
  mockApiError(
    'INVALID_CREDENTIALS',
    '이메일 또는 비밀번호가 올바르지 않습니다.',
    401,
  )
  renderRoute(<LoginPage />)

  await userEvent.type(screen.getByLabelText('Email'), 'user@example.com')
  await userEvent.type(screen.getByLabelText('Password'), 'wrong-password')
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'The email or password is incorrect.',
  )
})

function renderRoute(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  )
}

function mockApiError(code: string, message: string, status: number) {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          code,
          message,
          timestamp: '2026-07-12T00:00:00Z',
        }),
        {
          status,
          headers: { 'content-type': 'application/json' },
        },
      ),
    ),
  )
}
