import { apiClient } from '@/lib/api/client'
import type {
  Problem,
  ProblemPage,
  ProblemProvider,
} from '@/lib/problems/problem-model'

export interface ProblemResponse {
  problemId: string
  provider: ProblemProvider
  externalProblemId: string
  name: string
  url: string | null
  difficulty: string | null
}

export interface AdminProblemRequest {
  provider: ProblemProvider
  externalProblemId: string
  name: string
  url: string | null
  difficulty: string | null
}

export interface ProblemListResponse {
  problems: ProblemResponse[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface GetProblemsParams {
  difficulty?: string
  keyword?: string
  page: number
  provider?: ProblemProvider
  size: number
}

export async function getProblems({
  difficulty,
  keyword,
  page,
  provider,
  size,
}: GetProblemsParams): Promise<ProblemPage> {
  const searchParams = new URLSearchParams({
    page: String(page),
    size: String(size),
  })
  const normalizedDifficulty = difficulty?.trim()
  const normalizedKeyword = keyword?.trim()

  if (normalizedKeyword) {
    searchParams.set('keyword', normalizedKeyword)
  }

  if (provider) {
    searchParams.set('provider', provider)
  }

  if (normalizedDifficulty) {
    searchParams.set('difficulty', normalizedDifficulty)
  }

  const response = await apiClient<ProblemListResponse>(
    `/problems?${searchParams.toString()}`,
  )

  return {
    ...response,
    problems: response.problems.map(toProblem),
  }
}

export async function getProblem(problemId: string): Promise<Problem> {
  const response = await apiClient<ProblemResponse>(
    `/problems/${encodeURIComponent(problemId)}`,
  )

  return toProblem(response)
}

export async function createCatalogProblem(request: AdminProblemRequest) {
  const response = await apiClient<ProblemResponse>('/admin/problems', {
    method: 'POST',
    body: request,
  })

  return toProblem(response)
}

export async function updateCatalogProblem(
  problemId: string,
  request: AdminProblemRequest,
) {
  const response = await apiClient<ProblemResponse>(
    `/admin/problems/${encodeURIComponent(problemId)}`,
    { method: 'PUT', body: request },
  )

  return toProblem(response)
}

export function deleteCatalogProblem(problemId: string) {
  return apiClient<undefined>(
    `/admin/problems/${encodeURIComponent(problemId)}`,
    {
      method: 'DELETE',
    },
  )
}

function toProblem(response: ProblemResponse): Problem {
  return {
    id: response.problemId,
    provider: response.provider,
    externalId: response.externalProblemId,
    name: response.name,
    url: response.url ?? '',
    difficulty: response.difficulty,
  }
}
