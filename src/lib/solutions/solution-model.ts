// 문제와 연결된 알고리즘 분류를 UI에서 표시하기 위한 값
export interface ProblemTag {
  id: string
  name: string
}

// 문제집 화면 없이도 풀이 화면에서 문제를 식별하고 외부 링크로 이동하기 위한 최소 정보
export interface ProblemSummary {
  id: string
  name: string
  tier: number | null
  url: string | null
  tags: ProblemTag[]
}

// API 명세에 목록 원소 구조가 없으므로, 컬럼정의서 기반 확장값은 null을 허용한다.
export interface SolutionSummary {
  id: string
  problem: ProblemSummary | null
  isSolved: boolean | null
  isDraft: boolean | null
  language: string | null
  memoryUsage: number | null
  timeElapsed: number | null
  createdAt: string | null
  updatedAt: string | null
}

// 상세 API 명세에서 code와 description은 응답 필드로 보장된다.
export interface SolutionDetail extends SolutionSummary {
  code: string
  description: string
}
