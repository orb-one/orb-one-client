import { expect, it } from 'vitest'

import { problemQueryKeys } from '@/lib/problems/problem-queries'

it('separates problem list caches by normalized keyword and page', () => {
  expect(
    problemQueryKeys.list({
      difficulty: '  gold_3  ',
      keyword: '  1000  ',
      page: 0,
      provider: 'BOJ',
      size: 10,
    }),
  ).toEqual(['problems', 'list', '1000', 'BOJ', 'gold_3', 0, 10])
  expect(problemQueryKeys.list({ page: 1, size: 10 })).toEqual([
    'problems',
    'list',
    '',
    '',
    '',
    1,
    10,
  ])
})
