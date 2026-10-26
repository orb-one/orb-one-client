import { http, HttpResponse } from 'msw'

import type {
  AddProblemsRequest,
  AddProblemsResponse,
  GetProblemSetsResponse,
  ProblemSetCreateRequest,
  ProblemSetCreateResponse,
  ProblemSetDetailResponse,
} from '@/lib/api/problem-sets'

import {
  resolveMockProblemReferences,
  problemReferenceError,
} from './problem-references'
import { mockProblemSetDetails, mockProblemSetList } from './problem-sets'

export const problemSetHandlers = [
  // 1. 문제집 전체 목록 조회 (GET /groups/:groupId/problem-sets?page=0&size=20)
  http.get('/groups/:groupId/problem-sets', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '0')
    const size = Number(url.searchParams.get('size') ?? '20')

    const start = page * size
    const end = start + size
    const paginatedItems = mockProblemSetList.slice(start, end)
    const totalCount = mockProblemSetList.length
    const hasNext = end < totalCount

    const responseData: GetProblemSetsResponse = {
      items: paginatedItems,
      page,
      size,
      totalCount,
      hasNext,
    }

    return HttpResponse.json(responseData, { status: 200 })
  }),

  // 2. 문제집 상세 및 문제 목록 조회 (GET /groups/:groupId/problem-sets/:problemSetId?page=0&size=20)
  http.get(
    '/groups/:groupId/problem-sets/:problemSetId',
    ({ params, request }) => {
      const { groupId, problemSetId } = params as {
        groupId: string
        problemSetId: string
      }
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? '0')
      const size = Number(url.searchParams.get('size') ?? '20')

      const detail = mockProblemSetDetails[problemSetId]

      if (!detail) {
        return new HttpResponse(null, { status: 404 })
      }

      const allProblems = detail.problems
      const start = page * size
      const end = start + size
      const paginatedProblems = allProblems.slice(start, end)
      const totalCount = allProblems.length
      const hasNext = end < totalCount

      const responseData: ProblemSetDetailResponse = {
        problemSetId,
        groupId,
        name: detail.name,
        items: paginatedProblems,
        page,
        size,
        totalCount,
        hasNext,
        createdBy: detail.createdBy,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
      }

      return HttpResponse.json(responseData, { status: 200 })
    },
  ),

  // 3. 문제집 생성 (POST /groups/:groupId/problem-sets)
  http.post('/groups/:groupId/problem-sets', async ({ params, request }) => {
    const { groupId } = params as { groupId: string }
    const body = (await request.json()) as ProblemSetCreateRequest
    const newProblemSetId = crypto.randomUUID()
    const now = new Date().toISOString()

    const createdProblems = resolveMockProblemReferences(body)
    if (createdProblems instanceof Response) return createdProblems

    mockProblemSetList.unshift({
      problemSetId: newProblemSetId,
      name: body.name,
      problemCount: createdProblems.length,
      createdBy: 'current-user-id',
      createdAt: now,
    })

    mockProblemSetDetails[newProblemSetId] = {
      problemSetId: newProblemSetId,
      groupId,
      name: body.name,
      problems: createdProblems,
      createdBy: 'current-user-id',
      createdAt: now,
      updatedAt: now,
    }

    const responseData: ProblemSetCreateResponse = {
      problemSetId: newProblemSetId,
      groupId,
      name: body.name,
      problems: createdProblems,
      createdBy: 'current-user-id',
      createdAt: now,
    }

    return HttpResponse.json(responseData, { status: 201 })
  }),

  // 4. 문제집 삭제 (DELETE /groups/:groupId/problem-sets/:problemSetId)
  http.delete('/groups/:groupId/problem-sets/:problemSetId', ({ params }) => {
    const { problemSetId } = params as { problemSetId: string }
    const index = mockProblemSetList.findIndex(
      (ps) => ps.problemSetId === problemSetId,
    )
    if (index !== -1) {
      mockProblemSetList.splice(index, 1)
    }
    Reflect.deleteProperty(mockProblemSetDetails, problemSetId)

    return new HttpResponse(null, { status: 204 })
  }),

  // 5. 문제집 내 문제 삭제 (DELETE /groups/:groupId/problem-sets/:problemSetId/problems/:problemId)
  http.delete(
    '/groups/:groupId/problem-sets/:problemSetId/problems/:problemId',
    ({ params }) => {
      const { problemSetId, problemId } = params as {
        problemSetId: string
        problemId: string
      }

      const detail = mockProblemSetDetails[problemSetId]
      if (detail) {
        detail.problems = detail.problems.filter(
          (p) => p.problemId !== problemId,
        )
      }

      const summary = mockProblemSetList.find(
        (ps) => ps.problemSetId === problemSetId,
      )
      if (summary) {
        summary.problemCount = Math.max(0, summary.problemCount - 1)
      }

      return new HttpResponse(null, { status: 204 })
    },
  ),

  // 6. 문제집 내 문제 추가 (POST /groups/:groupId/problem-sets/:problemSetId/problems)
  http.post(
    '/groups/:groupId/problem-sets/:problemSetId/problems',
    async ({ params, request }) => {
      const { groupId, problemSetId } = params as {
        groupId: string
        problemSetId: string
      }

      const body = (await request.json()) as AddProblemsRequest
      const detail = mockProblemSetDetails[problemSetId]

      if (detail?.groupId !== groupId) {
        return HttpResponse.json(
          { message: '문제집을 찾을 수 없습니다.' },
          { status: 404 },
        )
      }

      const newProblems = resolveMockProblemReferences(body)
      if (newProblems instanceof Response) return newProblems
      if (
        newProblems.some((problem) =>
          detail.problems.some(
            (existing) => existing.problemId === problem.problemId,
          ),
        )
      ) {
        return problemReferenceError(
          'PROBLEM_ALREADY_IN_SET',
          '이미 문제집에 포함된 문제가 있습니다.',
          409,
        )
      }

      const now = new Date().toISOString()

      detail.problems = [...detail.problems, ...newProblems]
      detail.updatedAt = now

      const summary = mockProblemSetList.find(
        (item) => item.problemSetId === problemSetId,
      )

      if (summary) {
        summary.problemCount = detail.problems.length
      }

      const responseData: AddProblemsResponse = {
        problemSetId,
        groupId,
        problems: detail.problems,
        updatedAt: now,
      }

      return HttpResponse.json(responseData, { status: 200 })
    },
  ),
]
