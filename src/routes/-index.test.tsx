import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

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

it('renders the study landing page with a centered message and real product imagery', () => {
  render(<LandingPage />)

  const heading = screen.getByRole('heading', {
    name: '같은 문제를 풀고 서로의 풀이에서 함께 배우세요',
    level: 1,
  })

  expect(heading).toBeVisible()
  expect(within(heading).getByText('함께')).toHaveClass(
    'text-[var(--color-accent)]',
  )
  expect(
    screen.getByText(
      '함께 풀 문제를 정하고 각자의 코드와 풀이를 한곳에서 나누세요',
    ),
  ).toBeVisible()

  const preview = screen.getByRole('group', {
    name: '오브원 제품 화면 미리보기',
  })
  expect(
    within(preview).getByRole('img', {
      name: '그룹에서 함께 풀 문제를 정리한 문제집 화면',
    }),
  ).toHaveAttribute('fetchpriority', 'high')
  expect(
    within(preview).getByRole('img', {
      name: '코드와 풀이 설명을 함께 보여주는 풀이 상세 화면',
    }),
  ).toHaveAttribute('loading', 'eager')

  expect(
    screen.getByRole('heading', {
      name: '어디서 고르든 한 문제집으로',
      level: 2,
    }),
  ).toBeVisible()
  expect(
    screen.getByText(
      '여러 사이트에서 고른 문제를 한 문제집에 모아 함께 푸세요',
    ),
  ).toBeVisible()
  expect(
    screen.getByRole('img', { name: 'Baekjoon Online Judge' }),
  ).toBeVisible()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.getAllByRole('link')).toHaveLength(1)
  expect(
    screen.getByRole('link', { name: '오픈소스 라이선스' }),
  ).toHaveAttribute('href', '/THIRD_PARTY_LICENSES.txt')
})

it('uses the active locale for the hero and provider copy', () => {
  useAppStore.getState().setLocale('en')

  render(<LandingPage />)

  const heading = screen.getByRole('heading', {
    name: 'Solve the same problems and learn together',
    level: 1,
  })

  expect(within(heading).getByText('together')).toHaveClass(
    'text-[var(--color-accent)]',
  )
  expect(
    screen.getByText(
      'Pick problems, share code, and compare solutions in one place',
    ),
  ).toBeVisible()
  expect(
    screen.getByRole('heading', {
      name: 'One problem set for any site',
      level: 2,
    }),
  ).toBeVisible()
  expect(
    screen.getByText(
      'Collect problems from different sites and solve them with your group',
    ),
  ).toBeVisible()
  expect(
    screen.getByRole('group', { name: 'Orb One product preview' }),
  ).toBeVisible()
  expect(
    screen.getByRole('link', { name: 'Open source licenses' }),
  ).toHaveAttribute('href', '/THIRD_PARTY_LICENSES.txt')
})
