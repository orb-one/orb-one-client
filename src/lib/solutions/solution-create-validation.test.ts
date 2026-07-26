import { expect, it } from 'vitest'

import { validateSolutionCreateForm } from '@/lib/solutions/solution-create-validation'

it('creates a request while preserving source code whitespace', () => {
  const formData = createFormData({
    problemId: ' problem-1 ',
    language: ' Java ',
    code: '  class Main {}\n',
  })

  expect(validateSolutionCreateForm(formData)).toEqual({
    ok: true,
    request: {
      problemId: 'problem-1',
      language: 'Java',
      code: '  class Main {}\n',
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

  expect(validateSolutionCreateForm(formData)).toEqual({
    ok: false,
    error: expectedError,
  })
})

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
