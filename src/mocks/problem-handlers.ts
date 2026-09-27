import { http, HttpResponse, passthrough } from 'msw'

import type { ProblemListResponse, ProblemResponse } from '@/lib/api/problems'
import {
  isDocumentNavigation,
  isSolutionApiRequest,
} from '@/mocks/solution-handlers'

const mockProblems: ProblemResponse[] = [
  {
    problemId: '10000000-0000-4000-8000-000000000001',
    provider: 'BOJ',
    externalProblemId: '1000',
    name: 'A+B',
    url: 'https://www.acmicpc.net/problem/1000',
    difficulty: 'BRONZE_5',
  },
  {
    problemId: '10000000-0000-4000-8000-000000000002',
    provider: 'BOJ',
    externalProblemId: '2557',
    name: 'Hello World',
    url: 'https://www.acmicpc.net/problem/2557',
    difficulty: 'BRONZE_5',
  },
  {
    problemId: '10000000-0000-4000-8000-000000000003',
    provider: 'SWEA',
    externalProblemId: '1204',
    name: '최빈수 구하기',
    url: 'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AV13zo1KAAACFAYh',
    difficulty: null,
  },
]

export const problemHandlers = [
  http.get('*/problems', ({ request }) => {
    if (
      isDocumentNavigation(request) ||
      !isSolutionApiRequest(request, '/problems')
    ) {
      return passthrough()
    }

    const requestUrl = new URL(request.url)
    const keyword = requestUrl.searchParams.get('keyword')?.trim().toLowerCase()
    const provider = requestUrl.searchParams.get('provider')?.trim()
    const difficulty = requestUrl.searchParams
      .get('difficulty')
      ?.trim()
      .toLowerCase()
    const page = Number(requestUrl.searchParams.get('page') ?? 0)
    const size = Number(requestUrl.searchParams.get('size') ?? 20)
    const start = page * size
    const filteredProblems = mockProblems
      .filter(
        (problem) =>
          !keyword ||
          problem.name.toLowerCase().includes(keyword) ||
          problem.externalProblemId.toLowerCase().includes(keyword),
      )
      .filter((problem) => !provider || problem.provider === provider)
      .filter(
        (problem) =>
          !difficulty || problem.difficulty?.toLowerCase() === difficulty,
      )
      .sort(
        (left, right) =>
          compareStrings(left.externalProblemId, right.externalProblemId) ||
          compareStrings(left.provider, right.provider),
      )
    const response: ProblemListResponse = {
      problems: filteredProblems.slice(start, start + size),
      page,
      size,
      totalElements: filteredProblems.length,
      totalPages: Math.ceil(filteredProblems.length / size),
    }

    return HttpResponse.json(response)
  }),
  http.get('*/problems/:problemId', ({ params, request }) => {
    const problemId =
      typeof params.problemId === 'string' ? params.problemId : undefined

    if (
      !problemId ||
      isDocumentNavigation(request) ||
      !isSolutionApiRequest(
        request,
        `/problems/${encodeURIComponent(problemId)}`,
      )
    ) {
      return passthrough()
    }

    const problem = mockProblems.find(
      (candidate) => candidate.problemId === problemId,
    )

    return problem
      ? HttpResponse.json(problem)
      : HttpResponse.json({ message: 'Problem not found' }, { status: 404 })
  }),
]

function compareStrings(left: string, right: string) {
  if (left === right) {
    return 0
  }

  return left < right ? -1 : 1
}
