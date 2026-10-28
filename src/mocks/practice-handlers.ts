/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty, @typescript-eslint/no-unsafe-return */
import { http, HttpResponse, passthrough } from 'msw'
import { mockPractices, type MockPractice } from './practice-data'
import {
  resolveMockProblemReferences,
  problemReferenceError,
} from './problem-references'

function toDto(practice: MockPractice) {
  return {
    id: practice.practiceId,
    title: practice.title,
    start_date: practice.startDate,
    end_date: practice.endDate,
    group_id: practice.groupId,
    created_at: practice.createdAt,
    updated_at: practice.updatedAt,
    problems: practice.problems,
  }
}

const STORAGE_KEY = 'orb_mock_practices'

function loadPractices(): MockPractice[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (e) {}
  return structuredClone(mockPractices)
}

function savePractices(practices: MockPractice[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(practices))
  } catch (e) {}
}

let currentPractices = loadPractices()

export const practiceHandlers = [
  http.get('*/groups/:groupId/practices', ({ params, request }) => {
    if (
      !isPracticeApiRequest(
        request,
        `/groups/${params.groupId as string}/practices`,
      )
    ) {
      return passthrough()
    }
    const { groupId } = params
    const groupPractices = currentPractices.filter((p) => p.groupId === groupId)
    return HttpResponse.json(groupPractices.map(toDto))
  }),

  http.get('*/groups/:groupId/practices/:practiceId', ({ params, request }) => {
    if (
      !isPracticeApiRequest(
        request,
        `/groups/${params.groupId as string}/practices/${params.practiceId as string}`,
      )
    ) {
      return passthrough()
    }
    const { groupId, practiceId } = params
    const practice = currentPractices.find(
      (p) => p.groupId === groupId && p.practiceId === practiceId,
    )
    if (!practice) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json(toDto(practice))
  }),

  http.post('*/groups/:groupId/practices', async ({ params, request }) => {
    if (
      !isPracticeApiRequest(
        request,
        `/groups/${params.groupId as string}/practices`,
      )
    ) {
      return passthrough()
    }
    const groupId = params.groupId as string
    const body = (await request.json()) as Record<string, unknown>
    const problems = resolveMockProblemReferences(body)
    if (problems instanceof Response) return problems

    const newPractice: MockPractice = {
      practiceId: crypto.randomUUID(),
      groupId,
      title: typeof body.title === 'string' ? body.title : '새 연습',
      startDate:
        typeof body.startDate === 'string'
          ? body.startDate
          : new Date().toISOString(),
      endDate:
        typeof body.endDate === 'string'
          ? body.endDate
          : new Date(Date.now() + 86400000).toISOString(),
      problems,
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    currentPractices.push(newPractice)
    savePractices(currentPractices)
    return HttpResponse.json(toDto(newPractice), { status: 201 })
  }),

  http.put(
    '*/groups/:groupId/practices/:practiceId',
    async ({ params, request }) => {
      if (
        !isPracticeApiRequest(
          request,
          `/groups/${params.groupId as string}/practices/${params.practiceId as string}`,
        )
      ) {
        return passthrough()
      }
      const { groupId, practiceId } = params
      const body = (await request.json()) as any

      const index = currentPractices.findIndex(
        (p) => p.groupId === groupId && p.practiceId === practiceId,
      )
      if (index === -1) {
        return HttpResponse.json({ message: 'Not found' }, { status: 404 })
      }

      const practice = currentPractices[index]!
      if (body.title) practice.title = body.title
      if (body.startDate) practice.startDate = body.startDate
      if (body.endDate) practice.endDate = body.endDate
      practice.updatedAt = new Date().toISOString()

      currentPractices[index] = practice
      savePractices(currentPractices)
      return HttpResponse.json(toDto(practice))
    },
  ),

  http.delete(
    '*/groups/:groupId/practices/:practiceId',
    ({ params, request }) => {
      if (
        !isPracticeApiRequest(
          request,
          `/groups/${params.groupId as string}/practices/${params.practiceId as string}`,
        )
      ) {
        return passthrough()
      }
      const { practiceId } = params
      currentPractices = currentPractices.filter(
        (p) => p.practiceId !== practiceId,
      )
      savePractices(currentPractices)
      return new HttpResponse(null, { status: 204 })
    },
  ),

  http.post(
    '*/groups/:groupId/practices/:practiceId/problems',
    async ({ params, request }) => {
      if (
        !isPracticeApiRequest(
          request,
          `/groups/${params.groupId as string}/practices/${params.practiceId as string}/problems`,
        )
      ) {
        return passthrough()
      }
      const { groupId, practiceId } = params
      const body = (await request.json()) as any

      const index = currentPractices.findIndex(
        (p) => p.groupId === groupId && p.practiceId === practiceId,
      )
      if (index === -1) {
        return HttpResponse.json({ message: 'Not found' }, { status: 404 })
      }

      const practice = currentPractices[index]!
      if (new Date(practice.endDate).getTime() <= Date.now()) {
        return problemReferenceError(
          'PRACTICE_ALREADY_ENDED',
          '종료된 연습에는 문제를 추가할 수 없습니다.',
          409,
        )
      }
      const problems = resolveMockProblemReferences(body)
      if (problems instanceof Response) return problems
      if (
        problems.some((problem) =>
          practice.problems?.some(
            (existing) => existing.problemId === problem.problemId,
          ),
        )
      ) {
        return problemReferenceError(
          'PROBLEM_ALREADY_IN_PRACTICE',
          '이미 연습에 포함된 문제가 있습니다.',
          409,
        )
      }

      practice.problems = [...(practice.problems ?? []), ...problems]
      practice.updatedAt = new Date().toISOString()

      currentPractices[index] = practice
      savePractices(currentPractices)

      return HttpResponse.json(
        {
          practiceId,
          groupId,
          problems: practice.problems,
          updatedAt: practice.updatedAt,
        },
        { status: 200 },
      )
    },
  ),

  http.delete(
    '*/groups/:groupId/practices/:practiceId/problems/:problemId',
    ({ params, request }) => {
      if (
        !isPracticeApiRequest(
          request,
          `/groups/${params.groupId as string}/practices/${params.practiceId as string}/problems/${params.problemId as string}`,
        )
      ) {
        return passthrough()
      }
      const { groupId, practiceId, problemId } = params

      const index = currentPractices.findIndex(
        (p) => p.groupId === groupId && p.practiceId === practiceId,
      )
      if (index === -1) {
        return HttpResponse.json({ message: 'Not found' }, { status: 404 })
      }

      const practice = currentPractices[index]!
      if (practice.problems) {
        practice.problems = practice.problems.filter(
          (prob) => prob.problemId !== problemId,
        )
      }
      practice.updatedAt = new Date().toISOString()

      currentPractices[index] = practice
      savePractices(currentPractices)

      return new HttpResponse(null, { status: 204 })
    },
  ),
]

export function isPracticeApiRequest(request: Request, path: string) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL
  if (!baseUrl) {
    return new URL(request.url).pathname === path
  }

  const expectedUrl = new URL(
    path.replace(/^\/+/, ''),
    baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
  )
  const requestUrl = new URL(request.url)

  return (
    requestUrl.origin === expectedUrl.origin &&
    requestUrl.pathname === expectedUrl.pathname
  )
}
