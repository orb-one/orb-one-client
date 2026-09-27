import { http, HttpResponse, passthrough } from 'msw'

import type {
  CreateSolutionRequest,
  UpdateSolutionRequest,
} from '@/lib/api/solutions'
import { getCurrentMockUser } from '@/mocks/auth-session'
import {
  createMockSolution,
  deleteMockSolution,
  getMockSolution,
  getMockSolutionSummaries,
  restoreMockSolution,
  updateMockSolution,
} from '@/mocks/solution-data'

export const solutionHandlers = [
  http.get('*/solutions', ({ request }) => {
    if (
      isDocumentNavigation(request) ||
      !isSolutionApiRequest(request, '/solutions')
    ) {
      return passthrough()
    }

    const problemId = new URL(request.url).searchParams.get('problemId')
    const solutions = getMockSolutionSummaries(problemId ?? undefined)

    return HttpResponse.json({ solutions })
  }),
  http.get('*/solutions/:solutionId', ({ params, request }) => {
    const solutionId = getPathParameter(params.solutionId)

    if (
      !solutionId ||
      isDocumentNavigation(request) ||
      !isSolutionApiRequest(
        request,
        `/solutions/${encodeURIComponent(solutionId)}`,
      )
    ) {
      return passthrough()
    }

    const solution = getMockSolution(solutionId)

    if (!solution) {
      return HttpResponse.json(
        { message: 'Solution not found' },
        { status: 404 },
      )
    }

    return HttpResponse.json(solution)
  }),
  http.post('*/solutions', async ({ request }) => {
    if (!isSolutionApiRequest(request, '/solutions')) {
      return passthrough()
    }

    const body = await parseJsonBody(request)

    if (!isCreateSolutionRequest(body)) {
      return HttpResponse.json(
        { message: 'Invalid solution request' },
        { status: 400 },
      )
    }

    const currentUser = getCurrentMockUser()

    if (!currentUser) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const solution = createMockSolution(body, currentUser.id)

    if (!solution) {
      return HttpResponse.json(
        { message: 'Problem not found' },
        { status: 404 },
      )
    }

    return HttpResponse.json(
      { solutionId: solution.solutionId },
      { status: 201 },
    )
  }),
  http.put('*/solutions/:solutionId', async ({ params, request }) => {
    const solutionId = getPathParameter(params.solutionId)

    if (
      !solutionId ||
      isDocumentNavigation(request) ||
      !isSolutionApiRequest(
        request,
        `/solutions/${encodeURIComponent(solutionId)}`,
      )
    ) {
      return passthrough()
    }

    const body = await parseJsonBody(request)

    if (!isUpdateSolutionRequest(body)) {
      return HttpResponse.json(
        { message: 'Invalid solution request' },
        { status: 400 },
      )
    }

    const currentUser = getCurrentMockUser()

    if (!currentUser) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const result = updateMockSolution(solutionId, currentUser.id, body)

    if (!result.ok) {
      return HttpResponse.json(
        {
          message:
            result.status === 403 ? 'Solution forbidden' : 'Solution not found',
        },
        { status: result.status },
      )
    }

    return HttpResponse.json(result.solution)
  }),
  http.delete('*/solutions/:solutionId', ({ params, request }) => {
    const solutionId = getPathParameter(params.solutionId)

    if (
      !solutionId ||
      isDocumentNavigation(request) ||
      !isSolutionApiRequest(
        request,
        `/solutions/${encodeURIComponent(solutionId)}`,
      )
    ) {
      return passthrough()
    }

    const currentUser = getCurrentMockUser()

    if (!currentUser) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const result = deleteMockSolution(solutionId, currentUser.id)

    if (!result.ok) {
      return HttpResponse.json(
        {
          message:
            result.status === 403 ? 'Solution forbidden' : 'Solution not found',
        },
        { status: result.status },
      )
    }

    return new HttpResponse(null, { status: 204 })
  }),
  http.post('*/solutions/:solutionId/restore', ({ params, request }) => {
    const solutionId = getPathParameter(params.solutionId)

    if (
      !solutionId ||
      !isSolutionApiRequest(
        request,
        `/solutions/${encodeURIComponent(solutionId)}/restore`,
      )
    ) {
      return passthrough()
    }

    const currentUser = getCurrentMockUser()

    if (!currentUser) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const result = restoreMockSolution(solutionId, currentUser.id)

    if (!result.ok) {
      return HttpResponse.json(
        { message: 'Solution not found' },
        { status: result.status },
      )
    }

    return new HttpResponse(null, { status: 204 })
  }),
]

// wildcard handler가 `/src/**/solutions/**` 같은 프론트 모듈까지 가로채지 않도록
// 현재 API base URL에서 생성되는 정확한 origin과 pathname을 함께 검증한다.
export function isSolutionApiRequest(request: Request, path: string) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL
  if (!baseUrl) {
    return new URL(request.url).pathname === path
  }

  const expectedUrl = new URL(
    path.replace(/^\/+/, ''),
    ensureTrailingSlash(baseUrl),
  )
  const requestUrl = new URL(request.url)

  return (
    requestUrl.origin === expectedUrl.origin &&
    requestUrl.pathname === expectedUrl.pathname
  )
}

export function isDocumentNavigation(request: Request) {
  return (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.headers.get('accept')?.includes('text/html') === true
  )
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

async function parseJsonBody(request: Request) {
  try {
    return (await request.json()) as unknown
  } catch {
    return null
  }
}

function isCreateSolutionRequest(
  value: unknown,
): value is CreateSolutionRequest {
  return (
    isRecord(value) &&
    isNonEmptyString(value.problemId) &&
    isNonEmptyString(value.language) &&
    isNonEmptyString(value.code) &&
    typeof value.isSolved === 'boolean' &&
    value.isDraft === false &&
    isNullableNumber(value.memoryUsage) &&
    isNullableNumber(value.timeElapsed) &&
    (typeof value.description === 'string' || value.description === null)
  )
}

function isUpdateSolutionRequest(
  value: unknown,
): value is UpdateSolutionRequest {
  return (
    isRecord(value) &&
    isNonEmptyString(value.language) &&
    isNonEmptyString(value.code) &&
    isNullableBoolean(value.isSolved) &&
    isNullableBoolean(value.isDraft) &&
    isNullableNumber(value.memoryUsage) &&
    isNullableNumber(value.timeElapsed) &&
    (typeof value.description === 'string' || value.description === null)
  )
}

function getPathParameter(value: string | readonly string[] | undefined) {
  return typeof value === 'string' ? value : undefined
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNullableBoolean(value: unknown): value is boolean | null {
  return typeof value === 'boolean' || value === null
}

function isNullableNumber(value: unknown): value is number | null {
  return typeof value === 'number' || value === null
}
