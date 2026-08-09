import { apiClient } from '@/lib/api/client'
import type { Problem, ProblemProvider } from '@/lib/problems/problem-model'

export interface ProblemResponse {
  problemId: string
  provider: ProblemProvider
  externalProblemId: string
  name: string
  url: string
  difficulty: string | null
}

export async function getProblem(problemId: string): Promise<Problem> {
  const response = await apiClient<ProblemResponse>(
    `/problems/${encodeURIComponent(problemId)}`,
  )

  return {
    id: response.problemId,
    provider: response.provider,
    externalId: response.externalProblemId,
    name: response.name,
    url: response.url,
    difficulty: response.difficulty,
  }
}
