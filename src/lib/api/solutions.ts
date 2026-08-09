import { apiClient } from '@/lib/api/client'
import type {
  SolutionDetail,
  SolutionSummary,
} from '@/lib/solutions/solution-model'

export interface GetSolutionsParams {
  problemId?: string
}

export interface CreateSolutionRequest {
  problemId: string
  language: string
  code: string
}

export interface CreateSolutionResult {
  id: string
}

// 서버 DTO의 nullable 컬럼은 API 경계에서 명시적으로 수용한다.
export interface SolutionSummaryResponse {
  solutionId: string
  problemId: string
  userId: string
  language: string | null
  isSolved: boolean | null
  isDraft: boolean | null
  createdAt: string | null
}

export interface SolutionDetailResponse extends SolutionSummaryResponse {
  code: string | null
  description: string | null
  memoryUsage: number | null
  timeElapsed: number | null
  updatedAt: string | null
}

export interface GetSolutionsResponse {
  solutions: SolutionSummaryResponse[]
}

export interface CreateSolutionResponse {
  solutionId: string
}

export async function getSolutions(
  params: GetSolutionsParams = {},
): Promise<SolutionSummary[]> {
  const searchParams = new URLSearchParams()

  if (params.problemId !== undefined) {
    searchParams.set('problemId', params.problemId)
  }

  const query = searchParams.toString()
  const response = await apiClient<GetSolutionsResponse>(
    query ? `/solutions?${query}` : '/solutions',
  )

  return response.solutions.map(mapSolutionSummary)
}

export async function getSolution(solutionId: string): Promise<SolutionDetail> {
  const response = await apiClient<SolutionDetailResponse>(
    `/solutions/${encodeURIComponent(solutionId)}`,
  )

  return {
    ...mapSolutionSummary(response),
    // 기존 nullable 데이터도 상세 화면에서 안전하게 렌더링할 수 있게 한다.
    code: response.code ?? '',
    description: response.description ?? '',
    memoryUsage: response.memoryUsage,
    timeElapsed: response.timeElapsed,
    updatedAt: response.updatedAt,
  }
}

export async function createSolution(
  request: CreateSolutionRequest,
): Promise<CreateSolutionResult> {
  const response = await apiClient<CreateSolutionResponse>('/solutions', {
    method: 'POST',
    body: request,
  })

  return { id: response.solutionId }
}

function mapSolutionSummary(
  response: SolutionSummaryResponse,
): SolutionSummary {
  return {
    id: response.solutionId,
    problemId: response.problemId,
    userId: response.userId,
    language: response.language,
    isSolved: response.isSolved,
    isDraft: response.isDraft,
    createdAt: response.createdAt,
  }
}
