import { http, HttpResponse } from 'msw'
import { mockProblemSetList } from './problem-sets'

export const problemSetHandlers = [
  // 특정 그룹의 문제집 목록 조회 (GET /groups/:groupId/problem-sets)
  http.get('/groups/:groupId/problem-sets', ({ params }) => {
    const { groupId } = params

    // 요청받은 groupId에 맞춰 response 전달
    const responseData = mockProblemSetList.map((item) => ({
      ...item,
      group_id: String(groupId),
    }))

    return HttpResponse.json(responseData)
  }),
]
