import { apiClient } from '@/lib/api/client'

// 1. API Response DTO

// 1) [전체 그룹 조회]
export interface GroupSummaryResponse {
  id: string
  name: string
  ownerId?: string
  createdAt?: string
}

export interface GetGroupsResponse {
  groups: GroupSummaryResponse[]
}

// 2) [특정 그룹 상세 조회]
export interface GroupMemberResponse {
  userId: string
  nickname: string
  role: 'OWNER' | 'MEMBER' | string
}

export interface GetGroupDetailResponse {
  groupId: string
  groupName: string
  members: GroupMemberResponse[]
}

// 3) [그룹 가입하기]
export interface GroupJoinResponse {
  groupId: string
  userId: string
  role: string
  message: string
}


// 2. UI/프론트엔드 도메인 모델

// 1) 전체 목록용 요약 도메인
export interface GroupSummary {
  id: string
  name: string
  ownerId: string | null
  createdAt: string | null
}

// 2) 상세 페이지용 멤버 도메인
export interface GroupMember {
  userId: string
  nickname: string
  role: string
}

// 3) 상세 페이지용 전체 도메인
export interface GroupDetail {
  id: string
  name: string
  members: GroupMember[]
}


// 3. API 요청 함수

// 1) 전체 그룹 목록을 조회한다. (GET /groups)
export async function getGroups(): Promise<GroupSummary[]> {
  // UI 화면 테스트용 임시 Mock 데이터 
  await new Promise((resolve) => setTimeout(resolve, 300))
  return [
    { id: '1', name: '팀 알파 알고리즘 스터디', ownerId: 'user-1', createdAt: '2026-07-01T09:00:00Z' },
    { id: '2', name: '베타 리더스 코딩 클럽', ownerId: 'user-2', createdAt: '2026-07-05T11:00:00Z' },
    { id: '3', name: '감마 백엔드 연구소', ownerId: null, createdAt: '2026-07-10T14:00:00Z' },
  ]

  /* 실서버 연동 코드
  const response = await apiClient<GetGroupsResponse>('/groups')
  return response.groups.map(mapGroupSummary)
  */
}

// 2) 특정 그룹 상세 정보를 조회한다. (GET /groups/{groupId})
export async function getGroup(groupId: string): Promise<GroupDetail> {
  // UI 화면 테스트용 임시 Mock 데이터 
  await new Promise((resolve) => setTimeout(resolve, 300))
  const mockResponse: GetGroupDetailResponse = {
    groupId,
    groupName: '알고리즘 스터디 1반',
    members: [
      {
        userId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
        nickname: 'algo_master',
        role: 'OWNER',
      },
      {
        userId: 'e2a1a2e0-9c1a-4b1e-9a3b-2f6a1c9d5e11',
        nickname: 'code_runner',
        role: 'MEMBER',
      },
    ],
  }
  return mapGroupDetail(mockResponse)

  /* 실서버 연동 코드
  const encodedGroupId = encodeURIComponent(groupId)
  const response = await apiClient<GetGroupDetailResponse>(
    `/groups/${encodedGroupId}`,
  )

  return mapGroupDetail(response)
  */
}

function mapGroupDetail(response: GetGroupDetailResponse): GroupDetail {
  return {
    id: response.groupId,
    name: response.groupName,
    members: response.members.map((member) => ({
      userId: member.userId,
      nickname: member.nickname,
      role: member.role,
    })),
  }
}

// 3) 선택한 그룹에 멤버 가입을 요청한다. (POST /groups/{groupId}/members)
export async function joinGroup(groupId: string): Promise<GroupJoinResponse> {
  // UI 화면 테스트용 임시 Mock 리턴 
  await new Promise((resolve) => setTimeout(resolve, 300))
  return {
    groupId,
    userId: 'e2a1a2e0-9c1a-4b1e-9a3b-2f6a1c9d5e11',
    role: 'MEMBER',
    message: '그룹 가입이 완료되었습니다.',
  }

  /* 실서버 연동 코드
  const encodedGroupId = encodeURIComponent(groupId)

  const response = await apiClient<JoinGroupResponse>(
    `/groups/${encodedGroupId}/members`,
    {
      method: 'POST',
    },
  )

  return response
  */
}
