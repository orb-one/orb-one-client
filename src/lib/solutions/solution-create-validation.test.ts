import { expect, it } from 'vitest'

import { validateSolutionCreateForm } from '@/lib/solutions/solution-create-validation'

it('creates a complete request while preserving text whitespace', () => {
  const formData = createFormData({
    problemId: ' problem-1 ',
    language: ' Java ',
    code: '  class Main {}\n',
  })

  expect(
    validateSolutionCreateForm(formData, {
      description: '  풀이 설명\n',
      isSolved: true,
      memoryUsage: '12345',
      timeElapsed: '67',
    }),
  ).toEqual({
    ok: true,
    request: {
      problemId: 'problem-1',
      language: 'Java',
      code: '  class Main {}\n',
      description: '  풀이 설명\n',
      isSolved: true,
      isDraft: false,
      memoryUsage: 12_345,
      timeElapsed: 67,
    },
  })
})

it('normalizes empty optional fields and publishes the solution', () => {
  const formData = createFormData({
    problemId: 'problem-1',
    language: 'Java',
    code: 'class Main {}',
  })

  expect(validateSolutionCreateForm(formData, emptyOptionalValues)).toEqual({
    ok: true,
    request: {
      problemId: 'problem-1',
      language: 'Java',
      code: 'class Main {}',
      description: null,
      isSolved: false,
      isDraft: false,
      memoryUsage: null,
      timeElapsed: null,
    },
  })
})

it.each([
  ['problemId', { problemId: '' }, 'problemIdRequired'],
  ['language', { language: '' }, 'languageRequired'],
  ['code', { code: ' \n ' }, 'codeRequired'],
] as const)('rejects a missing %s', (_field, overrides, expectedError) => {
  const formData = createFormData({
    problemId: 'problem-1',
    language: 'Java',
    code: 'class Main {}',
    ...overrides,
  })

  expect(validateSolutionCreateForm(formData, emptyOptionalValues)).toEqual({
    ok: false,
    error: expectedError,
  })
})

it.each([
  ['memory usage below zero', { memoryUsage: '-1' }, 'memoryUsageInvalid'],
  ['decimal memory usage', { memoryUsage: '1.5' }, 'memoryUsageInvalid'],
  [
    'memory usage above the server integer range',
    { memoryUsage: '2147483648' },
    'memoryUsageInvalid',
  ],
  ['elapsed time below zero', { timeElapsed: '-1' }, 'timeElapsedInvalid'],
  ['decimal elapsed time', { timeElapsed: '1.5' }, 'timeElapsedInvalid'],
  [
    'elapsed time above the server integer range',
    { timeElapsed: '2147483648' },
    'timeElapsedInvalid',
  ],
] as const)('rejects %s', (_case, overrides, expectedError) => {
  const formData = createFormData({
    problemId: 'problem-1',
    language: 'Java',
    code: 'class Main {}',
  })

  expect(
    validateSolutionCreateForm(formData, {
      ...emptyOptionalValues,
      ...overrides,
    }),
  ).toEqual({ ok: false, error: expectedError })
})

const emptyOptionalValues = {
  description: '',
  isSolved: false,
  memoryUsage: '',
  timeElapsed: '',
}

function createFormData(values: {
  problemId: string
  language: string
  code: string
}) {
  const formData = new FormData()

  for (const [name, value] of Object.entries(values)) {
    formData.set(name, value)
  }

  return formData
}
