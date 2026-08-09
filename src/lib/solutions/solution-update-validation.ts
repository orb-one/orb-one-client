import type { UpdateSolutionRequest } from '@/lib/api/solutions'

export type SolutionUpdateFormError = 'languageRequired' | 'codeRequired'

export type SolutionUpdateFormValues = UpdateSolutionRequest

export type SolutionUpdateValidationResult =
  | { ok: true; request: UpdateSolutionRequest }
  | { ok: false; error: SolutionUpdateFormError }

export function validateSolutionUpdateForm(
  values: SolutionUpdateFormValues,
): SolutionUpdateValidationResult {
  const language = values.language.trim()

  if (!language) {
    return { ok: false, error: 'languageRequired' }
  }

  if (!values.code.trim()) {
    return { ok: false, error: 'codeRequired' }
  }

  return {
    ok: true,
    request: {
      ...values,
      language,
    },
  }
}
