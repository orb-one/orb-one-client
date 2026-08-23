/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unused-vars, no-empty, @typescript-eslint/no-unsafe-return */
import { http, HttpResponse, passthrough } from 'msw'
import { mockPractices, type MockPractice } from './practice-data'

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
  return [...mockPractices]
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
    const body = (await request.json()) as any

    const newPractice: MockPractice = {
      practiceId: String(Date.now()),
      groupId,
      title: body.title ?? '새 연습',
      startDate: body.start_date ?? new Date().toISOString(),
      endDate: body.end_date ?? new Date(Date.now() + 86400000).toISOString(),
      problems: body.problems ?? [],
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
      const { practiceId } = params
      const body = (await request.json()) as any

      const index = currentPractices.findIndex(
        (p) => p.practiceId === practiceId,
      )
      if (index === -1) {
        return HttpResponse.json({ message: 'Not found' }, { status: 404 })
      }

      const practice = currentPractices[index]!
      if (body.title) practice.title = body.title
      if (body.start_date) practice.startDate = body.start_date
      if (body.end_date) practice.endDate = body.end_date
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
      const { practiceId } = params
      const body = (await request.json()) as any

      const index = currentPractices.findIndex(
        (p) => p.practiceId === practiceId,
      )
      if (index === -1) {
        return HttpResponse.json({ message: 'Not found' }, { status: 404 })
      }

      const newProblem = {
        problemId: String(Date.now()),
        provider: body.provider,
        externalProblemId: body.external_problem_id,
        name: body.name,
        url: body.url || '',
      }

      const practice = currentPractices[index]!
      if (!practice.problems) practice.problems = []
      practice.problems.push(newProblem)
      practice.updatedAt = new Date().toISOString()

      currentPractices[index] = practice
      savePractices(currentPractices)

      return HttpResponse.json(newProblem, { status: 201 })
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
      const { practiceId, problemId } = params

      const index = currentPractices.findIndex(
        (p) => p.practiceId === practiceId,
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
