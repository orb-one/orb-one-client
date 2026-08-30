import { http, HttpResponse } from 'msw'

import type {
  CreateGroupRequest,
  CreateGroupResponse,
  GetGroupsResponse,
  GroupDetailResponse,
  GroupJoinResponse,
  GroupSummaryResponse,
  TransferGroupOwnershipRequest,
  TransferGroupOwnershipResponse,
  UpdateGroupNameRequest,
  UpdateGroupNameResponse,
} from '@/lib/api/groups'

import { mockGroupDetails, mockGroupSummaryList } from './groups'

export const groupHandlers = [
  // 1. 전체 그룹 목록 조회 (GET /groups?page=0&size=20)
  http.get('/groups', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '0')
    const size = Number(url.searchParams.get('size') ?? '20')

    const start = page * size
    const end = start + size
    const paginatedItems = mockGroupSummaryList.slice(start, end)
    const totalCount = mockGroupSummaryList.length
    const hasNext = end < totalCount

    const responseData: GetGroupsResponse = {
      items: paginatedItems,
      page,
      size,
      totalCount,
      hasNext,
    }

    return HttpResponse.json(responseData, { status: 200 })
  }),

  // 2. 특정 그룹 상세 조회 (GET /groups/:groupId)
  http.get('/groups/:groupId', ({ params }) => {
    const { groupId } = params as { groupId: string }
    const groupDetail = mockGroupDetails[groupId]

    if (!groupDetail) {
      const summary = mockGroupSummaryList.find((g) => g.groupId === groupId)
      if (!summary) {
        return new HttpResponse(null, { status: 404 })
      }

      return HttpResponse.json<GroupDetailResponse>({
        groupId,
        groupName: summary.name,
        members: [
          {
            userId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
            nickname: summary.nickname,
            role: 'OWNER',
          },
        ],
      })
    }

    return HttpResponse.json(groupDetail, { status: 200 })
  }),

  // 3. 그룹 가입 (POST /groups/:groupId/members)
  http.post('/groups/:groupId/members', ({ params }) => {
    const { groupId } = params as { groupId: string }
    const group = mockGroupSummaryList.find((g) => g.groupId === groupId)

    if (group) {
      group.isMember = true
    }

    const response: GroupJoinResponse = {
      groupId,
      userId: 'current-user-id',
      role: 'MEMBER',
      message: '그룹에 성공적으로 가입되었습니다.',
    }

    return HttpResponse.json(response, { status: 200 })
  }),

  // 4. 그룹 생성 (POST /groups)
  http.post('/groups', async ({ request }) => {
    const body = (await request.json()) as CreateGroupRequest
    const newGroupId = crypto.randomUUID()

    const newGroupSummary: GroupSummaryResponse = {
      groupId: newGroupId,
      name: body.name,
      nickname: '현재사용자',
      createdAt: new Date().toISOString(),
      isMember: true,
    }

    mockGroupSummaryList.unshift(newGroupSummary)

    mockGroupDetails[newGroupId] = {
      groupId: newGroupId,
      groupName: body.name,
      members: [
        {
          userId: 'current-user-id',
          nickname: '현재사용자',
          role: 'OWNER',
        },
      ],
    }

    const response: CreateGroupResponse = {
      groupId: newGroupId,
      name: body.name,
      ownerId: 'current-user-id',
      createdAt: newGroupSummary.createdAt ?? '',
    }

    return HttpResponse.json(response, { status: 201 })
  }),

  // 5. 그룹 이름 수정 (PATCH /groups/:groupId)
  http.patch('/groups/:groupId', async ({ params, request }) => {
    const { groupId } = params as { groupId: string }
    const body = (await request.json()) as UpdateGroupNameRequest

    const summary = mockGroupSummaryList.find((g) => g.groupId === groupId)
    if (summary) {
      summary.name = body.name
    }

    const detail = mockGroupDetails[groupId]
    if (detail) {
      detail.groupName = body.name
    }

    const response: UpdateGroupNameResponse = {
      groupId,
      name: body.name,
    }

    return HttpResponse.json(response, { status: 200 })
  }),

  // 6. 그룹 소유권 이전 (PATCH /groups/:groupId/owner)
  http.patch('/groups/:groupId/owner', async ({ params, request }) => {
    const { groupId } = params as { groupId: string }
    const body = (await request.json()) as TransferGroupOwnershipRequest

    const detail = mockGroupDetails[groupId]
    let previousOwnerId = ''

    if (detail) {
      detail.members = detail.members.map((member) => {
        if (member.role === 'OWNER') {
          previousOwnerId = member.userId
          return { ...member, role: 'MEMBER' }
        }
        if (member.userId === body.newOwnerId) {
          return { ...member, role: 'OWNER' }
        }
        return member
      })
    }

    const response: TransferGroupOwnershipResponse = {
      groupId,
      previousOwnerId: previousOwnerId || 'prev-owner-id',
      newOwnerId: body.newOwnerId,
      message: '그룹 소유권이 성공적으로 이전되었습니다.',
    }

    return HttpResponse.json(response, { status: 200 })
  }),

  // 7. 그룹 폐쇄 (DELETE /groups/:groupId)
  http.delete('/groups/:groupId', ({ params }) => {
    const { groupId } = params as { groupId: string }
    const index = mockGroupSummaryList.findIndex((g) => g.groupId === groupId)
    if (index !== -1) {
      mockGroupSummaryList.splice(index, 1)
    }
    delete mockGroupDetails[groupId]

    return new HttpResponse(null, { status: 204 })
  }),

  // 8. 그룹 멤버 강퇴 (DELETE /groups/:groupId/members/:memberId)
  http.delete('/groups/:groupId/members/:memberId', ({ params }) => {
    const { groupId, memberId } = params as {
      groupId: string
      memberId: string
    }

    const detail = mockGroupDetails[groupId]
    if (detail) {
      detail.members = detail.members.filter((m) => m.userId !== memberId)
    }

    return new HttpResponse(null, { status: 204 })
  }),

  // 9. 그룹 탈퇴 (DELETE /groups/:groupId/members/me)
  http.delete('/groups/:groupId/members/me', ({ params }) => {
    const { groupId } = params as { groupId: string }
    const summary = mockGroupSummaryList.find((g) => g.groupId === groupId)
    if (summary) {
      summary.isMember = false
    }

    return new HttpResponse(null, { status: 204 })
  }),
]