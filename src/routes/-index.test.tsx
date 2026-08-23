import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { currentUserQueryKey } from '@/lib/auth/auth-queries'
import { LandingPage } from '@/routes/index'
import { useAppStore } from '@/stores/use-app-store'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    <TOptions extends object>(options: TOptions) =>
      options,
}))

afterEach(() => {
  cleanup()
  useAppStore.getState().setLocale('ko')
})

it('renders the public landing page with real product imagery and signed-out actions', () => {
  renderLanding(null)

  expect(
    screen.getByRole('heading', {
      name: '풀이를 모으고, 함께 돌아봅니다.',
      level: 1,
    }),
  ).toBeVisible()
  expect(
    screen.getByRole('heading', {
      name: '서로 다른 문제를, 하나의 학습 흐름으로.',
    }),
  ).toBeVisible()
  expect(screen.getByText('BOJ', { selector: 'span' })).toBeVisible()

  for (const link of screen.getAllByRole('link', {
    name: '풀이 기록 시작',
  })) {
    expect(link).toHaveAttribute('href', '/register')
  }
  for (const link of screen.getAllByRole('link', { name: '로그인' })) {
    expect(link).toHaveAttribute('href', '/login')
  }

  expect(
    screen.getByRole('group', {
      name: '그룹 문제집에서 여러 제공자의 문제와 연결된 풀이를 함께 보는 예시',
    }),
  ).toBeVisible()
  expect(
    screen.getByRole('img', { name: 'Baekjoon Online Judge' }),
  ).toBeVisible()
  expect(
    screen.getByRole('img', {
      name: '코드와 풀이 설명을 함께 보여주는 풀이 상세 화면',
    }),
  ).toHaveAttribute('loading', 'lazy')
  expect(
    screen.getByRole('img', {
      name: '그룹에서 함께 풀 문제를 정리한 문제집 화면',
    }),
  ).toHaveAttribute('loading', 'lazy')
  expect(screen.queryByText('Frontend starter')).not.toBeInTheDocument()
})

it('routes signed-in landing actions to saved solutions and groups', () => {
  renderLanding({
    id: 'user-1',
    email: 'learner@example.com',
    nickname: 'algorithm-note',
  })

  for (const link of screen.getAllByRole('link', {
    name: '내 풀이 보기',
  })) {
    expect(link).toHaveAttribute('href', '/solutions')
  }
  for (const link of screen.getAllByRole('link', { name: '그룹 보기' })) {
    expect(link).toHaveAttribute('href', '/groups')
  }
  expect(
    screen.queryByRole('link', { name: '풀이 기록 시작' }),
  ).not.toBeInTheDocument()
})

it('uses the active locale for landing copy and actions', () => {
  useAppStore.getState().setLocale('en')

  renderLanding(null)

  expect(
    screen.getByRole('heading', {
      name: 'Collect solutions. Review them together.',
      level: 1,
    }),
  ).toBeVisible()
  expect(
    screen.getAllByRole('link', { name: 'Start recording' })[0],
  ).toHaveAttribute('href', '/register')
  expect(
    screen.getByRole('group', {
      name: 'Example of problems from multiple providers and their linked solutions in a group problem set',
    }),
  ).toBeVisible()
})

function renderLanding(currentUser: CurrentUser) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  })

  queryClient.setQueryData(currentUserQueryKey, currentUser)

  return renderWithClient(queryClient, <LandingPage />)
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
