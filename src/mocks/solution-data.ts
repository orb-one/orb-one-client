import type {
  CreateSolutionRequest,
  SolutionDetailResponse,
  SolutionSummaryResponse,
  UpdateSolutionRequest,
} from '@/lib/api/solutions'
import type { ProblemProvider } from '@/lib/problems/problem-model'

const problemIds = new Set([
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
])
const solutionProblemMetadata = new Map<
  string,
  {
    problemName: string
    problemProvider: ProblemProvider
    problemNumber: string
    problemDifficulty: string | null
  }
>([
  [
    '10000000-0000-4000-8000-000000000001',
    {
      problemName: 'A+B',
      problemProvider: 'BOJ',
      problemNumber: '1000',
      problemDifficulty: 'BRONZE_5',
    },
  ],
  [
    '10000000-0000-4000-8000-000000000002',
    {
      problemName: 'Hello World',
      problemProvider: 'BOJ',
      problemNumber: '2557',
      problemDifficulty: 'BRONZE_5',
    },
  ],
  [
    '10000000-0000-4000-8000-000000000003',
    {
      problemName: '최빈수 구하기',
      problemProvider: 'SWEA',
      problemNumber: '1204',
      problemDifficulty: null,
    },
  ],
])

const seededUserId = '00000000-0000-4000-8000-000000000001'

let solutions = createSolutionFixtures()
let deletedSolutions = new Map<
  string,
  { solution: SolutionDetailResponse; index: number; deletedAt: number }
>()

export function resetMockSolutions() {
  solutions = createSolutionFixtures()
  deletedSolutions = new Map()
}

export function getMockSolutionSummaries(
  problemId?: string,
): SolutionSummaryResponse[] {
  return solutions
    .filter(
      (solution) => problemId === undefined || solution.problemId === problemId,
    )
    .map(toSolutionSummary)
}

export function getMockSolution(solutionId: string) {
  return solutions.find((solution) => solution.solutionId === solutionId)
}

export function createMockSolution(
  request: CreateSolutionRequest,
  authorId: string,
) {
  if (!problemIds.has(request.problemId)) {
    return null
  }

  const now = new Date().toISOString()
  const solution: SolutionDetailResponse = {
    solutionId: crypto.randomUUID(),
    problemId: request.problemId,
    userId: authorId,
    language: request.language,
    code: request.code,
    description: request.description,
    isSolved: request.isSolved,
    isDraft: request.isDraft,
    memoryUsage: request.memoryUsage,
    timeElapsed: request.timeElapsed,
    createdAt: now,
    updatedAt: now,
  }

  solutions = [solution, ...solutions]

  return solution
}

export function updateMockSolution(
  solutionId: string,
  editorId: string,
  request: UpdateSolutionRequest,
) {
  const index = solutions.findIndex(
    (solution) => solution.solutionId === solutionId,
  )

  if (index < 0) {
    return { ok: false as const, status: 404 as const }
  }

  const current = solutions[index]

  if (!current) {
    return { ok: false as const, status: 404 as const }
  }

  if (current.userId !== editorId) {
    return {
      ok: false as const,
      status: current.isDraft === true ? (404 as const) : (403 as const),
    }
  }

  const updated: SolutionDetailResponse = {
    ...current,
    ...request,
    updatedAt: new Date().toISOString(),
  }

  solutions = solutions.map((solution, solutionIndex) =>
    solutionIndex === index ? updated : solution,
  )

  return { ok: true as const, solution: updated }
}

/** 서버와 같은 소유권 규칙으로 풀이를 목록에서 숨긴다. */
export function deleteMockSolution(solutionId: string, deleterId: string) {
  const index = solutions.findIndex(
    (solution) => solution.solutionId === solutionId,
  )
  const solution = solutions[index]

  if (index < 0 || !solution) {
    return { ok: false as const, status: 404 as const }
  }

  if (solution.userId !== deleterId) {
    return {
      ok: false as const,
      status: solution.isDraft === true ? (404 as const) : (403 as const),
    }
  }

  deletedSolutions.set(solutionId, {
    solution,
    index,
    deletedAt: Date.now(),
  })
  solutions = solutions.filter(
    (current) => current.solutionId !== solution.solutionId,
  )

  return { ok: true as const }
}

/** 5분 이내에 작성자가 삭제한 풀이를 원래 목록 위치로 복구한다. */
export function restoreMockSolution(solutionId: string, restorerId: string) {
  const deleted = deletedSolutions.get(solutionId)
  const isExpired =
    deleted !== undefined && Date.now() - deleted.deletedAt >= 5 * 60 * 1000

  if (deleted?.solution.userId !== restorerId || isExpired) {
    return { ok: false as const, status: 404 as const }
  }

  const index = Math.min(deleted.index, solutions.length)
  solutions = [
    ...solutions.slice(0, index),
    deleted.solution,
    ...solutions.slice(index),
  ]
  deletedSolutions.delete(solutionId)

  return { ok: true as const }
}

function toSolutionSummary(
  solution: SolutionDetailResponse,
): SolutionSummaryResponse {
  const problem = solutionProblemMetadata.get(solution.problemId)

  return {
    solutionId: solution.solutionId,
    problemId: solution.problemId,
    userId: solution.userId,
    problemName: problem?.problemName ?? null,
    problemProvider: problem?.problemProvider ?? null,
    problemNumber: problem?.problemNumber ?? null,
    problemDifficulty: problem?.problemDifficulty ?? null,
    language: solution.language,
    isSolved: solution.isSolved,
    isDraft: solution.isDraft,
    createdAt: solution.createdAt,
  }
}

function createSolutionFixtures(): SolutionDetailResponse[] {
  return [
    {
      solutionId: '30000000-0000-4000-8000-000000000001',
      problemId: '10000000-0000-4000-8000-000000000001',
      userId: seededUserId,
      isSolved: true,
      isDraft: false,
      language: 'Java',
      memoryUsage: 14_128,
      timeElapsed: 104,
      code: [
        'import java.util.Scanner;',
        '',
        'public class Main {',
        '  public static void main(String[] args) {',
        '    Scanner scanner = new Scanner(System.in);',
        '    System.out.println(scanner.nextInt() + scanner.nextInt());',
        '  }',
        '}',
      ].join('\n'),
      description: [
        '# 접근 방법',
        '',
        '두 정수를 입력받아 **합**을 출력하는 문제다.',
        '',
        '1. `Scanner`로 두 정수를 읽는다.',
        '2. 두 값을 더해 결과를 출력한다.',
        '',
        '```java',
        'import java.util.Scanner;',
        '',
        'public class Main {',
        '  public static void main(String[] args) {',
        '    Scanner scanner = new Scanner(System.in);',
        '    int a = scanner.nextInt();',
        '    int b = scanner.nextInt();',
        '    int answer = add(a, b);',
        '    System.out.println(answer);',
        '  }',
        '',
        '  private static int add(int a, int b) {',
        '    return a + b;',
        '  }',
        '}',
        '```',
        '',
        '## 복잡도',
        '',
        '| 항목 | 복잡도 |',
        '| --- | --- |',
        '| 시간 | `O(1)` |',
        '| 공간 | `O(1)` |',
        '',
        '> 덧셈만 수행하므로 입력 크기와 무관하다.',
      ].join('\n'),
      createdAt: '2026-07-15T01:00:00.000Z',
      updatedAt: '2026-07-15T01:05:00.000Z',
    },
    {
      solutionId: '30000000-0000-4000-8000-000000000002',
      problemId: '10000000-0000-4000-8000-000000000002',
      userId: seededUserId,
      isSolved: true,
      isDraft: false,
      language: 'Python',
      memoryUsage: 34_120,
      timeElapsed: 76,
      code: [
        'from collections import deque',
        '',
        'queue = deque([(0, 0)])',
        'while queue:',
        '    row, column = queue.popleft()',
      ].join('\n'),
      description: [
        '# 풀이 전략',
        '',
        '시작점부터 **BFS**를 수행해 도착점까지의 최단 거리를 구한다.',
        '',
        '```python',
        'queue = deque([(0, 0)])',
        '```',
      ].join('\n'),
      createdAt: '2026-07-16T03:00:00.000Z',
      updatedAt: '2026-07-16T03:20:00.000Z',
    },
    {
      solutionId: '30000000-0000-4000-8000-000000000003',
      problemId: '10000000-0000-4000-8000-000000000003',
      userId: seededUserId,
      isSolved: false,
      isDraft: true,
      language: 'Java',
      memoryUsage: null,
      timeElapsed: null,
      code: 'public class Main {\n}',
      description: null,
      createdAt: '2026-07-17T05:00:00.000Z',
      updatedAt: '2026-07-18T07:30:00.000Z',
    },
  ]
}
