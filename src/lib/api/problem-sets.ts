import { apiClient } from '@/lib/api/client'

// 1. API Response DTO

// 문제집 목록 조회 API Response DTO
export interface ProblemSetResponse {
  problemSetId: string
  name: string
  problemCount: number
  createdBy: string
  createdAt: string
}

// 문제 API Response DTO
export interface ProblemResponse {
  problemId: string
  provider: string
  externalProblemId: string
  name: string
  url: string
  difficulty: string
}

// 문제집 상세 조회 API Response DTO
export interface ProblemSetDetailResponse {
  problemSetId: string
  groupId: string
  name: string
  problems: ProblemResponse[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 2. 도메인 모델

// 문제집 목록 도메인 모델
export interface ProblemSet {
  problemSetId: string
  name: string
  problemCount: number
  createdBy: string
  createdAt: string
}

// 개별 문제 도메인 모델
export interface Problem {
  problemId: string
  provider: string
  externalProblemId: string
  name: string
  url: string
  difficulty: string
}

// 문제집 상세 도메인 모델
export interface ProblemSetDetail {
  problemSetId: string
  groupId: string
  name: string
  problems: Problem[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 3. Mapper 함수

export function mapProblemSet(response: ProblemSetResponse): ProblemSet {
  return {
    problemSetId: response.problemSetId,
    name: response.name,
    problemCount: response.problemCount,
    createdBy: response.createdBy,
    createdAt: response.createdAt,
  }
}

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

// 4. API 호출 함수

// 문제집 전체 목록 조회
// GET /groups/{groupId}/problem-sets
export async function getProblemSets(groupId: string): Promise<ProblemSet[]> {
  const response = await apiClient<ProblemSetResponse[]>(
    `/groups/${encodeURIComponent(groupId)}/problem-sets`,
  )
  return response.map(mapProblemSet)
}

// 문제집 상세 및 문제 목록 조회
// GET /groups/{groupId}/problem-sets/{problemSetId}
export async function getProblemSetDetail(
  groupId: string,
  problemSetId: string,
): Promise<ProblemSetDetail> {
  const response = await apiClient<ProblemSetDetailResponse>(
    `/groups/${encodeURIComponent(groupId)}/problem-sets/${encodeURIComponent(problemSetId)}`,
  )
  return mapProblemSetDetail(response)
}
