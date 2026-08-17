import type { ProblemProvider } from '@/lib/problems/problem-model'

interface SolutionBase {
  id: string
  problemId: string
  userId: string
  authorNickname?: string | null
  language: string | null
  isSolved: boolean | null
  isDraft: boolean | null
  createdAt: string | null
}

// GET /solutions 응답을 UI에서 사용하는 형태로 정규화한 모델이다.
export interface SolutionSummary extends SolutionBase {
  problemName: string | null
  problemProvider: ProblemProvider | null
  problemNumber: string | null
  problemDifficulty: string | null
}

// 상세 응답에만 포함되는 코드, 설명, 실행 지표와 수정 시각을 추가한다.
export interface SolutionDetail extends SolutionBase {
  code: string
  description: string
  memoryUsage: number | null
  timeElapsed: number | null
  updatedAt: string | null
}
