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
    name: '같은 문제를 풀고, 풀이를 나누며 함께 성장하세요.',
    level: 1,
  })

  expect(heading).toBeVisible()
  expect(within(heading).getByText('함께')).toHaveClass(
    'text-[var(--color-accent)]',
  )
  expect(
    screen.getByText(
      '스터디 목표를 정하고 각자의 코드와 접근을 한곳에서 공유하는 알고리즘 스터디 워크스페이스입니다.',
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
      name: '어디서 고르든, 한 문제집으로.',
      level: 2,
    }),
  ).toBeVisible()
  expect(
    screen.getByRole('img', { name: 'Baekjoon Online Judge' }),
  ).toBeVisible()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

it('uses the active locale for the hero and provider copy', () => {
  useAppStore.getState().setLocale('en')

  render(<LandingPage />)

  const heading = screen.getByRole('heading', {
    name: 'Share solutions and grow together.',
    level: 1,
  })

  expect(within(heading).getByText('together')).toHaveClass(
    'text-[var(--color-accent)]',
  )
  expect(
    screen.getByRole('heading', {
      name: 'One problem set, whichever site you choose.',
      level: 2,
    }),
  ).toBeVisible()
  expect(
    screen.getByRole('group', { name: 'Orb One product preview' }),
  ).toBeVisible()
})
