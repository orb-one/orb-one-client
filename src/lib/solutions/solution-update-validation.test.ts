import { expect, it } from 'vitest'

import { validateSolutionUpdateForm } from '@/lib/solutions/solution-update-validation'

const validValues = {
  language: ' Java ',
  code: 'class Main {}',
  isSolved: null,
  isDraft: null,
  memoryUsage: null,
  timeElapsed: null,
  description: null,
}

it('validates and normalizes a complete update request', () => {
  expect(validateSolutionUpdateForm(validValues)).toEqual({
    ok: true,
    request: {
      ...validValues,
      language: 'Java',
    },
  })
})

it('rejects missing required update fields', () => {
  expect(validateSolutionUpdateForm({ ...validValues, language: ' ' })).toEqual(
    { ok: false, error: 'languageRequired' },
  )
  expect(validateSolutionUpdateForm({ ...validValues, code: ' ' })).toEqual({
    ok: false,
    error: 'codeRequired',
  })
})
