import { expect, test, type Page, type Route } from '@playwright/test'

const apiBaseUrl = getRequiredEnv('VITE_API_BASE_URL')
const seededSolution = createSeededSolution()

test('browses, copies, and collapses a saved solution across viewports', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await mockCurrentUser(page)
  await mockSolutionApi(page)

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/solutions')

  await expect(
    page.getByRole('heading', { name: '풀이 목록', level: 1 }),
  ).toBeVisible()
  await expect(page.getByText(/풀이작성자/)).toBeVisible()
  const navigation = page.getByRole('navigation', { name: '주요 탐색' })

  await expect(navigation).toHaveCSS('backdrop-filter', 'blur(12px)')
  await expect
    .poll(() =>
      navigation.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    )
    .not.toBe('rgba(0, 0, 0, 0)')

  await page.getByRole('link', { name: seededSolution.problemId }).click()

  await expect(
    page.getByRole('heading', {
      name: 'A+B',
      level: 1,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: /문제 원문 보기/ }),
  ).toHaveAttribute('href', 'https://www.acmicpc.net/problem/1000')
  await expect(page.getByTestId('solution-code')).toContainText(
    'public class Main',
  )
  await expect(
    page.getByTestId('solution-code').locator('.solution-code-syntax-keyword'),
  ).not.toHaveCount(0)

  const copyButtons = page.getByRole('button', { name: '코드 복사' })

  await expect(copyButtons).toHaveCount(2)
  await copyButtons.first().click()
  await expect(
    page.getByRole('button', { name: '코드를 복사했습니다.' }),
  ).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(seededSolution.code)

  const collapseButton = page.getByRole('button', {
    name: 'java',
    exact: true,
  })
  const collapsibleContentId =
    await collapseButton.getAttribute('aria-controls')

  expect(collapsibleContentId).not.toBeNull()
  const collapsibleContent = page.locator(
    `[id="${String(collapsibleContentId)}"]`,
  )
  await expect(collapseButton).toHaveAttribute('aria-expanded', 'true')
  await expect(collapsibleContent).toBeVisible()
  await collapseButton.click()
  await expect(collapseButton).toHaveAttribute('aria-expanded', 'false')
  await expect(collapsibleContent).toBeHidden()

  await page.setViewportSize({ width: 320, height: 667 })
  await copyButtons.first().scrollIntoViewIfNeeded()

  await expect(copyButtons.first()).toBeInViewport()
  await expect
    .poll(() =>
      page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ clientWidth: 320, scrollWidth: 320 })
})

test('scopes the solution list from the problem query string', async ({
  page,
}) => {
  await mockCurrentUser(page)
  const solutionApi = await mockSolutionApi(page)
  const problemId = seededSolution.problemId

  await page.goto(`/solutions?problemId=${encodeURIComponent(problemId)}`)

  await expect(
    page.getByText('이 문제의 풀이만 표시하고 있습니다.'),
  ).toBeVisible()
  await expect.poll(() => solutionApi.lastListProblemId()).toBe(problemId)

  await page.getByRole('link', { name: '전체 풀이 보기' }).click()

  await page.waitForURL(
    (url) =>
      url.pathname === '/solutions' && !url.searchParams.has('problemId'),
  )
  await expect.poll(() => solutionApi.lastListProblemId()).toBeNull()
  await expect(
    page.getByText('이 문제의 풀이만 표시하고 있습니다.'),
  ).not.toBeVisible()
})

test('creates a solution with CodeMirror keyboard and language behavior', async ({
  page,
}) => {
  await mockCurrentUser(page)
  const solutionApi = await mockSolutionApi(page)

  await page.setViewportSize({ width: 320, height: 667 })
  await page.goto('/solutions')
  const createSolutionLink = page.getByRole('link', { name: '새 풀이 작성' })

  await expect(createSolutionLink).toBeInViewport()
  await createSolutionLink.click()
  await page.waitForURL((url) => url.pathname === '/solutions/new')

  await page.getByRole('button', { name: '문제 선택' }).click()
  await expect(
    page.getByRole('heading', { name: '문제 선택', level: 2 }),
  ).toBeVisible()
  const problemPickerHeading = page.getByRole('heading', {
    name: '문제 선택',
    level: 2,
  })
  const problemPickerDialog = page.getByRole('dialog')
  const problemPickerDescription = page.getByText(
    '풀이를 등록할 문제를 선택해 주세요.',
    { exact: true },
  )
  const problemPickerPagination = page.getByText('Page 1 of 2', {
    exact: true,
  })
  const problemScrollArea = page.getByTestId('problem-picker-list-scroll-area')

  await expect
    .poll(() =>
      problemScrollArea.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    )
    .toBe(true)
  await problemPickerDialog.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    )
  })
  const headingTopBeforeScroll = await problemPickerHeading.evaluate(
    (element) => element.getBoundingClientRect().top,
  )
  const descriptionTopBeforeScroll = await problemPickerDescription.evaluate(
    (element) => element.getBoundingClientRect().top,
  )
  const paginationTopBeforeScroll = await problemPickerPagination.evaluate(
    (element) => element.getBoundingClientRect().top,
  )
  const [descriptionBox, listBox, paginationBox] = await Promise.all([
    problemPickerDescription.boundingBox(),
    problemScrollArea.boundingBox(),
    problemPickerPagination.boundingBox(),
  ])

  if (!descriptionBox || !listBox || !paginationBox) {
    throw new Error('Problem picker layout elements must have visible bounds')
  }

  expect(listBox.y).toBeGreaterThanOrEqual(
    descriptionBox.y + descriptionBox.height,
  )
  expect(listBox.y + listBox.height).toBeLessThanOrEqual(paginationBox.y)
  await problemScrollArea.evaluate((element) => {
    element.scrollTo({ top: element.scrollHeight })
  })
  await expect
    .poll(() => problemScrollArea.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)
  await expect
    .poll(() =>
      problemPickerHeading.evaluate(
        (element) => element.getBoundingClientRect().top,
      ),
    )
    .toBe(headingTopBeforeScroll)
  await expect
    .poll(() =>
      problemPickerDescription.evaluate(
        (element) => element.getBoundingClientRect().top,
      ),
    )
    .toBe(descriptionTopBeforeScroll)
  await expect
    .poll(() =>
      problemPickerPagination.evaluate(
        (element) => element.getBoundingClientRect().top,
      ),
    )
    .toBe(paginationTopBeforeScroll)
  await expect
    .poll(() => problemPickerDialog.evaluate((element) => element.scrollTop))
    .toBe(0)
  await problemScrollArea.evaluate((element) => {
    element.scrollTo({ top: 0 })
  })
  await page.getByRole('button', { name: /A\+B/ }).click()
  await expect(page.locator('form').getByText(/BOJ 1000/)).toBeVisible()

  const languageSelector = page.getByRole('combobox', {
    name: /프로그래밍 언어/,
  })

  await languageSelector.click()
  await page.getByRole('option', { name: 'Java', exact: true }).click()

  const codeEditor = page.getByRole('textbox', { name: /소스 코드/ })
  const codeInput = page.locator('input[name="code"]')

  await codeEditor.click()
  await page.keyboard.press('Tab')

  await expect(codeEditor).toBeFocused()
  await expect(codeInput).toHaveValue('  ')

  await page.keyboard.insertText('boolean value = true;')

  const javaConstant = page.locator('.solution-code-syntax-constant')

  await expect(javaConstant).not.toHaveCount(0)

  await languageSelector.click()
  await page.getByRole('option', { name: 'Python', exact: true }).click()
  await expect(javaConstant).toHaveCount(0)

  await languageSelector.click()
  await page.getByRole('option', { name: 'Java', exact: true }).click()
  await expect(javaConstant).not.toHaveCount(0)

  await page
    .getByRole('textbox', { name: /풀이 설명/ })
    .fill('E2E 신규 풀이 설명')
  await page.getByRole('checkbox', { name: /풀이 완료/ }).check()
  await page.getByRole('spinbutton', { name: /메모리 사용량/ }).fill('12345')
  await page.getByRole('spinbutton', { name: /실행 시간/ }).fill('67')
  await expect(page.getByRole('checkbox', { name: /임시 저장/ })).toHaveCount(0)

  await page.getByRole('button', { name: '풀이 저장' }).click()
  await page.waitForURL(
    (url) => url.pathname === `/solutions/${solutionApi.createdSolutionId}`,
  )

  expect(solutionApi.lastCreateRequest()).toEqual({
    problemId: seededSolution.problemId,
    language: 'Java',
    code: '  boolean value = true;',
    description: 'E2E 신규 풀이 설명',
    isSolved: true,
    isDraft: false,
    memoryUsage: 12_345,
    timeElapsed: 67,
  })
  await expect(
    page.getByRole('heading', {
      name: 'A+B',
      level: 1,
    }),
  ).toBeVisible()
  await expect(page.getByTestId('solution-code')).toContainText(
    'boolean value = true;',
  )
  await expect(page.getByText('E2E 신규 풀이 설명')).toBeVisible()
  await expect(page.getByText('12,345 KB')).toBeVisible()
  await expect(page.getByText('67 ms')).toBeVisible()
})

test('edits fields and preserves an author solution language alias', async ({
  page,
}) => {
  const editableSolution = { ...seededSolution, language: 'PyPy3' }
  await mockCurrentUser(page)
  const solutionApi = await mockSolutionApi(page, editableSolution)

  await page.goto(`/solutions/${editableSolution.solutionId}`)
  await page.getByRole('link', { name: '풀이 수정' }).click()
  await page.waitForURL(
    (url) => url.pathname === `/solutions/${editableSolution.solutionId}/edit`,
  )

  const description = page.getByRole('textbox', { name: /풀이 설명/ })

  await expect(
    page.getByRole('combobox', { name: '프로그래밍 언어' }),
  ).toHaveText('PyPy3')
  await description.fill('수정된 풀이 설명')
  await expect(page.getByRole('checkbox', { name: /임시 저장/ })).toHaveCount(0)
  await page.getByRole('button', { name: '변경사항 저장' }).click()

  await page.waitForURL(
    (url) => url.pathname === `/solutions/${editableSolution.solutionId}`,
  )
  expect(solutionApi.lastUpdateRequest()).toEqual({
    language: 'PyPy3',
    code: editableSolution.code,
    description: '수정된 풀이 설명',
    isSolved: true,
    isDraft: false,
    memoryUsage: 14_128,
    timeElapsed: 104,
  })
  await expect(page.getByText('수정된 풀이 설명')).toBeVisible()
})

async function mockCurrentUser(page: Page) {
  await page.route(apiUrl('/users/me'), async (route) => {
    await fulfillJson(route, {
      id: 'solution-e2e-user',
      email: 'solution-e2e@example.com',
      nickname: 'solution-e2e-user',
    })
  })
}

async function mockSolutionApi(
  page: Page,
  initialSeededSolution = seededSolution,
) {
  const createdSolutionId = 'solution-e2e-created'
  let updatedSeededSolution = initialSeededSolution
  let createdSolution: SolutionDetailResponse | null = null
  let createRequest: CreateSolutionRequest | null = null
  let updateRequest: UpdateSolutionRequest | null = null
  let listProblemId: string | null = null

  await page.route(`${apiUrl('/problems')}/*`, async (route) => {
    if (route.request().isNavigationRequest()) {
      await route.fallback()
      return
    }

    const problemId = decodeURIComponent(
      new URL(route.request().url()).pathname.split('/').at(-1) ?? '',
    )

    if (problemId !== initialSeededSolution.problemId) {
      await fulfillJson(route, { message: 'Problem not found' }, 404)
      return
    }

    await fulfillJson(route, {
      problemId,
      provider: 'BOJ',
      externalProblemId: '1000',
      name: 'A+B',
      url: 'https://www.acmicpc.net/problem/1000',
      difficulty: 'BRONZE_5',
    })
  })

  await page.route(matchEndpoint(apiUrl('/problems')), async (route) => {
    if (route.request().isNavigationRequest()) {
      await route.fallback()
      return
    }

    await fulfillJson(route, {
      problems: Array.from({ length: 10 }, (_, index) =>
        index === 0
          ? {
              problemId: initialSeededSolution.problemId,
              provider: 'BOJ',
              externalProblemId: '1000',
              name: 'A+B',
              url: 'https://www.acmicpc.net/problem/1000',
              difficulty: 'BRONZE_5',
            }
          : {
              problemId: `problem-e2e-${String(index)}`,
              provider: 'BOJ',
              externalProblemId: String(1000 + index),
              name: `E2E 문제 ${String(index)}`,
              url: `https://www.acmicpc.net/problem/${String(1000 + index)}`,
              difficulty: 'BRONZE_5',
            },
      ),
      page: 0,
      size: 10,
      totalElements: 12,
      totalPages: 2,
    })
  })

  await page.route(matchEndpoint(apiUrl('/solutions')), async (route) => {
    const request = route.request()

    if (request.isNavigationRequest()) {
      await route.fallback()
      return
    }

    if (request.method() === 'GET') {
      listProblemId = new URL(request.url()).searchParams.get('problemId')
      await fulfillJson(route, {
        solutions: [
          updatedSeededSolution,
          ...(createdSolution ? [createdSolution] : []),
        ]
          .filter(
            (solution) =>
              listProblemId === null || solution.problemId === listProblemId,
          )
          .map(toSolutionSummary)
          .reverse(),
      })
      return
    }

    if (request.method() === 'POST') {
      createRequest = request.postDataJSON() as CreateSolutionRequest
      createdSolution = {
        solutionId: createdSolutionId,
        problemId: initialSeededSolution.problemId,
        userId: 'solution-e2e-user',
        isSolved: createRequest.isSolved,
        isDraft: createRequest.isDraft,
        language: createRequest.language,
        memoryUsage: createRequest.memoryUsage,
        timeElapsed: createRequest.timeElapsed,
        code: createRequest.code,
        description: createRequest.description,
        createdAt: '2026-07-26T06:00:00.000Z',
        updatedAt: '2026-07-26T06:00:00.000Z',
      }

      await fulfillJson(route, { solutionId: createdSolutionId }, 201)
      return
    }

    await route.fallback()
  })

  await page.route(`${apiUrl('/solutions')}/*`, async (route) => {
    if (route.request().isNavigationRequest()) {
      await route.fallback()
      return
    }

    const solutionId = decodeURIComponent(
      new URL(route.request().url()).pathname.split('/').at(-1) ?? '',
    )

    if (route.request().method() === 'PUT') {
      updateRequest = route.request().postDataJSON() as UpdateSolutionRequest

      if (solutionId !== initialSeededSolution.solutionId) {
        await fulfillJson(route, { message: 'Solution not found' }, 404)
        return
      }

      updatedSeededSolution = {
        ...updatedSeededSolution,
        ...updateRequest,
        updatedAt: '2026-07-26T07:00:00.000Z',
      }
      await fulfillJson(route, updatedSeededSolution)
      return
    }

    const solution =
      solutionId === initialSeededSolution.solutionId
        ? updatedSeededSolution
        : solutionId === createdSolutionId
          ? createdSolution
          : null

    if (!solution) {
      await fulfillJson(route, { message: 'Solution not found' }, 404)
      return
    }

    await fulfillJson(route, solution)
  })

  return {
    createdSolutionId,
    lastCreateRequest() {
      return createRequest
    },
    lastListProblemId() {
      return listProblemId
    },
    lastUpdateRequest() {
      return updateRequest
    },
  }
}

function createSeededSolution(): SolutionDetailResponse {
  const code = [
    'import java.util.Scanner;',
    '',
    'public class Main {',
    '  public static void main(String[] args) {',
    '    Scanner scanner = new Scanner(System.in);',
    '    System.out.println(scanner.nextInt() + scanner.nextInt());',
    '  }',
    '}',
  ].join('\n')

  return {
    solutionId: 'solution-e2e-seeded',
    problemId: 'problem-e2e-addition',
    userId: 'solution-e2e-user',
    authorNickname: '풀이작성자',
    isSolved: true,
    isDraft: false,
    language: 'Java',
    memoryUsage: 14_128,
    timeElapsed: 104,
    code,
    description: [
      '# 접근 방법',
      '',
      '긴 코드 블록의 접기 동작을 확인한다.',
      '',
      '```java',
      ...code.split('\n'),
      '  private static int add(int a, int b) {',
      '    return a + b;',
      '  }',
      '```',
    ].join('\n'),
    createdAt: '2026-07-15T01:00:00.000Z',
    updatedAt: '2026-07-15T01:05:00.000Z',
  }
}

function toSolutionSummary(solution: SolutionDetailResponse) {
  return {
    solutionId: solution.solutionId,
    problemId: solution.problemId,
    userId: solution.userId,
    authorNickname: solution.authorNickname,
    isSolved: solution.isSolved,
    isDraft: solution.isDraft,
    language: solution.language,
    createdAt: solution.createdAt,
  }
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

function apiUrl(path: string) {
  return new URL(stripLeadingSlashes(path), ensureTrailingSlash(apiBaseUrl))
    .href
}

function matchEndpoint(expectedUrl: string) {
  const expected = new URL(expectedUrl)

  return (actual: URL) =>
    actual.origin === expected.origin && actual.pathname === expected.pathname
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

function stripLeadingSlashes(value: string) {
  return value.replace(/^\/+/, '')
}

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required to run e2e tests`)
  }

  return value
}

interface CreateSolutionRequest {
  problemId: string
  language: string
  code: string
  isSolved: boolean
  isDraft: false
  memoryUsage: number | null
  timeElapsed: number | null
  description: string | null
}

interface UpdateSolutionRequest {
  language: string
  code: string
  isSolved: boolean | null
  isDraft: boolean | null
  memoryUsage: number | null
  timeElapsed: number | null
  description: string | null
}

interface SolutionDetailResponse {
  solutionId: string
  problemId: string
  userId: string
  authorNickname?: string | null
  isSolved: boolean | null
  isDraft: boolean | null
  language: string
  memoryUsage: number | null
  timeElapsed: number | null
  code: string
  description: string | null
  createdAt: string
  updatedAt: string
}
