import { expect, it } from 'vitest'

import type { SolutionSummary } from '@/lib/solutions/solution-model'
import {
  filterSolutions,
  getSolutionState,
} from '@/lib/solutions/solution-state'

it('gives draft state precedence over the solved flag', () => {
  expect(getSolutionState({ isDraft: true, isSolved: true })).toBe('draft')
  expect(getSolutionState({ isDraft: false, isSolved: true })).toBe('solved')
  expect(getSolutionState({ isDraft: false, isSolved: false })).toBe('unsolved')
  expect(getSolutionState({ isDraft: null, isSolved: null })).toBe('unknown')
})

it('filters solutions by language and display state', () => {
  const solutions = [
    createSolution('java-solved', 'Java', false, true),
    createSolution('java-draft', 'Java', true, false),
    createSolution('python-solved', 'Python', false, true),
  ]

  expect(
    filterSolutions(solutions, {
      languages: ['Java'],
      states: ['solved'],
    }).map((solution) => solution.id),
  ).toEqual(['java-solved'])
  expect(filterSolutions(solutions, { languages: [], states: [] })).toEqual(
    solutions,
  )
})

function createSolution(
  id: string,
  language: string,
  isDraft: boolean,
  isSolved: boolean,
): SolutionSummary {
  return {
    id,
    problemId: 'problem-1',
    userId: 'user-1',
    isDraft,
    isSolved,
    language,
    createdAt: null,
  }
}
