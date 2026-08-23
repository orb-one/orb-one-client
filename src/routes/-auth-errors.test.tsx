import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { REGISTER_PASSWORD_MIN_LENGTH } from '@/lib/auth/register-validation'
import { LoginPage } from '@/routes/login'
import { RegisterPage } from '@/routes/register'
import { useAppStore } from '@/stores/use-app-store'

const { routeSearch } = vi.hoisted(() => ({
  routeSearch: { current: {} },
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    <TOptions extends object>(options: TOptions) => ({
      ...options,
      useNavigate: () => vi.fn(),
      useSearch: () => routeSearch.current,
    }),
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

afterEach(() => {
  cleanup()
  routeSearch.current = {}
  useAppStore.getState().setLocale('ko')
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('shows the Korean server message for invalid login credentials', async () => {
  const serverMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'

  mockApiError('INVALID_CREDENTIALS', serverMessage, 401)
  renderRoute(<LoginPage />)

  const emailInput = screen.getByLabelText('이메일')

  await userEvent.type(emailInput, 'user@example.com')
  await userEvent.type(screen.getByLabelText('비밀번호'), 'wrong-password')
  await userEvent.click(screen.getByRole('button', { name: '로그인' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(serverMessage)

  await userEvent.clear(emailInput)
  await userEvent.type(emailInput, 'another@example.com')

  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('keeps native login field semantics', () => {
  renderRoute(<LoginPage />)

  const emailInput = screen.getByLabelText('이메일')
  const passwordInput = screen.getByLabelText('비밀번호')

  expect(emailInput).toHaveAttribute('name', 'email')
  expect(emailInput).toHaveAttribute('autocomplete', 'email')
  expect(emailInput).toBeRequired()
  expect(passwordInput).toHaveAttribute('name', 'password')
  expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
  expect(passwordInput).toBeRequired()
})

it('shows a password change confirmation on the login page', () => {
  routeSearch.current = { passwordChanged: true }

  renderRoute(<LoginPage />)

  expect(
    screen.getByText(
      '비밀번호를 변경했습니다. 새 비밀번호로 다시 로그인해 주세요.',
    ),
  ).toBeVisible()
})

it.each([
  ['required email', { email: '' }, '이메일', '이메일을 입력해 주세요.'],
  [
    'invalid email',
    { email: 'user.example.com' },
    '이메일',
    '올바른 이메일 형식으로 입력해 주세요.',
  ],
  [
    'required password',
    { password: '' },
    '비밀번호',
    '비밀번호를 입력해 주세요.',
  ],
] as const)(
  'connects and focuses the %s login error',
  async (_caseName, overrides, targetLabel, message) => {
    renderRoute(<LoginPage />)
    await fillLoginForm({
      email: 'user@example.com',
      password: 'password123!',
      ...overrides,
    })

    await userEvent.click(screen.getByRole('button', { name: '로그인' }))

    const targetInput = screen.getByLabelText(targetLabel, { exact: true })

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(targetInput).toHaveAttribute('aria-invalid', 'true')
    expect(targetInput).toHaveAccessibleDescription(message)
    await waitFor(() => expect(targetInput).toHaveFocus())
  },
)

it('shows the Korean server message for duplicate registration emails', async () => {
  const serverMessage = '이미 가입된 이메일입니다.'

  mockApiError('DUPLICATE_EMAIL', serverMessage, 409)
  renderRoute(<RegisterPage />)

  const emailInput = screen.getByLabelText('이메일')

  await userEvent.type(emailInput, 'user@example.com')
  await userEvent.type(screen.getByLabelText('닉네임'), 'orb-user')
  await userEvent.type(
    screen.getByLabelText('비밀번호', { exact: true }),
    'password123!',
  )
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'password123!')
  await userEvent.click(screen.getByRole('button', { name: '회원가입' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(serverMessage)

  await userEvent.clear(emailInput)
  await userEvent.type(emailInput, 'another@example.com')

  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('keeps native registration field semantics and marks invalid input', async () => {
  renderRoute(<RegisterPage />)

  const emailInput = screen.getByLabelText('이메일')
  const passwordInput = screen.getByLabelText('비밀번호', { exact: true })

  expect(emailInput).toHaveAttribute('name', 'email')
  expect(emailInput).toHaveAttribute('autocomplete', 'email')
  expect(emailInput).toBeRequired()
  expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
  expect(passwordInput).toHaveAttribute(
    'minlength',
    String(REGISTER_PASSWORD_MIN_LENGTH),
  )

  await userEvent.click(screen.getByRole('button', { name: '회원가입' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '이메일을 입력해 주세요.',
  )
  expect(emailInput).toHaveAttribute('aria-invalid', 'true')
  expect(emailInput).toHaveAccessibleDescription('이메일을 입력해 주세요.')
  await waitFor(() => expect(emailInput).toHaveFocus())

  await userEvent.type(emailInput, 'user@example.com')

  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(emailInput).not.toHaveAttribute('aria-invalid')
})

it.each([
  [
    'invalid email',
    { email: 'user.example.com' },
    '이메일',
    '올바른 이메일 형식으로 입력해 주세요.',
  ],
  ['required nickname', { nickname: '' }, '닉네임', '닉네임을 입력해 주세요.'],
  [
    'required password',
    { password: '', passwordConfirm: '' },
    '비밀번호',
    '비밀번호를 입력해 주세요.',
  ],
  [
    'short password',
    { password: 'short12', passwordConfirm: 'short12' },
    '비밀번호',
    '비밀번호는 8자 이상 입력해 주세요.',
  ],
  [
    'password mismatch',
    { passwordConfirm: 'different123!' },
    '비밀번호 확인',
    '비밀번호가 일치하지 않습니다.',
  ],
] as const)(
  'connects and focuses the %s registration error',
  async (_caseName, overrides, targetLabel, message) => {
    renderRoute(<RegisterPage />)
    await fillRegistrationForm({
      email: 'user@example.com',
      nickname: 'orb-user',
      password: 'password123!',
      passwordConfirm: 'password123!',
      ...overrides,
    })

    await userEvent.click(screen.getByRole('button', { name: '회원가입' }))

    const targetInput = screen.getByLabelText(targetLabel, { exact: true })

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(targetInput).toHaveAttribute('aria-invalid', 'true')
    expect(targetInput).toHaveAccessibleDescription(message)
    await waitFor(() => expect(targetInput).toHaveFocus())
  },
)

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

async function fillRegistrationForm(values: {
  email: string
  nickname: string
  password: string
  passwordConfirm: string
}) {
  const inputs = [
    ['이메일', values.email],
    ['닉네임', values.nickname],
    ['비밀번호', values.password],
    ['비밀번호 확인', values.passwordConfirm],
  ] as const

  for (const [label, value] of inputs) {
    if (value.length > 0) {
      await userEvent.type(screen.getByLabelText(label, { exact: true }), value)
    }
  }
}

async function fillLoginForm(values: { email: string; password: string }) {
  const inputs = [
    ['이메일', values.email],
    ['비밀번호', values.password],
  ] as const

  for (const [label, value] of inputs) {
    if (value.length > 0) {
      await userEvent.type(screen.getByLabelText(label, { exact: true }), value)
    }
  }
}
