import { http, HttpResponse } from 'msw'
import { mockGroupDetails, mockGroupSummaryList } from './groups'

export const groupHandlers = [
  // 1. 전체 그룹 목록 조회 (GET /groups)
  http.get('/groups', () => {
    return HttpResponse.json(mockGroupSummaryList, { status: 200 })
  }),

  // 2. 그룹 상세 조회 (GET /groups/:groupId)
  http.get('/groups/:groupId', ({ params }) => {
    const { groupId } = params
    const groupDetail = mockGroupDetails[String(groupId)]

    if (!groupDetail) {
      return new HttpResponse(null, { status: 404 })
    }

    return HttpResponse.json(groupDetail, { status: 200 })
  }),
]
