export interface MockProblem {
  problemId: string
  provider: string
  externalProblemId: string
  name: string
  url: string
}

export interface MockPractice extends Record<string, unknown> {
  practiceId: string
  groupId: string
  title: string
  startDate: string
  endDate: string
  problems?: MockProblem[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const mockPractices: MockPractice[] = [
  {
    practiceId: 'p-1',
    groupId: '1',
    title: '1주차',
    startDate: '2026-07-20T00:00:00Z',
    endDate: '2026-08-10T23:59:59Z',
    problems: [
      {
        problemId: '10000000-0000-4000-8000-000000000001',
        provider: 'BOJ',
        externalProblemId: '1000',
        name: 'A+B',
        url: 'https://www.acmicpc.net/problem/1000',
      },
    ],
    createdBy: 'user-1',
    createdAt: '2026-07-15T12:00:00Z',
    updatedAt: '2026-07-15T12:00:00Z',
  },
  {
    practiceId: 'p-2',
    groupId: '1',
    title: '2주차',
    startDate: '2026-08-01T00:00:00Z',
    endDate: '2026-08-15T23:59:59Z',
    problems: [
      {
        problemId: '10000000-0000-4000-8000-000000000003',
        provider: 'SWEA',
        externalProblemId: '1204',
        name: '최빈수 구하기',
        url: 'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AV13zo1KAAACFAYh',
      },
    ],
    createdBy: 'user-1',
    createdAt: '2026-07-25T12:00:00Z',
    updatedAt: '2026-07-25T12:00:00Z',
  },
]
