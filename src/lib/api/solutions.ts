import { apiClient } from '@/lib/api/client'
import type {
  SolutionDetail,
  SolutionSummary,
} from '@/lib/solutions/solution-model'
import type { ProblemProvider } from '@/lib/problems/problem-model'

export interface GetSolutionsParams {
  problemId?: string
}

export interface CreateSolutionRequest {
  problemId: string
  language: string
  code: string
  isSolved: boolean
  isDraft: false
  memoryUsage: number | null
  timeElapsed: number | null
  description: string | null
}

export interface CreateSolutionResult {
  id: string
}

export interface UpdateSolutionRequest {
  language: string
  code: string
  isSolved: boolean | null
  isDraft: boolean | null
  memoryUsage: number | null
  timeElapsed: number | null
  description: string | null
}

// 목록과 상세 응답이 공통으로 제공하는 풀이 메타데이터다.
interface SolutionBaseResponse {
  solutionId: string
  problemId: string
  userId: string
  authorNickname?: string | null
  language: string | null
  isSolved: boolean | null
  isDraft: boolean | null
  createdAt: string | null
}

// 문제 레코드를 찾지 못한 기존 데이터는 서버가 문제 정보를 null로 응답한다.
export interface SolutionSummaryResponse extends SolutionBaseResponse {
  problemName: string | null
  problemProvider: ProblemProvider | null
  problemNumber: string | null
  problemDifficulty: string | null
}

export interface SolutionDetailResponse extends SolutionBaseResponse {
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

  return mapSolutionDetail(response)
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

export async function updateSolution(
  solutionId: string,
  request: UpdateSolutionRequest,
): Promise<SolutionDetail> {
  const response = await apiClient<SolutionDetailResponse>(
    `/solutions/${encodeURIComponent(solutionId)}`,
    {
      method: 'PUT',
      body: request,
    },
  )

  return mapSolutionDetail(response)
}

/** 작성자의 풀이를 복구 유예 상태로 삭제한다. */
export async function deleteSolution(solutionId: string): Promise<void> {
  await apiClient<undefined>(`/solutions/${encodeURIComponent(solutionId)}`, {
    method: 'DELETE',
  })
}

/** 삭제 유예 시간 안에 작성자의 풀이를 복구한다. */
export async function restoreSolution(solutionId: string): Promise<void> {
  await apiClient<undefined>(
    `/solutions/${encodeURIComponent(solutionId)}/restore`,
    {
      method: 'POST',
    },
  )
}

function mapSolutionSummary(
  response: SolutionSummaryResponse,
): SolutionSummary {
  return {
    ...mapSolutionBase(response),
    problemName: response.problemName,
    problemProvider: response.problemProvider,
    problemNumber: response.problemNumber,
    problemDifficulty: response.problemDifficulty,
  }
}

function mapSolutionDetail(response: SolutionDetailResponse): SolutionDetail {
  return {
    ...mapSolutionBase(response),
    // 기존 nullable 데이터도 상세 화면에서 안전하게 렌더링할 수 있게 한다.
    code: response.code ?? '',
    description: response.description ?? '',
    memoryUsage: response.memoryUsage,
    timeElapsed: response.timeElapsed,
    updatedAt: response.updatedAt,
  }
}

function mapSolutionBase(response: SolutionBaseResponse) {
  return {
    id: response.solutionId,
    problemId: response.problemId,
    userId: response.userId,
    ...(response.authorNickname !== undefined
      ? { authorNickname: response.authorNickname }
      : {}),
    language: response.language,
    isSolved: response.isSolved,
    isDraft: response.isDraft,
    createdAt: response.createdAt,
  }
}
