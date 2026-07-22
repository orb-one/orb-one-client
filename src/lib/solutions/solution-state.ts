import type { SolutionSummary } from '@/lib/solutions/solution-model'

export type SolutionState = 'draft' | 'solved' | 'unsolved' | 'unknown'

export interface SolutionFilters {
  languages: string[]
  states: SolutionState[]
}

// 작성 중 상태를 정답 여부보다 우선해 한 풀이가 하나의 표시 상태만 갖게 한다.
export function getSolutionState(
  solution: Pick<SolutionSummary, 'isDraft' | 'isSolved'>,
): SolutionState {
  if (solution.isDraft) {
    return 'draft'
  }

  if (solution.isSolved === true) {
    return 'solved'
  }

  if (solution.isSolved === false) {
    return 'unsolved'
  }

  return 'unknown'
}

export function filterSolutions(
  solutions: SolutionSummary[],
  filters: SolutionFilters,
) {
  return solutions.filter((solution) => {
    const matchesLanguage =
      filters.languages.length === 0 ||
      (solution.language !== null &&
        filters.languages.includes(solution.language))
    const matchesState =
      filters.states.length === 0 ||
      filters.states.includes(getSolutionState(solution))

    return matchesLanguage && matchesState
  })
}
