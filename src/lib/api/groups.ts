import { apiClient } from '@/lib/api/client'

// 1. API Response DTO

// 1) [전체 그룹 조회]
export interface GroupSummaryResponse {
  groupId: string
  name: string
  nickname: string
  createdAt?: string
  isMember: boolean
}

export type GetGroupsResponse = GroupSummaryResponse[]

// 2) [특정 그룹 상세 조회]
export interface GroupMemberResponse {
  userId: string
  nickname: string
  role: string
}

export interface GroupDetailResponse {
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

// 4) [그룹 생성하기]
export interface CreateGroupRequest {
  name: string
}

export interface CreateGroupResponse {
  groupId: string
  name: string
  ownerId: string
  createdAt: string
}

// 2. UI/프론트엔드 도메인 모델

// 1) 전체 목록용 요약 도메인
export interface GroupSummary {
  groupId: string
  name: string
  nickname: string
  createdAt: string | null
  isMember: boolean
}

// 2) 상세 페이지용 멤버 도메인
export interface GroupMember {
  userId: string
  nickname: string
  role: string
}

// 3) 상세 페이지용 전체 도메인
export interface GroupDetail {
  groupId: string
  name: string
  members: GroupMember[]
}

// 3. Mapper 함수 (DTO ➔ Domain)

export function mapGroupSummary(response: GroupSummaryResponse): GroupSummary {
  return {
    groupId: response.groupId,
    name: response.name,
    nickname: response.nickname,
    createdAt: response.createdAt ?? null,
    isMember: response.isMember,
  }
}

function mapGroupDetail(response: GroupDetailResponse): GroupDetail {
  return {
    groupId: response.groupId,
    name: response.groupName,
    members: response.members.map((member) => ({
      userId: member.userId,
      nickname: member.nickname,
      role: member.role,
    })),
  }
}

// 4. API 요청 함수

// 1) 전체 그룹 목록을 조회한다. (GET /groups)
export async function getGroups(): Promise<GroupSummary[]> {
  const response = await apiClient<GroupSummaryResponse[]>('/groups')
  return response.map(mapGroupSummary)
}

// 2) 특정 그룹 상세 정보를 조회한다. (GET /groups/{groupId})
export async function getGroup(groupId: string): Promise<GroupDetail> {
  const encodedGroupId = encodeURIComponent(groupId)
  const response = await apiClient<GroupDetailResponse>(
    `/groups/${encodedGroupId}`,
  )

  return mapGroupDetail(response)
}

// 3) 선택한 그룹에 멤버 가입을 요청한다. (POST /groups/{groupId}/members)
export async function joinGroup(groupId: string): Promise<GroupJoinResponse> {
  const encodedGroupId = encodeURIComponent(groupId)

  const response = await apiClient<GroupJoinResponse>(
    `/groups/${encodedGroupId}/members`,
    {
      method: 'POST',
    },
  )

  return response
}

// 4) 그룹 생성 API (POST /groups)
export async function createGroup(
  data: CreateGroupRequest,
): Promise<CreateGroupResponse> {
  const response = await apiClient<CreateGroupResponse>('/groups', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data,
  })

  return response
}

// 5) 그룹 폐쇄 API (DELETE /groups/{groupId})
export async function deleteGroup(groupId: string): Promise<void> {
  const encodedGroupId = encodeURIComponent(groupId)

  await apiClient(`/groups/${encodedGroupId}`, {
    method: 'DELETE',
  })
}

// 6) 그룹 멤버 강퇴 API (DELETE /groups/{groupId}/members/{memberId})
export async function kickGroupMember(
  groupId: string,
  memberId: string,
): Promise<void> {
  const encodedGroupId = encodeURIComponent(groupId)
  const encodedMemberId = encodeURIComponent(memberId)

  await apiClient(`/groups/${encodedGroupId}/members/${encodedMemberId}`, {
    method: 'DELETE',
  })
}

// 7) 그룹 탈퇴 API (DELETE /groups/{groupId}/members/me)
export async function leaveGroup(groupId: string): Promise<void> {
  const encodedGroupId = encodeURIComponent(groupId)

  await apiClient(`/groups/${encodedGroupId}/members/me`, {
    method: 'DELETE',
  })
}
