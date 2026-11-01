/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty, @typescript-eslint/no-unsafe-return */
import { http, HttpResponse, passthrough } from 'msw'
import { mockPractices, type MockPractice } from './practice-data'
import { parsePracticeInstant } from '@/lib/practice/practice-date'
import {
  resolveMockProblemReferences,
  problemReferenceError,
} from './problem-references'

function toDto(practice: MockPractice) {
  return {
    practiceId: practice.practiceId,
    title: practice.title,
    startDate: practice.startDate,
    endDate: practice.endDate,
    groupId: practice.groupId,
    createdBy: practice.createdBy,
    createdAt: practice.createdAt,
    updatedAt: practice.updatedAt,
    problems: practice.problems,
  }
}

// 이전 mock의 무오프셋 저장값은 새 UTC 계약에 재사용하지 않습니다.
const STORAGE_KEY = 'orb_mock_practices_utc_v1'

function readSchedule(body: Record<string, unknown>) {
  const fieldErrors = ['startDate', 'endDate'].flatMap((field) =>
    typeof body[field] !== 'string' || !body[field]
      ? [{ field, reason: 'REQUIRED' }]
      : [],
  )
  if (fieldErrors.length)
    return HttpResponse.json(
      {
        code: 'INVALID_FIELD',
        message: '시작 일시와 종료 일시를 모두 입력해 주세요.',
        fieldErrors,
      },
      { status: 400 },
    )

  // ORBONE-189와 같은 전환기 요청 호환: 무오프셋 입력만 KST로 해석합니다.
  const parse = (value: unknown) => {
    const text = String(value)
    return parsePracticeInstant(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?$/.test(text)
        ? `${text}+09:00`
        : text,
    )
  }
  const start = parse(body.startDate)
  const end = parse(body.endDate)
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return problemReferenceError(
      'MALFORMED_REQUEST',
      '시각 형식이 올바르지 않습니다.',
      400,
    )
  }
  if (start >= end || end <= Date.now()) {
    return problemReferenceError(
      'PRACTICE_INVALID_END_DATE',
      '종료 일시는 시작 일시와 현재 시각보다 이후여야 합니다.',
      400,
    )
  }
  return {
    startDate: new Date(start).toISOString(),
    endDate: new Date(end).toISOString(),
  }
}

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
    const schedule = readSchedule(body)
    if (schedule instanceof Response) return schedule

    const newPractice: MockPractice = {
      practiceId: crypto.randomUUID(),
      groupId,
      title: typeof body.title === 'string' ? body.title : '새 연습',
      ...schedule,
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
      const body = (await request.json()) as Record<string, unknown>

      const index = currentPractices.findIndex(
        (p) => p.groupId === groupId && p.practiceId === practiceId,
      )
      if (index === -1) {
        return HttpResponse.json({ message: 'Not found' }, { status: 404 })
      }

      const practice = currentPractices[index]!
      if (parsePracticeInstant(practice.endDate) <= Date.now()) {
        return problemReferenceError(
          'PRACTICE_ALREADY_ENDED',
          '종료된 연습은 수정할 수 없습니다.',
          409,
        )
      }
      const schedule = readSchedule(body)
      if (schedule instanceof Response) return schedule
      if (typeof body.title === 'string') practice.title = body.title
      practice.startDate = schedule.startDate
      practice.endDate = schedule.endDate
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
      if (parsePracticeInstant(practice.endDate) <= Date.now()) {
        return problemReferenceError(
          'PRACTICE_ALREADY_ENDED',
          '종료된 연습에서는 문제를 제거할 수 없습니다.',
          409,
        )
      }
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
