import { LayerProvider } from '@astryxdesign/core/Layer'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { getCurrentUser } from '@/lib/api/auth'
import { ApiError, AuthSessionExpiredError } from '@/lib/api/client'
import { getSolution, updateSolution } from '@/lib/api/solutions'
import type { SolutionDetail } from '@/lib/solutions/solution-model'
import { useAppStore } from '@/stores/use-app-store'

const navigate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    <TOptions extends object>(options: TOptions) => ({
      ...options,
      useParams: () => ({ solutionId: 'solution-1' }),
      useNavigate: () => navigate,
    }),
}))

vi.mock('@/lib/api/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/api/solutions', () => ({
  getSolution: vi.fn(),
  updateSolution: vi.fn(),
}))

import { SolutionEditPage } from '@/routes/solutions_.$solutionId_.edit'

afterEach(() => {
  cleanup()
  useAppStore.getState().setLocale('ko')
  vi.resetAllMocks()
})

it('keeps the back link available while the solution edit form is loading', () => {
  vi.mocked(getCurrentUser).mockResolvedValue(currentUser)
  vi.mocked(getSolution).mockReturnValue(
    new Promise<SolutionDetail>(() => undefined),
  )

  renderRoute(<SolutionEditPage solutionId="solution-1" />)

  expect(
    screen.getByRole('link', { name: '풀이 상세로 돌아가기' }),
  ).toHaveAttribute('href', '/solutions/solution-1')
  expect(screen.getByText('수정할 풀이를 불러오는 중')).toBeInTheDocument()
})

it('loads every replaceable field and preserves it on submit', async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(currentUser)
  vi.mocked(getSolution).mockResolvedValue(solution)
  vi.mocked(updateSolution).mockResolvedValue(solution)

  renderRoute(<SolutionEditPage solutionId="solution-1" />)

  expect(
    await screen.findByRole('heading', { name: '풀이 수정', level: 1 }),
  ).toBeVisible()
  expect(
    screen.getByRole('link', { name: '풀이 상세로 돌아가기' }),
  ).toHaveAttribute('href', '/solutions/solution-1')
  expect(
    screen.getByRole('combobox', { name: '프로그래밍 언어' }),
  ).toHaveTextContent('Java')
  const descriptionInput = screen.getByRole('textbox', { name: /풀이 설명/ })
  expect(descriptionInput).toHaveValue('기존 설명')
  expect(screen.getByRole('checkbox', { name: /풀이 완료/ })).toBeChecked()
  expect(
    screen.queryByRole('checkbox', { name: /임시 저장/ }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('spinbutton', { name: /메모리 사용량/ })).toHaveValue(
    14_128,
  )
  expect(screen.getByRole('spinbutton', { name: /실행 시간/ })).toHaveValue(104)

  const descriptionMarkdown = '# 수정된 설명\n\n- 풀이 단계'
  await userEvent.clear(descriptionInput)
  await userEvent.paste(descriptionMarkdown)
  await userEvent.click(screen.getByRole('button', { name: '미리보기' }))
  expect(
    await screen.findByRole('heading', { name: '수정된 설명', level: 3 }),
  ).toBeVisible()
  expect(screen.getByRole('listitem')).toHaveTextContent('풀이 단계')
  await userEvent.click(screen.getByRole('button', { name: '편집' }))
  expect(descriptionInput).toHaveValue(descriptionMarkdown)

  await userEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))

  await waitFor(() => {
    expect(updateSolution).toHaveBeenCalledWith('solution-1', {
      language: 'Java',
      code: 'class Main {}',
      description: descriptionMarkdown,
      isSolved: true,
      isDraft: false,
      memoryUsage: 14_128,
      timeElapsed: 104,
    })
  })
  expect(navigate).toHaveBeenCalledWith({
    to: '/solutions/$solutionId',
    params: { solutionId: 'solution-1' },
  })
})

it('preserves a saved language alias and draft state without exposing draft controls', async () => {
  const solutionWithAliasLanguage = {
    ...solution,
    language: 'PyPy3',
    isDraft: true,
  }
  vi.mocked(getCurrentUser).mockResolvedValue(currentUser)
  vi.mocked(getSolution).mockResolvedValue(solutionWithAliasLanguage)
  vi.mocked(updateSolution).mockResolvedValue(solutionWithAliasLanguage)

  renderRoute(<SolutionEditPage solutionId="solution-1" />)

  expect(
    await screen.findByRole('combobox', { name: '프로그래밍 언어' }),
  ).toHaveTextContent('PyPy3')
  expect(
    screen.queryByRole('checkbox', { name: /임시 저장/ }),
  ).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))

  await waitFor(() => {
    expect(updateSolution).toHaveBeenCalledWith(
      'solution-1',
      expect.objectContaining({ language: 'PyPy3', isDraft: true }),
    )
  })
})

it('does not render the edit form for a different author', async () => {
  vi.mocked(getCurrentUser).mockResolvedValue({
    ...currentUser,
    id: 'different-user',
  })
  vi.mocked(getSolution).mockResolvedValue(solution)

  renderRoute(<SolutionEditPage solutionId="solution-1" />)

  expect(
    await screen.findByText('작성자만 이 풀이를 수정할 수 있습니다.'),
  ).toBeVisible()
  expect(
    screen.queryByRole('button', { name: '변경사항 저장' }),
  ).not.toBeInTheDocument()
})

it('prompts for login when the current user session has expired', async () => {
  vi.mocked(getCurrentUser).mockRejectedValue(new AuthSessionExpiredError())
  vi.mocked(getSolution).mockResolvedValue(solution)

  renderRoute(<SolutionEditPage solutionId="solution-1" />)

  expect(
    await screen.findByText('풀이를 수정하려면 로그인해 주세요.'),
  ).toBeVisible()
  expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute(
    'href',
    '/login',
  )
  expect(
    screen.queryByRole('button', { name: '변경사항 저장' }),
  ).not.toBeInTheDocument()
})

it('returns to the solution list when the solution being edited is missing', async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(currentUser)
  vi.mocked(getSolution).mockRejectedValue(
    new ApiError('Not found', 404, new Response(null, { status: 404 }), null),
  )

  renderRoute(<SolutionEditPage solutionId="missing" />)

  expect(await screen.findByText('풀이를 찾을 수 없습니다.')).toBeVisible()
  expect(
    screen.getByRole('link', { name: '풀이 목록으로 돌아가기' }),
  ).toHaveAttribute('href', '/solutions')
})

it('shows a forbidden error returned by the update endpoint', async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(currentUser)
  vi.mocked(getSolution).mockResolvedValue(solution)
  vi.mocked(updateSolution).mockRejectedValue(
    new ApiError('Forbidden', 403, new Response(null, { status: 403 }), {
      message: 'Forbidden',
    }),
  )

  renderRoute(<SolutionEditPage solutionId="solution-1" />)

  await userEvent.click(
    await screen.findByRole('button', { name: '변경사항 저장' }),
  )

  expect(
    await screen.findByText('이 풀이를 수정할 권한이 없습니다.'),
  ).toBeVisible()
})

it('prevents submission when the existing code is empty', async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(currentUser)
  vi.mocked(getSolution).mockResolvedValue({ ...solution, code: '' })

  renderRoute(<SolutionEditPage solutionId="solution-1" />)

  await userEvent.click(
    await screen.findByRole('button', { name: '변경사항 저장' }),
  )

  expect(await screen.findByText('소스 코드를 입력해 주세요.')).toBeVisible()
  expect(updateSolution).not.toHaveBeenCalled()
})

it('rejects execution metrics outside the server integer range', async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(currentUser)
  vi.mocked(getSolution).mockResolvedValue(solution)

  renderRoute(<SolutionEditPage solutionId="solution-1" />)

  const memoryUsageInput = await screen.findByRole('spinbutton', {
    name: /메모리 사용량/,
  })
  await userEvent.clear(memoryUsageInput)
  await userEvent.type(memoryUsageInput, '2147483648')
  await userEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))

  expect(
    await screen.findByText(
      '메모리 사용량은 -2,147,483,648부터 2,147,483,647 사이의 정수로 입력해 주세요.',
    ),
  ).toBeVisible()
  await waitFor(() => expect(memoryUsageInput).toHaveFocus())
  expect(memoryUsageInput).toHaveValue(2_147_483_648)
  expect(updateSolution).not.toHaveBeenCalled()
})

it('rejects a native bad number input without restoring the previous metric', async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(currentUser)
  vi.mocked(getSolution).mockResolvedValue(solution)

  renderRoute(<SolutionEditPage solutionId="solution-1" />)

  const memoryUsageInput = await screen.findByRole('spinbutton', {
    name: /메모리 사용량/,
  })
  Object.defineProperty(memoryUsageInput, 'validity', {
    configurable: true,
    value: { badInput: true },
  })
  fireEvent.input(memoryUsageInput, { target: { value: '' } })
  await userEvent.click(screen.getByRole('button', { name: '변경사항 저장' }))

  expect(
    await screen.findByText(
      '메모리 사용량은 -2,147,483,648부터 2,147,483,647 사이의 정수로 입력해 주세요.',
    ),
  ).toBeVisible()
  await waitFor(() => expect(memoryUsageInput).toHaveFocus())
  expect(memoryUsageInput).toHaveValue(null)
  expect(updateSolution).not.toHaveBeenCalled()
})

function renderRoute(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
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

const currentUser = {
  id: 'user-1',
  email: 'user@example.com',
  nickname: 'user',
}

const solution: SolutionDetail = {
  id: 'solution-1',
  problemId: 'problem-1',
  userId: currentUser.id,
  language: 'Java',
  code: 'class Main {}',
  description: '기존 설명',
  isSolved: true,
  isDraft: false,
  memoryUsage: 14_128,
  timeElapsed: 104,
  createdAt: '2026-08-01T01:00:00',
  updatedAt: '2026-08-01T02:00:00',
}
