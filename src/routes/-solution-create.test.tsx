import { LayerProvider } from '@astryxdesign/core/Layer'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { AuthSessionExpiredError } from '@/lib/api/client'
import { createSolution } from '@/lib/api/solutions'
import { useAppStore } from '@/stores/use-app-store'

const navigate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    <TOptions extends object>(options: TOptions) => ({
      ...options,
      useNavigate: () => navigate,
    }),
}))

vi.mock('@/lib/api/solutions', () => ({
  createSolution: vi.fn(),
}))

import { SolutionCreatePage } from '@/routes/solutions_.new'

afterEach(() => {
  cleanup()
  useAppStore.getState().setLocale('ko')
  vi.resetAllMocks()
})

it('connects required-field feedback to the problem ID input', async () => {
  renderRoute(<SolutionCreatePage />)

  await userEvent.click(screen.getByRole('button', { name: '풀이 저장' }))

  const problemIdInput = screen.getByLabelText('문제 ID')

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '문제 ID를 입력해 주세요.',
  )
  expect(problemIdInput).toHaveAttribute('aria-invalid', 'true')
  expect(problemIdInput).toHaveAccessibleDescription(
    '저장할 풀이가 연결되는 문제의 ID입니다. 문제 ID를 입력해 주세요.',
  )
  await waitFor(() => expect(problemIdInput).toHaveFocus())
  expect(createSolution).not.toHaveBeenCalled()
})

it('submits the documented fields and navigates to the created solution', async () => {
  vi.mocked(createSolution).mockResolvedValue({ id: 'solution-1' })
  renderRoute(<SolutionCreatePage />)

  await fillCreateForm()

  await waitFor(() => {
    expect(
      document.querySelector('[data-syntax-token="function"]'),
    ).toHaveTextContent('println')
  })
  expect(
    document.querySelector('.solution-code-editor__highlight')?.textContent,
  ).toBe('System.out.println(1);')

  await userEvent.click(screen.getByRole('button', { name: '풀이 저장' }))

  await waitFor(() => {
    expect(createSolution).toHaveBeenCalledWith({
      problemId: 'problem-1',
      language: 'Java',
      code: 'System.out.println(1);',
    })
  })
  expect(navigate).toHaveBeenCalledWith({
    to: '/solutions/$solutionId',
    params: { solutionId: 'solution-1' },
  })
})

it('prevents another submission while a solution is being saved', async () => {
  vi.mocked(createSolution).mockReturnValue(new Promise(() => undefined))
  renderRoute(<SolutionCreatePage />)

  await fillCreateForm()
  const submitButton = screen.getByRole('button', { name: '풀이 저장' })

  await userEvent.dblClick(submitButton)

  expect(createSolution).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: '저장 중' })).toBeDisabled()
})

it('shows a login action when the authentication session expires', async () => {
  vi.mocked(createSolution).mockRejectedValue(new AuthSessionExpiredError())
  renderRoute(<SolutionCreatePage />)

  await fillCreateForm()
  await userEvent.click(screen.getByRole('button', { name: '풀이 저장' }))

  expect(
    await screen.findByText('저장된 풀이를 확인하려면 로그인해 주세요.'),
  ).toBeVisible()
  expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute(
    'href',
    '/login',
  )
})

it('shows and clears generic creation errors', async () => {
  vi.mocked(createSolution).mockRejectedValue(new Error('Unavailable'))
  renderRoute(<SolutionCreatePage />)

  await fillCreateForm()
  await userEvent.click(screen.getByRole('button', { name: '풀이 저장' }))

  expect(
    await screen.findByText('풀이를 저장하지 못했습니다. 다시 시도해 주세요.'),
  ).toBeVisible()

  await userEvent.type(screen.getByLabelText('문제 ID'), '-updated')

  expect(
    screen.queryByText('풀이를 저장하지 못했습니다. 다시 시도해 주세요.'),
  ).not.toBeInTheDocument()
})

function renderRoute(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  })

  return render(
    <Theme theme={neutralTheme} mode="light">
      <LayerProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </LayerProvider>
    </Theme>,
  )
}

async function fillCreateForm() {
  await userEvent.type(screen.getByLabelText('문제 ID'), 'problem-1')
  await userEvent.click(
    screen.getByRole('combobox', { name: /프로그래밍 언어/ }),
  )
  await userEvent.click(screen.getByRole('option', { name: 'Java' }))
  await userEvent.type(
    screen.getByRole('textbox', { name: /소스 코드/ }),
    'System.out.println(1);',
  )
}
