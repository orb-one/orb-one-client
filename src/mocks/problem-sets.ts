import type { ProblemSetResponse } from '@/lib/api/problem-sets'

export const mockProblemSetList: ProblemSetResponse[] = [
  {
    id: 'ps-101',
    name: '백준 DFS/BFS 필수 문제집',
    is_public: true,
    start_date: '2026-08-01T00:00:00',
    end_date: '2026-08-31T23:59:59',
    group_id: '12be2f52-81dd-41b7-914c-03d73e417130',
    created_at: '2026-08-01T09:00:00',
    updated_at: '2026-08-01T09:00:00',
  },
  {
    id: 'ps-102',
    name: 'DP & 동적계획법 입문 20제',
    is_public: false,
    start_date: '2026-08-05T14:20:00',
    end_date: '2026-08-05T14:20:00',
    group_id: '12be2f52-81dd-41b7-914c-03d73e417130',
    created_at: '2026-08-05T14:20:00',
    updated_at: '2026-08-05T14:20:00',
  },
]
