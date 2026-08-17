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

it.each([
  ['decimal memory usage', { memoryUsageInput: '1.5' }, 'memoryUsageInvalid'],
  [
    'memory usage below the server integer range',
    { memoryUsageInput: '-2147483649' },
    'memoryUsageInvalid',
  ],
  [
    'memory usage above the server integer range',
    { memoryUsageInput: '2147483648' },
    'memoryUsageInvalid',
  ],
  ['decimal elapsed time', { timeElapsedInput: '1.5' }, 'timeElapsedInvalid'],
  [
    'elapsed time below the server integer range',
    { timeElapsedInput: '-2147483649' },
    'timeElapsedInvalid',
  ],
  [
    'elapsed time above the server integer range',
    { timeElapsedInput: '2147483648' },
    'timeElapsedInvalid',
  ],
] as const)('rejects %s', (_case, overrides, expectedError) => {
  expect(validateSolutionUpdateForm({ ...validValues, ...overrides })).toEqual({
    ok: false,
    error: expectedError,
  })
})

it('accepts both signed server integer boundaries', () => {
  expect(
    validateSolutionUpdateForm({
      ...validValues,
      memoryUsageInput: '-2147483648',
      timeElapsedInput: '2147483647',
    }),
  ).toEqual({
    ok: true,
    request: {
      ...validValues,
      language: 'Java',
      memoryUsage: -2_147_483_648,
      timeElapsed: 2_147_483_647,
    },
  })
})

it('normalizes cleared execution metrics to null', () => {
  expect(
    validateSolutionUpdateForm({
      ...validValues,
      memoryUsage: 128,
      timeElapsed: 32,
      memoryUsageInput: '',
      timeElapsedInput: ' ',
    }),
  ).toEqual({
    ok: true,
    request: {
      ...validValues,
      language: 'Java',
      memoryUsage: null,
      timeElapsed: null,
    },
  })
})
