import { describe, expect, it } from 'vitest'
import type { Practice } from '@/lib/api/practice'
import { sortPractices } from './sort-practices'

function createPractice(
  id: string,
  startDate: string,
  endDate: string,
): Practice {
  return {
    id,
    title: `연습 ${id}`,
    startDate,
    endDate,
    groupId: 'group-1',
    createdAt: '2026-01-01T00:00:00',
    updatedAt: '2026-01-01T00:00:00',
  }
}

describe('sortPractices', () => {
  const baseNow = new Date('2026-10-10T12:00:00Z').getTime()

  it('진행 중인 연습을 종료되거나 예정된 연습보다 상단에 배치합니다', () => {
    const past = createPractice(
      'past',
      '2026-10-01T00:00:00Z',
      '2026-10-05T23:59:59Z',
    )
    const ongoing = createPractice(
      'ongoing',
      '2026-10-08T00:00:00Z',
      '2026-10-12T23:59:59Z',
    )
    const future = createPractice(
      'future',
      '2026-10-15T00:00:00Z',
      '2026-10-20T23:59:59Z',
    )

    const result = sortPractices([past, future, ongoing], baseNow)
    expect(result.map((p) => p.id)).toEqual(['ongoing', 'future', 'past'])
  })

  it('진행 중인 연습이 여러 개인 경우 시작일 기준 최신순으로 정렬합니다', () => {
    const ongoing1 = createPractice(
      'ongoing-old',
      '2026-10-07T00:00:00Z',
      '2026-10-12T23:59:59Z',
    )
    const ongoing2 = createPractice(
      'ongoing-new',
      '2026-10-09T00:00:00Z',
      '2026-10-12T23:59:59Z',
    )

    const result = sortPractices([ongoing1, ongoing2], baseNow)
    expect(result.map((p) => p.id)).toEqual(['ongoing-new', 'ongoing-old'])
  })

  it('빈 배열인 경우 빈 배열을 반환합니다', () => {
    expect(sortPractices([], baseNow)).toEqual([])
  })
})
