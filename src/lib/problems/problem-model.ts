export type ProblemProvider = 'BOJ' | 'JUNGOL' | 'SWEA' | 'PROGRAMMERS'

export interface Problem {
  id: string
  provider: ProblemProvider
  externalId: string
  name: string
  url: string
  difficulty: string | null
}

export interface ProblemPage {
  problems: Problem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
