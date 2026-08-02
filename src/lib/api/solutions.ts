import { apiClient } from '@/lib/api/client'
import type {
  ProblemSummary,
  SolutionDetail,
  SolutionSummary,
} from '@/lib/solutions/solution-model'

export interface GetSolutionsParams {
  // 명세상 선택값이며, 없으면 현재 사용자의 전체 풀이를 조회한다.
  problemId?: string
}

// 풀이 등록 API에 문서화된 필드만 전송한다. description은 서버 계약 확정 전까지 제외한다.
export interface CreateSolutionRequest {
  problemId: string
  language: string
  code: string
}

// API의 solutionId를 도메인 공통 명명인 id로 변환한 등록 결과
export interface CreateSolutionResult {
  id: string
}

// 아래 응답 타입은 향후 서버 DTO 변경을 한곳에서 흡수하기 위한 API 경계 모델이다.
export interface ProblemTagResponse {
  tagId: string
  name: string
}

export interface ProblemSummaryResponse {
  problemId: string
  name: string
  tier: number | null
  url: string | null
  tags?: ProblemTagResponse[]
}

export interface SolutionSummaryResponse {
  solutionId: string
  // 목록 원소가 명세에 정의되지 않아 컬럼정의서 기반 필드는 optional로 수용한다.
  problem?: ProblemSummaryResponse
  isSolved?: boolean
  isDraft?: boolean
  language?: string
  memoryUsage?: number | null
  timeElapsed?: number | null
  createdAt?: string
  updatedAt?: string
}

export interface SolutionDetailResponse extends SolutionSummaryResponse {
  // 상세 API 명세에서 두 필드는 필수 응답으로 정의된다.
  code: string
  description: string
}

export interface GetSolutionsResponse {
  solutions: SolutionSummaryResponse[]
}

export interface CreateSolutionResponse {
  solutionId: string
}

// API 응답을 그대로 노출하지 않고 UI가 일관되게 소비할 수 있는 도메인 모델로 변환한다.
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

// path parameter가 URL 경계를 넘지 않도록 solutionId를 개별 segment로 인코딩한다.
export async function getSolution(solutionId: string): Promise<SolutionDetail> {
  const response = await apiClient<SolutionDetailResponse>(
    `/solutions/${encodeURIComponent(solutionId)}`,
  )

  return {
    ...mapSolutionSummary(response),
    code: response.code,
    description: response.description,
  }
}

// 서버의 solutionId를 프론트 도메인의 공통 id 이름으로 정규화한다.
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
    problem: response.problem ? mapProblemSummary(response.problem) : null,
    // false와 0은 유효한 값이므로 논리 OR 대신 nullish coalescing을 사용한다.
    isSolved: response.isSolved ?? null,
    isDraft: response.isDraft ?? null,
    language: response.language ?? null,
    memoryUsage: response.memoryUsage ?? null,
    timeElapsed: response.timeElapsed ?? null,
    createdAt: response.createdAt ?? null,
    updatedAt: response.updatedAt ?? null,
  }
}

function mapProblemSummary(response: ProblemSummaryResponse): ProblemSummary {
  return {
    id: response.problemId,
    name: response.name,
    tier: response.tier,
    url: response.url,
    // 태그가 응답에 포함되지 않은 경우 UI에서는 빈 목록으로 취급한다.
    tags: (response.tags ?? []).map((tag) => ({
      id: tag.tagId,
      name: tag.name,
    })),
  }
}
