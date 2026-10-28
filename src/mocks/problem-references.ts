import { HttpResponse } from 'msw'

import type { ProblemResponse } from '@/lib/api/problems'
import { mockProblems } from '@/mocks/problem-handlers'

const UUID_PATTERN =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i

export function problemReferenceError(
  code: string,
  message: string,
  status: number,
) {
  return HttpResponse.json(
    { code, message, timestamp: new Date().toISOString() },
    { status },
  )
}

// UUID 전체를 검증한 뒤에만 연결 목록을 반환합니다.
export function resolveMockProblemReferences(
  body: unknown,
): ProblemResponse[] | Response {
  if (
    typeof body !== 'object' ||
    body === null ||
    'problems' in body ||
    !('problemIds' in body) ||
    !Array.isArray(body.problemIds) ||
    body.problemIds.length === 0
  ) {
    return HttpResponse.json(
      {
        code: 'INVALID_FIELD',
        message: '문제를 1개 이상 선택해 주세요.',
        timestamp: new Date().toISOString(),
        fieldErrors: [{ field: 'problemIds', reason: 'REQUIRED' }],
      },
      { status: 400 },
    )
  }

  const ids: unknown[] = body.problemIds
  if (
    ids.some(
      (id) => id !== null && (typeof id !== 'string' || !UUID_PATTERN.test(id)),
    )
  ) {
    return problemReferenceError(
      'MALFORMED_REQUEST',
      '요청 본문 형식이 올바르지 않습니다.',
      400,
    )
  }
  const fieldErrors = ids.flatMap((id, index) =>
    id === null
      ? [{ field: `problemIds[${String(index)}]`, reason: 'REQUIRED' }]
      : [],
  )
  if (fieldErrors.length > 0) {
    return HttpResponse.json(
      {
        code: 'INVALID_FIELD',
        message: '요청 값이 올바르지 않습니다.',
        timestamp: new Date().toISOString(),
        fieldErrors,
      },
      { status: 400 },
    )
  }
  if (new Set(ids).size !== ids.length) {
    return problemReferenceError(
      'DUPLICATE_PROBLEM_IN_REQUEST',
      '같은 문제를 중복해서 선택할 수 없습니다.',
      400,
    )
  }

  const problems: ProblemResponse[] = []
  for (const id of ids) {
    const problem = mockProblems.find((candidate) => candidate.problemId === id)
    if (!problem) {
      return problemReferenceError(
        'PROBLEM_NOT_FOUND',
        '문제를 찾을 수 없습니다.',
        404,
      )
    }
    problems.push({ ...problem })
  }
  return problems
}
