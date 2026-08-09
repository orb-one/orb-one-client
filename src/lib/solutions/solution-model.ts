// GET /solutions 응답을 UI에서 사용하는 형태로 정규화한 모델이다.
export interface SolutionSummary {
  id: string
  problemId: string
  userId: string
  language: string | null
  isSolved: boolean | null
  isDraft: boolean | null
  createdAt: string | null
}

// 상세 응답에만 포함되는 코드, 설명, 실행 지표와 수정 시각을 추가한다.
export interface SolutionDetail extends SolutionSummary {
  code: string
  description: string
  memoryUsage: number | null
  timeElapsed: number | null
  updatedAt: string | null
}
