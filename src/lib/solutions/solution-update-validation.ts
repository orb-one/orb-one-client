import type { UpdateSolutionRequest } from '@/lib/api/solutions'

export type SolutionUpdateFormError =
  | 'languageRequired'
  | 'codeRequired'
  | 'memoryUsageInvalid'
  | 'timeElapsedInvalid'

export interface SolutionUpdateFormValues extends UpdateSolutionRequest {
  memoryUsageInput?: string
  timeElapsedInput?: string
}

export type SolutionUpdateValidationResult =
  | { ok: true; request: UpdateSolutionRequest }
  | { ok: false; error: SolutionUpdateFormError }

export function validateSolutionUpdateForm(
  values: SolutionUpdateFormValues,
): SolutionUpdateValidationResult {
  const language = values.language.trim()
  const memoryUsage = getOptionalInteger(
    values.memoryUsageInput,
    values.memoryUsage,
  )
  const timeElapsed = getOptionalInteger(
    values.timeElapsedInput,
    values.timeElapsed,
  )

  if (!language) {
    return { ok: false, error: 'languageRequired' }
  }

  if (!values.code.trim()) {
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
      language,
      code: values.code,
      description: values.description,
      isSolved: values.isSolved,
      isDraft: values.isDraft,
      memoryUsage,
      timeElapsed,
    },
  }
}

const MIN_SERVER_INTEGER = -2_147_483_648
const MAX_SERVER_INTEGER = 2_147_483_647

function getOptionalInteger(
  input: string | undefined,
  fallback: number | null,
) {
  if (input === undefined) {
    return isServerInteger(fallback) ? fallback : undefined
  }

  const value = input.trim()

  if (!value) {
    return null
  }

  const parsedValue = Number(value)

  return isServerInteger(parsedValue) ? parsedValue : undefined
}

function isServerInteger(value: number | null): boolean {
  return (
    value === null ||
    (Number.isInteger(value) &&
      value >= MIN_SERVER_INTEGER &&
      value <= MAX_SERVER_INTEGER)
  )
}
