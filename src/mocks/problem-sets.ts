import type {
  ProblemSetDetailResponse,
  ProblemSetResponse,
} from '@/lib/api/problem-sets'

// 1. 문제집 목록 목 데이터 (GET /groups/:groupId/problem-sets)
export const mockProblemSetList: ProblemSetResponse[] = [
  {
    problemSetId: '541549f4-4b5f-467f-9434-a0309b171bc1',
    name: '테스트001',
    problemCount: 2,
    createdBy: 'a0e2d4de-b268-44b1-bf8a-fb49d725deb4',
    createdAt: '2026-08-09T17:13:30',
  },
  {
    problemSetId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    name: 'SWEA 필수 기출 문제집',
    problemCount: 2,
    createdBy: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    createdAt: '2026-08-16T09:47:00.292Z',
  },
]

// 2. 문제집 상세 목 데이터 (GET /groups/:groupId/problem-sets/:problemSetId)
export const mockProblemSetDetail: ProblemSetDetailResponse = {
  problemSetId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  groupId: '6f9619ff-8b86-d011-b42d-00c04fc964ff',
  name: 'SWEA 필수 기출 문제집',
  problems: [
    {
      problemId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      provider: 'SWEA',
      externalProblemId: '1204',
      name: '최빈수 구하기',
      url: 'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AV13zo1KAAACFAYh',
      difficulty: 'GOLD_3',
    },
    {
      problemId: '4fa85f64-5717-4562-b3fc-2c963f66afa7',
      provider: 'SWEA',
      externalProblemId: '1206',
      name: 'View',
      url: 'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AV134166AA8CFAYh',
      difficulty: 'GOLD_3',
    },
  ],
  createdBy: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  createdAt: '2026-08-16T09:47:00.292Z',
  updatedAt: '2026-08-16T09:47:00.292Z',
}
