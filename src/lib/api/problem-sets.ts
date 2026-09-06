import { apiClient } from '@/lib/api/client'

// 1. API Request & Response DTO

// 1) [문제집 목록 조회 DTO] (GET /groups/{groupId}/problem-sets?page=0&size=20)
export interface ProblemSetResponse {
  problemSetId: string
  name: string
  problemCount: number
  createdBy: string
  createdAt: string
}

export interface GetProblemSetsParams {
  page?: number
  size?: number
}

export interface GetProblemSetsResponse {
  items: ProblemSetResponse[]
  page: number
  size: number
  totalCount: number
  hasNext: boolean
}

// 2) [개별 문제 항목 DTO]
export interface ProblemResponse {
  problemId: string
  provider: string
  externalProblemId: string
  name: string
  url: string
  difficulty: string | null
}

// 3) [문제집 상세 및 문제 목록 조회 DTO] (GET /groups/{groupId}/problem-sets/{problemSetId}?page=0&size=20)
export interface GetProblemSetDetailParams {
  page?: number
  size?: number
}

export interface ProblemSetDetailResponse {
  problemSetId: string
  groupId: string
  name: string
  items: ProblemResponse[]
  page: number
  size: number
  totalCount: number
  hasNext: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 4) [문제집 생성 요청 시 포함되는 개별 문제 DTO]
export interface ProblemCreateItemDto {
  provider: string
  externalProblemId: string
  name: string
  url: string
  difficulty: string
}

// 5) [문제집 생성 요청 본문 DTO] (POST /groups/{groupId}/problem-sets)
export interface ProblemSetCreateRequest {
  name: string
  problems: ProblemCreateItemDto[]
}

// 6) [문제집 생성 응답 본문 DTO] (POST /groups/{groupId}/problem-sets)
export interface ProblemSetCreateResponse {
  problemSetId: string
  groupId: string
  name: string
  problems: ProblemResponse[]
  createdBy: string
  createdAt: string
}

// 7) [문제집 내 문제 추가 요청 본문 DTO] (POST /groups/{groupId}/problem-sets/{problemSetId}/problems)
export interface AddProblemsRequest {
  problems: ProblemCreateItemDto[]
}

// 8) [문제집 내 문제 추가 응답 본문 DTO] (POST /groups/{groupId}/problem-sets/{problemSetId}/problems)
export interface AddProblemsResponse {
  problemSetId: string
  groupId: string
  problems: ProblemResponse[]
  updatedAt: string
}

// 2. 도메인 모델

// 1) 문제집 목록 도메인
export interface ProblemSet {
  problemSetId: string
  name: string
  problemCount: number
  createdBy: string
  createdAt: string
}

// 2) 문제집 페이징 도메인
export interface PaginatedProblemSets {
  items: ProblemSet[]
  page: number
  size: number
  totalCount: number
  totalPages: number
  hasNext: boolean
}

// 3) 개별 문제 도메인
export interface Problem {
  problemId: string
  provider: string
  externalProblemId: string
  name: string
  url: string
  difficulty: string | null
}

// 4) 문제집 상세 도메인
export interface ProblemSetDetail {
  problemSetId: string
  groupId: string
  name: string
  problems: Problem[]
  page: number
  size: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 5) 문제집 생성 폼 UI 입력 상태 관리 모델
export interface ProblemFormItem {
  provider: string
  externalProblemId: string
  name: string
  url: string
  difficulty: string
}

// 6) 도메인 계층 문제 엔티티
export interface ProblemItem {
  id: string
  provider: string
  externalId: string
  name: string
  url: string
  difficulty: string | null
}

// 7) 도메인 계층 생성 완료 문제집 엔티티 (Date 객체 변환 모델)
export interface CreatedProblemSet {
  problemSetId: string
  groupId: string
  name: string
  problems: ProblemItem[]
  createdBy: string
  createdAt: Date
}

// 3. Mapper 함수

// 1) 문제집 목록 DTO -> 문제집 목록 도메인 변환
export function mapProblemSet(response: ProblemSetResponse): ProblemSet {
  return {
    problemSetId: response.problemSetId,
    name: response.name,
    problemCount: response.problemCount,
    createdBy: response.createdBy,
    createdAt: response.createdAt,
  }
}

// 2) 문제집 페이징 DTO -> 문제집 페이징 도메인 변환
export function mapPaginatedProblemSets(
  response: GetProblemSetsResponse,
): PaginatedProblemSets {
  const size = response.size || 20
  const totalCount = response.totalCount || 0
  const totalPages = Math.max(1, Math.ceil(totalCount / size))

  return {
    items: response.items.map(mapProblemSet),
    page: response.page,
    size: response.size,
    totalCount: response.totalCount,
    totalPages,
    hasNext: response.hasNext,
  }
}

// 3) 개별 문제 DTO -> 개별 문제 도메인 변환
export function mapProblem(response: ProblemResponse): Problem {
  return {
    problemId: response.problemId,
    provider: response.provider,
    externalProblemId: response.externalProblemId,
    name: response.name,
    url: response.url,
    difficulty: response.difficulty ?? null,
  }
}

// 4) 문제집 상세 DTO -> 문제집 상세 도메인 변환
export function mapProblemSetDetail(
  response: ProblemSetDetailResponse,
): ProblemSetDetail {
  const size = response.size || 20
  const totalCount = response.totalCount || 0
  const totalPages = Math.max(1, Math.ceil(totalCount / size))

  return {
    problemSetId: response.problemSetId,
    groupId: response.groupId,
    name: response.name,
    problems: response.items.map(mapProblem),
    page: response.page,
    size: response.size,
    totalCount: response.totalCount,
    totalPages,
    hasNext: response.hasNext,
    createdBy: response.createdBy,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  }
}

// 5) 문제집 생성 요청 폼 -> 문제집 생성 요청 DTO 변환
export function toProblemSetCreateRequest(
  name: string,
  problems: ProblemFormItem[],
): ProblemSetCreateRequest {
  return {
    name: name.trim(),
    problems: problems.map((p) => ({
      provider: p.provider.trim(),
      externalProblemId: p.externalProblemId.trim(),
      name: p.name.trim(),
      url: p.url.trim(),
      difficulty: p.difficulty.trim(),
    })),
  }
}

// 6) 문제집 내 문제 추가 요청 폼 -> 문제집 내 문제 추가 요청 DTO 변환
export function toAddProblemsRequest(
  problems: ProblemFormItem[],
): AddProblemsRequest {
  return {
    problems: problems.map((p) => ({
      provider: p.provider.trim(),
      externalProblemId: p.externalProblemId.trim(),
      name: p.name.trim(),
      url: p.url.trim(),
      difficulty: p.difficulty.trim(),
    })),
  }
}

// 7) 문제집 생성 응답 DTO -> 생성 완료 문제집 엔티티 변환
export function toCreatedProblemSetDomain(
  dto: ProblemSetCreateResponse,
): CreatedProblemSet {
  return {
    problemSetId: dto.problemSetId,
    groupId: dto.groupId,
    name: dto.name,
    problems: dto.problems.map((p) => ({
      id: p.problemId,
      provider: p.provider,
      externalId: p.externalProblemId,
      name: p.name,
      url: p.url,
      difficulty: p.difficulty ?? null,
    })),
    createdBy: dto.createdBy,
    createdAt: new Date(dto.createdAt),
  }
}

// 4. API 요청 함수

// 1) 문제집 전체 목록 조회 (GET /groups/{groupId}/problem-sets?page=0&size=20)
export async function getProblemSets(
  groupId: string,
  params: GetProblemSetsParams = { page: 0, size: 20 },
): Promise<PaginatedProblemSets> {
  const encodedGroupId = encodeURIComponent(groupId)
  const page = params.page ?? 0
  const size = params.size ?? 20

  const query = new URLSearchParams()
  query.set('page', String(page))
  query.set('size', String(size))

  const response = await apiClient<GetProblemSetsResponse>(
    `/groups/${encodedGroupId}/problem-sets?${query.toString()}`,
  )

  return mapPaginatedProblemSets(response)
}

// 2) 문제집 상세 정보 및 문제 목록 조회 (GET /groups/{groupId}/problem-sets/{problemSetId}?page=0&size=20)
export async function getProblemSetDetail(
  groupId: string,
  problemSetId: string,
  params: GetProblemSetDetailParams = { page: 0, size: 20 },
): Promise<ProblemSetDetail> {
  const encodedGroupId = encodeURIComponent(groupId)
  const encodedProblemSetId = encodeURIComponent(problemSetId)
  const page = params.page ?? 0
  const size = params.size ?? 20

  const query = new URLSearchParams()
  query.set('page', String(page))
  query.set('size', String(size))

  const response = await apiClient<ProblemSetDetailResponse>(
    `/groups/${encodedGroupId}/problem-sets/${encodedProblemSetId}?${query.toString()}`,
  )

  return mapProblemSetDetail(response)
}

// 3) 새 문제집 생성 (POST /groups/{groupId}/problem-sets)
export async function createProblemSet(
  groupId: string,
  data: ProblemSetCreateRequest,
): Promise<ProblemSetCreateResponse> {
  const encodedGroupId = encodeURIComponent(groupId)

  const response = await apiClient<ProblemSetCreateResponse>(
    `/groups/${encodedGroupId}/problem-sets`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data,
    },
  )

  return response
}

// 4) 문제집 삭제 (DELETE /groups/{groupId}/problem-sets/{problemSetId})
export async function deleteProblemSet(
  groupId: string,
  problemSetId: string,
): Promise<void> {
  const encodedGroupId = encodeURIComponent(groupId)
  const encodedProblemSetId = encodeURIComponent(problemSetId)

  await apiClient(
    `/groups/${encodedGroupId}/problem-sets/${encodedProblemSetId}`,
    {
      method: 'DELETE',
    },
  )
}

// 5) 문제집에서 개별 문제 삭제 (DELETE /groups/{groupId}/problem-sets/{problemSetId}/problems/{problemId})
export async function deleteProblemFromProblemSet(
  groupId: string,
  problemSetId: string,
  problemId: string,
): Promise<void> {
  const encodedGroupId = encodeURIComponent(groupId)
  const encodedProblemSetId = encodeURIComponent(problemSetId)
  const encodedProblemId = encodeURIComponent(problemId)

  await apiClient(
    `/groups/${encodedGroupId}/problem-sets/${encodedProblemSetId}/problems/${encodedProblemId}`,
    {
      method: 'DELETE',
    },
  )
}

// 6) 문제집에 새 문제 추가 (POST /groups/{groupId}/problem-sets/{problemSetId}/problems)
export async function addProblemsToProblemSet(
  groupId: string,
  problemSetId: string,
  data: AddProblemsRequest,
): Promise<AddProblemsResponse> {
  const encodedGroupId = encodeURIComponent(groupId)
  const encodedProblemSetId = encodeURIComponent(problemSetId)

  const response = await apiClient<AddProblemsResponse>(
    `/groups/${encodedGroupId}/problem-sets/${encodedProblemSetId}/problems`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data,
    },
  )

  return response
}
