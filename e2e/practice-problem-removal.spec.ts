import { expect, test, type Page } from '@playwright/test'

const apiBaseUrl = process.env.VITE_API_BASE_URL
if (!apiBaseUrl) {
  throw new Error('VITE_API_BASE_URL is required to run e2e tests')
}
const apiBase = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`

test.skip(
  process.env.E2E_ENABLE_MSW === 'true',
  'MSW-enabled runs already control practice requests through the service worker.',
)

const practicePath = '/groups/group-1/practices/practice-1'
const problems = [
  {
    problemId: 'problem-1',
    provider: 'BOJ',
    externalProblemId: '1000',
    name: 'A+B',
  },
  {
    problemId: 'problem-2',
    provider: 'BOJ',
    externalProblemId: '1001',
    name: 'A-B',
  },
]
const practice = {
  practiceId: 'practice-1',
  groupId: 'group-1',
  title: '문제 삭제 테스트',
  startDate: '2026-10-25T00:00:00Z',
  endDate: '2026-10-26T00:00:00Z',
  problems,
}
const removalErrors = [
  {
    status: 403,
    code: 'PRACTICE_FORBIDDEN',
    message: '연습에 대한 권한이 없습니다.',
  },
  {
    status: 404,
    code: 'PRACTICE_NOT_FOUND',
    message: '연습을 찾을 수 없습니다.',
  },
  {
    status: 404,
    code: 'PROBLEM_NOT_IN_PRACTICE',
    message: '연습에 포함된 문제를 찾을 수 없습니다.',
  },
  {
    status: 409,
    code: 'PRACTICE_ALREADY_ENDED',
    message: '종료된 연습은 조회하거나 수정할 수 없습니다.',
  },
  {
    status: 409,
    code: 'PRACTICE_MINIMUM_PROBLEM_REQUIRED',
    message: '연습에는 최소 1개의 문제가 필요합니다.',
  },
]

function apiUrl(path: string) {
  return new URL(path.replace(/^\/+/, ''), apiBase).href
}

function mockPracticeDetail(page: Page, detail: unknown) {
  return page.route(apiUrl(practicePath), (route) => {
    if (route.request().isNavigationRequest()) {
      return route.fallback()
    }

    return route.fulfill({ json: detail })
  })
}

test.beforeEach(async ({ page }) => {
  await page.route(apiUrl('/users/me'), (route) =>
    route.fulfill({
      json: {
        id: 'user-1',
        email: 'user@example.com',
        nickname: 'user',
      },
    }),
  )
  await page.route(apiUrl('/auth/csrf'), (route) =>
    route.fulfill({
      json: { token: 'practice-e2e-csrf', headerName: 'X-XSRF-TOKEN' },
    }),
  )
  await mockPracticeDetail(page, practice)
})

for (const error of removalErrors) {
  test(`shows the server message for ${error.code} and keeps the problem`, async ({
    page,
  }) => {
    const isLastProblem = error.code === 'PRACTICE_MINIMUM_PROBLEM_REQUIRED'
    if (isLastProblem) {
      await page.setViewportSize({ width: 390, height: 844 })
      await mockPracticeDetail(page, {
        ...practice,
        problems: problems.slice(0, 1),
      })
    }
    await page.route(apiUrl(`${practicePath}/problems/problem-1`), (route) =>
      route.fulfill({
        status: error.status,
        json: { ...error, timestamp: '2026-10-25T00:00:00Z' },
      }),
    )

    await page.goto(practicePath)
    await page.getByRole('button', { name: '문제 삭제', exact: true }).click()
    const deleteButtons = page.getByRole('button', {
      name: '삭제',
      exact: true,
    })
    await expect(deleteButtons).toHaveCount(isLastProblem ? 1 : problems.length)
    await page
      .getByRole('row')
      .filter({ hasText: 'A+B' })
      .getByRole('button', { name: '삭제', exact: true })
      .click()

    const errorMessage = page.getByText(error.message, { exact: true })
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toBeInViewport()
    await expect(page.getByText('A+B', { exact: true })).toBeVisible()
    await expect(deleteButtons).toHaveCount(isLastProblem ? 1 : problems.length)
    await expect(page.getByText('문제가 삭제되었습니다.')).toHaveCount(0)
  })
}

test('shows a success message and refreshes the problem list after deletion', async ({
  page,
}) => {
  await page.route(
    apiUrl(`${practicePath}/problems/problem-1`),
    async (route) => {
      await mockPracticeDetail(page, { ...practice, problems: [problems[1]] })
      await route.fulfill({ status: 204 })
    },
  )

  await page.goto(practicePath)
  await page.getByRole('button', { name: '문제 삭제', exact: true }).click()
  await page
    .getByRole('row')
    .filter({ hasText: 'A+B' })
    .getByRole('button', { name: '삭제', exact: true })
    .click()

  await expect(page.getByText('문제가 삭제되었습니다.')).toBeVisible()
  await expect(page.getByText('A+B', { exact: true })).toHaveCount(0)
  await expect(page.getByText('A-B', { exact: true })).toBeVisible()
})

test('shows errors for both requests when problems are deleted consecutively', async ({
  page,
}) => {
  let releaseFirstResponse: () => void = () => undefined
  const firstResponseReady = new Promise<void>((resolve) => {
    releaseFirstResponse = resolve
  })

  await page.route(
    apiUrl(`${practicePath}/problems/problem-1`),
    async (route) => {
      await firstResponseReady
      await route.fulfill({
        status: 404,
        json: {
          code: 'PROBLEM_NOT_IN_PRACTICE',
          message: '연습에 포함된 문제를 찾을 수 없습니다.',
          timestamp: '2026-10-25T00:00:00Z',
        },
      })
    },
  )
  await page.route(apiUrl(`${practicePath}/problems/problem-2`), (route) =>
    route.fulfill({
      status: 409,
      json: {
        code: 'PRACTICE_MINIMUM_PROBLEM_REQUIRED',
        message: '연습에는 최소 1개의 문제가 필요합니다.',
        timestamp: '2026-10-25T00:00:00Z',
      },
    }),
  )

  await page.goto(practicePath)
  await page.getByRole('button', { name: '문제 삭제', exact: true }).click()
  const firstRequest = page.waitForRequest(
    (request) =>
      request.method() === 'DELETE' &&
      request.url() === apiUrl(`${practicePath}/problems/problem-1`),
  )
  await page
    .getByRole('row')
    .filter({ hasText: 'A+B' })
    .getByRole('button', { name: '삭제', exact: true })
    .click()
  await firstRequest
  await page
    .getByRole('row')
    .filter({ hasText: 'A-B' })
    .getByRole('button', { name: '삭제', exact: true })
    .click()
  await expect(
    page.getByText('연습에는 최소 1개의 문제가 필요합니다.', { exact: true }),
  ).toBeVisible()

  releaseFirstResponse()

  await expect(
    page.getByText('연습에 포함된 문제를 찾을 수 없습니다.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('A+B', { exact: true })).toBeVisible()
  await expect(page.getByText('A-B', { exact: true })).toBeVisible()
})
