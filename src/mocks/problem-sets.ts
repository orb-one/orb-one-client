import type {
  ProblemResponse,
  ProblemSetResponse,
} from '@/lib/api/problem-sets'

export interface MockProblemSetDetailItem {
  problemSetId: string
  groupId: string
  name: string
  problems: ProblemResponse[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 1. 문제집 목록 Mock 데이터 (GET /groups/:groupId/problem-sets)
export const mockProblemSetList: ProblemSetResponse[] = [
  {
    problemSetId: '4455f522-c5e7-4567-b96d-8b32b2c85de2',
    name: '1주차 - 배열/문자열',
    problemCount: 2,
    createdBy: 'a0e2d4de-b268-44b1-bf8a-fb49d725deb4',
    createdAt: '2026-07-31T15:48:14',
  },
]

// 2. 문제집 상세 Mock 데이터 (GET /groups/:groupId/problem-sets/:problemSetId)
export const mockProblemSetDetails: Record<string, MockProblemSetDetailItem> = {
  '4455f522-c5e7-4567-b96d-8b32b2c85de2': {
    problemSetId: '4455f522-c5e7-4567-b96d-8b32b2c85de2',
    groupId: '54f2cc6b-c10b-4e79-96d2-e933297fe748',
    name: '1주차 - 배열/문자열',
    createdBy: 'a0e2d4de-b268-44b1-bf8a-fb49d725deb4',
    createdAt: '2026-07-31T15:48:14',
    updatedAt: '2026-07-31T15:48:14',
    problems: [
      {
        problemId: '64118996-0b1e-404c-8e5a-816ffcbf4899',
        provider: 'BOJ',
        externalProblemId: '1000',
        name: 'A+B',
        url: 'https://www.acmicpc.net/problem/1000',
        difficulty: null,
      },
      {
        problemId: 'c7fcb4ff-2f6f-400f-8cee-6c88cab9edbb',
        provider: 'BOJ',
        externalProblemId: '1016',
        name: '제곱 ㄴㄴ 수',
        url: 'https://www.acmicpc.net/problem/1016',
        difficulty: null,
      },
    ],
  },
}
