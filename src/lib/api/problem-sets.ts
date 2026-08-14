import { apiClient } from '@/lib/api/client'

// 1. API Response DTO & 도메인 모델
export interface ProblemSetResponse {
  id: string
  name: string
  is_public: boolean
  start_date: string
  end_date: string
  group_id: string
  created_at: string
  updated_at: string
}

export interface ProblemSet {
  id: string
  name: string
  isPublic: boolean
  startDate: string
  endDate: string
  groupId: string
  createdAt: string
  updatedAt: string
}

// 2. Mapper 함수 (DTO ➔ Domain)
export function mapProblemSet(response: ProblemSetResponse): ProblemSet {
  return {
    id: response.id,
    name: response.name,
    isPublic: response.is_public,
    startDate: response.start_date,
    endDate: response.end_date,
    groupId: response.group_id,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  }
}

// 3. API 요청 함수
export async function getProblemSets(groupId: string): Promise<ProblemSet[]> {
  const response = await apiClient<ProblemSetResponse[]>(
    `/groups/${encodeURIComponent(groupId)}/problem-sets`,
  )
  return response.map(mapProblemSet)
}
