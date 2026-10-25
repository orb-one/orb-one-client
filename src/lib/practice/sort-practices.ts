import type { Practice } from '@/lib/api/practice'

/**
 * 진행 중인 연습을 최상단에 배치하고, 나머지는 시작일 기준 최신순(내림차순)으로 정렬합니다.
 *
 * @param practices 정렬할 연습 목록
 * @param now 기준 시각 (밀리초, 기본값: Date.now())
 */
export function sortPractices(
  practices: Practice[],
  now: number = Date.now(),
): Practice[] {
  return [...practices].sort((a, b) => {
    const aStart = new Date(a.startDate).getTime()
    const aEnd = new Date(a.endDate).getTime()
    const bStart = new Date(b.startDate).getTime()
    const bEnd = new Date(b.endDate).getTime()

    const aOngoing = aStart <= now && now <= aEnd
    const bOngoing = bStart <= now && now <= bEnd

    if (aOngoing && !bOngoing) return -1
    if (!aOngoing && bOngoing) return 1

    // 둘 다 진행 중이거나 둘 다 진행 중이 아닌 경우 시작일 최신순 정렬
    return bStart - aStart
  })
}
