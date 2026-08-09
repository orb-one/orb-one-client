import { http, HttpResponse, passthrough } from 'msw'

import type { CreateSolutionRequest } from '@/lib/api/solutions'
import { getCurrentMockUser } from '@/mocks/auth-session'
import {
  createMockSolution,
  getMockSolution,
  getMockSolutionSummaries,
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
    isNonEmptyString(value.code)
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
