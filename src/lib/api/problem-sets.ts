import { apiClient } from '@/lib/api/client'

// 1. API Request & Response DTO

// 1) [문제집 목록 조회 응답] (GET /groups/{groupId}/problem-sets)
export interface ProblemSetResponse {
  problemSetId: string
  name: string
  problemCount: number
  createdBy: string
  createdAt: string
}

// 2) [개별 문제 항목 응답]
export interface ProblemResponse {
  problemId: string
  provider: string
  externalProblemId: string
  name: string
  url: string
  difficulty: string
}

// 3) [문제집 상세 및 문제 목록 조회 응답] (GET /groups/{groupId}/problem-sets/{problemSetId})
export interface ProblemSetDetailResponse {
  problemSetId: string
  groupId: string
  name: string
  problems: ProblemResponse[]
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

// 1) 문제집 목록 화면용 도메인 모델
export interface ProblemSet {
  problemSetId: string
  name: string
  problemCount: number
  createdBy: string
  createdAt: string
}

// 2) 개별 문제 도메인 모델
export interface Problem {
  problemId: string
  provider: string
  externalProblemId: string
  name: string
  url: string
  difficulty: string
}

// 3) 문제집 상세 페이지용 도메인 모델
export interface ProblemSetDetail {
  problemSetId: string
  groupId: string
  name: string
  problems: Problem[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 4) 문제집 생성 폼 UI 입력 상태 관리 모델
export interface ProblemFormItem {
  provider: string
  externalProblemId: string
  name: string
  url: string
  difficulty: string
}

// 5) 도메인 계층 문제 엔티티
export interface ProblemItem {
  id: string
  provider: string
  externalId: string
  name: string
  url: string
  difficulty: string
}

// 6) 도메인 계층 생성 완료 문제집 엔티티 (Date 객체 변환 모델)
export interface CreatedProblemSet {
  problemSetId: string
  groupId: string
  name: string
  problems: ProblemItem[]
  createdBy: string
  createdAt: Date
}

// 3. Mapper 함수
// 계층 간 데이터 격리를 위한 양방향 변환 함수

// 1) 문제집 요약 DTO -> 문제집 요약 도메인 변환
export function mapProblemSet(response: ProblemSetResponse): ProblemSet {
  return {
    problemSetId: response.problemSetId,
    name: response.name,
    problemCount: response.problemCount,
    createdBy: response.createdBy,
    createdAt: response.createdAt,
  }
}

// 2) 개별 문제 DTO -> 개별 문제 도메인 변환
export function mapProblem(response: ProblemResponse): Problem {
  return {
    problemId: response.problemId,
    provider: response.provider,
    externalProblemId: response.externalProblemId,
    name: response.name,
    url: response.url,
    difficulty: response.difficulty,
  }
}

// 3) 문제집 상세 DTO -> 문제집 상세 도메인 변환
export function mapProblemSetDetail(
  response: ProblemSetDetailResponse,
): ProblemSetDetail {
  return {
    problemSetId: response.problemSetId,
    groupId: response.groupId,
    name: response.name,
    problems: response.problems.map(mapProblem),
    createdBy: response.createdBy,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  }
}

// 4) 폼 입력 도메인 상태 -> 문제집 생성 요청 DTO 변환
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

// 5) 폼 입력 도메인 상태 -> 문제집 내 문제 추가 요청 DTO
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

// 6) 문제집 생성 응답 DTO -> 생성 완료 도메인 모델 변환
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
      difficulty: p.difficulty,
    })),
    createdBy: dto.createdBy,
    createdAt: new Date(dto.createdAt),
  }
}

// 4. API 요청 함수

// 1) 그룹의 문제집 전체 목록을 조회한다. (GET /groups/{groupId}/problem-sets)
export async function getProblemSets(groupId: string): Promise<ProblemSet[]> {
  const encodedGroupId = encodeURIComponent(groupId)
  const response = await apiClient<ProblemSetResponse[]>(
    `/groups/${encodedGroupId}/problem-sets`,
  )

  return response.map(mapProblemSet)
}

// 2) 문제집의 상세 정보 및 포함된 문제 목록을 조회한다. (GET /groups/{groupId}/problem-sets/{problemSetId})
export async function getProblemSetDetail(
  groupId: string,
  problemSetId: string,
): Promise<ProblemSetDetail> {
  const encodedGroupId = encodeURIComponent(groupId)
  const encodedProblemSetId = encodeURIComponent(problemSetId)

  const response = await apiClient<ProblemSetDetailResponse>(
    `/groups/${encodedGroupId}/problem-sets/${encodedProblemSetId}`,
  )

  return mapProblemSetDetail(response)
}

// 3) 그룹 내에 새 문제집 생성을 요청한다. (POST /groups/{groupId}/problem-sets)
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

// 4) 그룹 문제집을 삭제한다. (DELETE /groups/{groupId}/problem-sets/{problemSetId})
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

// 5) 문제집에서 문제를 삭제한다. (DELETE /groups/{groupId}/problem-sets/{problemSetId}/problems/{problemId})
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

// 6) 문제집에 새 문제들을 추가한다. (POST /groups/{groupId}/problem-sets/{problemSetId}/problems)
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
