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
  url: string
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
  page: number
  size: number
}

export async function getProblems({
  page,
  size,
}: GetProblemsParams): Promise<ProblemPage> {
  const searchParams = new URLSearchParams({
    page: String(page),
    size: String(size),
  })
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

function toProblem(response: ProblemResponse): Problem {
  return {
    id: response.problemId,
    provider: response.provider,
    externalId: response.externalProblemId,
    name: response.name,
    url: response.url,
    difficulty: response.difficulty,
  }
}
