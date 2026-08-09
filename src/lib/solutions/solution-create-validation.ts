import type { CreateSolutionRequest } from '@/lib/api/solutions'

export type SolutionCreateFormError =
  | 'problemIdRequired'
  | 'languageRequired'
  | 'codeRequired'
  | 'memoryUsageInvalid'
  | 'timeElapsedInvalid'

export type SolutionCreateValidationResult =
  | { ok: true; request: CreateSolutionRequest }
  | { ok: false; error: SolutionCreateFormError }

export interface SolutionCreateOptionalValues {
  description: string
  isSolved: boolean
  memoryUsage: string
  timeElapsed: string
}

const MAX_SERVER_INTEGER = 2_147_483_647

export function validateSolutionCreateForm(
  formData: FormData,
  optionalValues: SolutionCreateOptionalValues,
): SolutionCreateValidationResult {
  const problemId = getString(formData, 'problemId').trim()
  const language = getString(formData, 'language').trim()
  const code = getString(formData, 'code')
  const memoryUsage = getOptionalInteger(optionalValues.memoryUsage)
  const timeElapsed = getOptionalInteger(optionalValues.timeElapsed)

  if (!problemId) {
    return { ok: false, error: 'problemIdRequired' }
  }

  if (!language) {
    return { ok: false, error: 'languageRequired' }
  }

  if (!code.trim()) {
    return { ok: false, error: 'codeRequired' }
  }

  if (memoryUsage === undefined) {
    return { ok: false, error: 'memoryUsageInvalid' }
  }

  if (timeElapsed === undefined) {
    return { ok: false, error: 'timeElapsedInvalid' }
  }

  return {
    ok: true,
    request: {
      problemId,
      language,
      code,
      isSolved: optionalValues.isSolved,
      isDraft: false,
      memoryUsage,
      timeElapsed,
      description: optionalValues.description.trim()
        ? optionalValues.description
        : null,
    },
  }
}

function getString(formData: FormData, name: string) {
  const value = formData.get(name)

  return typeof value === 'string' ? value : ''
}

function getOptionalInteger(input: string) {
  const value = input.trim()

  if (!value) {
    return null
  }

  const parsedValue = Number(value)

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 0 ||
    parsedValue > MAX_SERVER_INTEGER
  ) {
    return undefined
  }

  return parsedValue
}
