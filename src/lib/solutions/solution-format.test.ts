import { expect, it } from 'vitest'

import {
  formatSolutionElapsedTime,
  formatSolutionMemoryUsage,
  getSafeProblemUrl,
} from '@/lib/solutions/solution-format'

it('formats solution metrics with their units', () => {
  expect(formatSolutionMemoryUsage(14_128, 'ko')).toBe('14,128 KB')
  expect(formatSolutionElapsedTime(104, 'ko')).toBe('104 ms')
})

it('allows only http and https problem links', () => {
  expect(getSafeProblemUrl('https://www.acmicpc.net/problem/1000')).toBe(
    'https://www.acmicpc.net/problem/1000',
  )
  expect(getSafeProblemUrl('http://localhost:3000/problem/1')).toBe(
    'http://localhost:3000/problem/1',
  )
  expect(getSafeProblemUrl('javascript:alert(1)')).toBeNull()
  expect(getSafeProblemUrl('not-a-url')).toBeNull()
  expect(getSafeProblemUrl(null)).toBeNull()
})
