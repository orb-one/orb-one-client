import type {
  CreateSolutionRequest,
  ProblemSummaryResponse,
  SolutionDetailResponse,
  SolutionSummaryResponse,
} from '@/lib/api/solutions'

const additionProblem: ProblemSummaryResponse = {
  problemId: '10000000-0000-4000-8000-000000000001',
  name: 'A+B',
  tier: 1,
  url: 'https://www.acmicpc.net/problem/1000',
  tags: [{ tagId: '20000000-0000-4000-8000-000000000001', name: '수학' }],
}

const mazeProblem: ProblemSummaryResponse = {
  problemId: '10000000-0000-4000-8000-000000000002',
  name: '미로 탐색',
  tier: 10,
  url: 'https://www.acmicpc.net/problem/2178',
  tags: [
    {
      tagId: '20000000-0000-4000-8000-000000000002',
      name: '그래프 탐색',
    },
    {
      tagId: '20000000-0000-4000-8000-000000000003',
      name: '너비 우선 탐색',
    },
  ],
}

const sequenceProblem: ProblemSummaryResponse = {
  problemId: '10000000-0000-4000-8000-000000000003',
  name: '가장 긴 증가하는 부분 수열',
  tier: null,
  url: null,
}

const problemFixtures = [additionProblem, mazeProblem, sequenceProblem]

let solutions = createSolutionFixtures()

// 테스트와 개발 중 상태를 동일한 seed로 되돌릴 수 있도록 명시적인 reset 경계를 제공한다.
export function resetMockSolutions() {
  solutions = createSolutionFixtures()
}

export function getMockSolutionSummaries(
  problemId?: string,
): SolutionSummaryResponse[] {
  return solutions
    .filter(
      (solution) =>
        problemId === undefined || solution.problem?.problemId === problemId,
    )
    .map(toSolutionSummary)
}

export function getMockSolution(solutionId: string) {
  return solutions.find((solution) => solution.solutionId === solutionId)
}

export function createMockSolution(request: CreateSolutionRequest) {
  const problem = problemFixtures.find(
    (candidate) => candidate.problemId === request.problemId,
  )

  if (!problem) {
    return null
  }

  const now = new Date().toISOString()
  const solution: SolutionDetailResponse = {
    solutionId: crypto.randomUUID(),
    problem,
    isSolved: false,
    isDraft: false,
    language: request.language,
    memoryUsage: null,
    timeElapsed: null,
    code: request.code,
    // 등록 명세에는 description이 없지만 상세 응답에서는 필수이므로 빈 문자열로 초기화한다.
    description: '',
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
    ...(solution.problem ? { problem: solution.problem } : {}),
    ...(solution.isSolved !== undefined ? { isSolved: solution.isSolved } : {}),
    ...(solution.isDraft !== undefined ? { isDraft: solution.isDraft } : {}),
    ...(solution.language !== undefined ? { language: solution.language } : {}),
    ...(solution.memoryUsage !== undefined
      ? { memoryUsage: solution.memoryUsage }
      : {}),
    ...(solution.timeElapsed !== undefined
      ? { timeElapsed: solution.timeElapsed }
      : {}),
    ...(solution.createdAt !== undefined
      ? { createdAt: solution.createdAt }
      : {}),
    ...(solution.updatedAt !== undefined
      ? { updatedAt: solution.updatedAt }
      : {}),
  }
}

function createSolutionFixtures(): SolutionDetailResponse[] {
  return [
    {
      solutionId: '30000000-0000-4000-8000-000000000001',
      problem: additionProblem,
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
      problem: mazeProblem,
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
        '- `deque`에 방문할 좌표를 저장한다.',
        '- 방문하지 않은 인접 칸을 큐에 추가한다.',
        '- 처음 도착점에 도달했을 때의 거리가 최단 거리다.',
        '',
        '```python',
        'queue = deque([(0, 0)])',
        'while queue:',
        '    row, column = queue.popleft()',
        '```',
      ].join('\n'),
      createdAt: '2026-07-16T03:00:00.000Z',
      updatedAt: '2026-07-16T03:20:00.000Z',
    },
    {
      solutionId: '30000000-0000-4000-8000-000000000003',
      problem: sequenceProblem,
      isSolved: false,
      isDraft: true,
      language: 'Java',
      memoryUsage: null,
      timeElapsed: null,
      code: 'public class Main {\n}',
      description: '',
      createdAt: '2026-07-17T05:00:00.000Z',
      updatedAt: '2026-07-18T07:30:00.000Z',
    },
  ]
}
