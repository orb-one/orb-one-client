import type {
  CreateSolutionRequest,
  SolutionDetailResponse,
  SolutionSummaryResponse,
} from '@/lib/api/solutions'

const problemIds = new Set([
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
])

const seededUserId = '00000000-0000-4000-8000-000000000001'

let solutions = createSolutionFixtures()

export function resetMockSolutions() {
  solutions = createSolutionFixtures()
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
    description: null,
    isSolved: null,
    isDraft: null,
    memoryUsage: null,
    timeElapsed: null,
    createdAt: now,
    updatedAt: now,
  }

  solutions = [solution, ...solutions]

  return solution
}

function toSolutionSummary(
  solution: SolutionDetailResponse,
): SolutionSummaryResponse {
  return {
    solutionId: solution.solutionId,
    problemId: solution.problemId,
    userId: solution.userId,
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
