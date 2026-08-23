import { http, HttpResponse } from 'msw'
import { mockProblemSetDetail, mockProblemSetList } from './problem-sets'

export const problemSetHandlers = [
  // 1. 문제집 목록 조회 (GET /groups/:groupId/problem-sets)
  http.get('/groups/:groupId/problem-sets', () => {
    return HttpResponse.json(mockProblemSetList, { status: 200 })
  }),

  // 2. 문제집 상세 조회 (GET /groups/:groupId/problem-sets/:problemSetId)
  http.get('/groups/:groupId/problem-sets/:problemSetId', ({ params }) => {
    const { problemSetId } = params

    // 필요 시 problemSetId 일치 여부 확인
    return HttpResponse.json(
      {
        ...mockProblemSetDetail,
        problemSetId: String(problemSetId),
      },
      { status: 200 },
    )
  }),
]
