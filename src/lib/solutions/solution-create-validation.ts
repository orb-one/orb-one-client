import type { CreateSolutionRequest } from '@/lib/api/solutions'

export type SolutionCreateFormError =
  | 'problemIdRequired'
  | 'languageRequired'
  | 'codeRequired'

export type SolutionCreateValidationResult =
  | { ok: true; request: CreateSolutionRequest }
  | { ok: false; error: SolutionCreateFormError }

export function validateSolutionCreateForm(
  formData: FormData,
): SolutionCreateValidationResult {
  const problemId = getString(formData, 'problemId').trim()
  const language = getString(formData, 'language').trim()
  const code = getString(formData, 'code')

  if (!problemId) {
    return { ok: false, error: 'problemIdRequired' }
  }

  if (!language) {
    return { ok: false, error: 'languageRequired' }
  }

  if (!code.trim()) {
    return { ok: false, error: 'codeRequired' }
  }

  return {
    ok: true,
    request: {
      problemId,
      language,
      code,
    },
  }
}

function getString(formData: FormData, name: string) {
  const value = formData.get(name)

  return typeof value === 'string' ? value : ''
}
