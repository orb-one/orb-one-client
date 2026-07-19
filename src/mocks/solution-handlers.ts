import { http, HttpResponse } from 'msw'

import type { CreateSolutionRequest } from '@/lib/api/solutions'
import {
  createMockSolution,
  getMockSolution,
  getMockSolutionSummaries,
} from '@/mocks/solution-data'

export const solutionHandlers = [
  http.get('*/solutions', ({ request }) => {
    const problemId = new URL(request.url).searchParams.get('problemId')
    const solutions = getMockSolutionSummaries(problemId ?? undefined)

    return HttpResponse.json({ solutions })
  }),
  http.get('*/solutions/:solutionId', ({ params }) => {
    const solutionId = getPathParameter(params.solutionId)
    const solution = solutionId ? getMockSolution(solutionId) : undefined

    if (!solution) {
      return HttpResponse.json(
        { message: 'Solution not found' },
        { status: 404 },
      )
    }

    return HttpResponse.json(solution)
  }),
  http.post('*/solutions', async ({ request }) => {
    const body = await parseJsonBody(request)

    if (!isCreateSolutionRequest(body)) {
      return HttpResponse.json(
        { message: 'Invalid solution request' },
        { status: 400 },
      )
    }

    const solution = createMockSolution(body)

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
