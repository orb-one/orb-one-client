import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers'
import { ProblemDifficultyChip } from '@/components/problems/problem-difficulty-chip'
import { useAppStore } from '@/stores/use-app-store'

afterEach(() => {
  cleanup()
  useAppStore.getState().setLocale('ko')
})

it.each([
  ['BOJ', 'GOLD_3', 'Gold III', 'boj-gold'],
  ['BOJ', '  bronze_5  ', 'Bronze V', 'boj-bronze'],
  ['BOJ', 'UNRATED', 'Unrated', 'boj-unrated'],
  ['SWEA', 'D3', 'D3', 'swea-d3-d4'],
  ['JUNGOL', 'GOLD_3', 'Gold III', 'gray'],
  ['PROGRAMMERS', 'LEVEL_0', 'Lv. 0', 'gray'],
  ['LEETCODE', 'EASY', 'Easy', 'gray'],
  ['BOJ', 'GOLD_99', 'GOLD_99', 'gray'],
  ['SWEA', 'GOLD_3', 'GOLD_3', 'gray'],
  ['NEW_PROVIDER', 'GOLD_3', 'GOLD_3', 'gray'],
])(
  'shows %s %s without relying on color alone',
  (provider, difficulty, label, color) => {
    render(
      <AppProviders>
        <ProblemDifficultyChip provider={provider} difficulty={difficulty} />
      </AppProviders>,
    )
    expect(screen.getByText(label).closest('.astryx-token')).toHaveAttribute(
      'data-color',
      color,
    )
  },
)

it('localizes missing values and preserves the label for a stored custom value', () => {
  render(
    <AppProviders>
      <ProblemDifficultyChip provider="BOJ" difficulty={null} />
      <ProblemDifficultyChip
        provider="BOJ"
        difficulty="legacy value"
        label="기존 값: legacy value"
      />
    </AppProviders>,
  )
  expect(screen.getByText('미지정')).toBeVisible()
  expect(screen.getByText('기존 값: legacy value')).toBeVisible()

  act(() => {
    useAppStore.getState().setLocale('en')
  })
  expect(screen.getByText('Not specified')).toBeVisible()
})
