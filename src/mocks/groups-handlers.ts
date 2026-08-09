import { http, HttpResponse } from 'msw'
import { mockGroupSummaryList } from './groups'

export const groupHandlers = [
  // 1. 전체 그룹 목록 조회 (GET /groups)
  http.get('/groups', () => {
    return HttpResponse.json(mockGroupSummaryList)
  }),

  // 2. 그룹 상세 및 멤버 목록 조회 (GET /groups/:groupId)
  http.get('/groups/:groupId', ({ params }) => {
    const { groupId } = params

    // 요청된 groupId에 해당하는 mock 데이터 검색
    const matchedGroup = mockGroupSummaryList.find((g) => g.groupId === groupId)

    return HttpResponse.json({
      groupId: String(groupId),
      groupName: matchedGroup?.name ?? '알고리즘 스터디 1반',
      members: [
        {
          userId: 'user-1',
          nickname: matchedGroup?.nickname ?? 'userA',
          role: 'OWNER',
        },
        {
          userId: 'dev-user-id',
          nickname: 'dev-user',
          role: 'MEMBER',
        },
        {
          userId: 'user-3',
          nickname: '알고리즘초보',
          role: 'MEMBER',
        },
      ],
    })
  }),
]
