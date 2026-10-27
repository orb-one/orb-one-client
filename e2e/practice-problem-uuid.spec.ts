import { expect, test, type Page } from '@playwright/test'

const apiBaseUrl = process.env.VITE_API_BASE_URL
if (!apiBaseUrl)
  throw new Error('VITE_API_BASE_URL is required to run e2e tests')
const apiBase = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`
const groupPath = '/groups/uuid-group'
const practicePath = `${groupPath}/practices/practice-uuid`
const catalog = [
  {
    problemId: '10000000-0000-4000-8000-000000000001',
    provider: 'BOJ',
    externalProblemId: '1000',
    name: 'A+B',
    url: 'https://www.acmicpc.net/problem/1000',
    difficulty: null,
  },
  {
    problemId: '10000000-0000-4000-8000-000000000002',
    provider: 'BOJ',
    externalProblemId: '2557',
    name: 'Hello World',
    url: 'https://www.acmicpc.net/problem/2557',
    difficulty: null,
  },
  {
    problemId: '10000000-0000-4000-8000-000000000003',
    provider: 'SWEA',
    externalProblemId: '1204',
    name: '최빈수 구하기',
    url: 'https://swexpertacademy.com/main/code/problem/problemDetail.do?contestProbId=AV13zo1KAAACFAYh',
    difficulty: null,
  },
]

function apiUrl(path: string) {
  return new URL(path.replace(/^\/+/, ''), apiBase).href
}

test.skip(
  process.env.E2E_ENABLE_MSW === 'true',
  'This suite uses page.route mocks with MSW disabled.',
)
test.use({ serviceWorkers: 'block' })

async function selectProblem(page: Page, name: string, keyword?: string) {
  await page
    .getByRole('button', { name: /문제 선택|문제 변경/, exact: true })
    .click()
  await expect(
    page.getByText('연습에 추가할 문제를 선택해 주세요.', { exact: true }),
  ).toBeVisible()
  if (keyword)
    await page.getByRole('textbox', { name: '문제 검색' }).fill(keyword)
  await page
    .getByRole('button')
    .filter({ has: page.getByText(name, { exact: true }) })
    .click()
  await expect(
    page.getByRole('heading', { name: '문제 선택', exact: true }),
  ).toBeHidden()
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 740 },
]) {
  test(`creates and adds catalog UUIDs, preserving input on failure at ${String(viewport.width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    const practice = {
      practiceId: 'practice-uuid',
      groupId: 'uuid-group',
      title: 'UUID 연습',
      startDate: '2030-01-01T00:00:00',
      endDate: '2030-01-03T23:59:59',
      problems: catalog.slice(0, 1),
    }
    const createBodies: unknown[] = []
    const addBodies: unknown[] = []
    let created = false
    let rejectAdd = true
    await page.route(apiUrl('/users/me'), (route) =>
      route.fulfill({
        json: { id: 'user-1', email: 'user@example.com', nickname: '테스터' },
      }),
    )
    await page.route(apiUrl('/auth/csrf'), (route) =>
      route.fulfill({
        json: { token: 'uuid-e2e-csrf', headerName: 'X-XSRF-TOKEN' },
      }),
    )
    await page.route(apiUrl(groupPath), (route) =>
      route.request().isNavigationRequest()
        ? route.fallback()
        : route.fulfill({
            json: {
              groupId: 'uuid-group',
              groupName: 'UUID 그룹',
              members: [
                { userId: 'user-1', nickname: '테스터', role: 'OWNER' },
              ],
            },
          }),
    )
    await page.route(apiUrl('/problems') + '?**', (route) => {
      const keyword =
        new URL(route.request().url()).searchParams.get('keyword') ?? ''
      const problems = catalog.filter(
        (problem) =>
          problem.name.includes(keyword) ||
          problem.externalProblemId.includes(keyword),
      )
      return route.fulfill({
        json: {
          problems,
          page: 0,
          size: 10,
          totalElements: problems.length,
          totalPages: 1,
        },
      })
    })
    await page.route(apiUrl(`${groupPath}/practices`), async (route) => {
      if (route.request().method() === 'GET')
        return route.fulfill({ json: created ? [practice] : [] })
      createBodies.push(route.request().postDataJSON())
      if (createBodies.length === 1)
        return route.fulfill({
          status: 404,
          json: {
            code: 'PROBLEM_NOT_FOUND',
            message: '문제를 찾을 수 없습니다.',
          },
        })
      created = true
      return route.fulfill({ status: 201, json: practice })
    })
    await page.route(apiUrl(practicePath), (route) =>
      route.request().isNavigationRequest()
        ? route.fallback()
        : route.fulfill({ json: practice }),
    )
    await page.route(apiUrl(`${practicePath}/problems`), (route) => {
      addBodies.push(route.request().postDataJSON())
      if (rejectAdd) {
        rejectAdd = false
        return route.fulfill({
          status: 409,
          json: {
            code: 'PROBLEM_ALREADY_IN_PRACTICE',
            message: '이미 연습에 포함된 문제가 있습니다.',
          },
        })
      }
      practice.problems = [...catalog]
      return route.fulfill({
        status: 200,
        json: { practiceId: practice.practiceId, problems: practice.problems },
      })
    })

    await page.goto(`${groupPath}?tab=practice`)
    await page.getByRole('button', { name: '연습 생성', exact: true }).click()
    await expect(
      page.getByRole('button', { name: '생성하기', exact: true }),
    ).toBeDisabled()
    await expect(page.getByRole('textbox', { name: '문제 링크' })).toHaveCount(
      0,
    )
    await page.getByRole('textbox', { name: '연습 이름' }).fill(practice.title)
    await page.getByRole('textbox', { name: '시작 일시' }).fill('20300101')
    await page.getByRole('textbox', { name: '종료 일시' }).fill('20300103')
    await selectProblem(page, 'Hello World', '2557')
    await page.getByRole('button', { name: '생성하기', exact: true }).click()
    await expect(
      page.getByText(
        '선택한 문제를 찾을 수 없습니다. 다른 문제를 선택해 주세요.',
        { exact: true },
      ),
    ).toBeVisible()
    await expect(page.getByRole('textbox', { name: '연습 이름' })).toHaveValue(
      practice.title,
    )
    await expect(page.getByRole('textbox', { name: '시작 일시' })).toHaveValue(
      '2030-01-01',
    )
    await page.screenshot({ path: test.info().outputPath('create-error.png') })
    await selectProblem(page, 'A+B', '1000')
    await page.getByRole('button', { name: '생성하기', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: '연습 만들기', exact: true }),
    ).toBeHidden()
    expect(createBodies).toEqual([
      {
        title: practice.title,
        startDate: practice.startDate,
        endDate: practice.endDate,
        problemIds: [catalog[1]?.problemId],
      },
      {
        title: practice.title,
        startDate: practice.startDate,
        endDate: practice.endDate,
        problemIds: [catalog[0]?.problemId],
      },
    ])

    await page.getByRole('link', { name: practice.title, exact: true }).click()
    await page.getByRole('button', { name: '문제 추가', exact: true }).click()
    const submit = page.getByRole('button', {
      name: '선택한 문제 추가',
      exact: true,
    })
    await expect(submit).toBeDisabled()
    const row = (name: string) =>
      page
        .getByRole('dialog')
        .getByRole('button')
        .filter({ has: page.getByText(name, { exact: true }) })
    await expect(row('A+B')).toBeDisabled()
    await expect(page.getByText('이미 추가됨')).toBeVisible()
    await page.getByRole('textbox', { name: '문제 검색' }).fill('2557')
    await row('Hello World').click()
    await page.getByRole('textbox', { name: '문제 검색' }).fill('1204')
    await row('최빈수 구하기').click()
    await expect(page.getByText('2개 선택됨')).toBeVisible()
    await submit.click()
    await expect(
      page.getByText('이미 연습에 포함된 문제가 있습니다.', { exact: true }),
    ).toBeVisible()
    await expect(page.getByText('2개 선택됨')).toBeVisible()
    await page.getByRole('button', { name: '선택한 문제만 보기' }).click()
    await expect(row('Hello World')).toBeVisible()
    await expect(row('최빈수 구하기')).toBeVisible()
    await row('Hello World').click()
    await expect(page.getByText('1개 선택됨')).toBeVisible()
    await page.getByRole('button', { name: '전체 목록 보기' }).click()
    await page.getByRole('textbox', { name: '문제 검색' }).fill('2557')
    await row('Hello World').click()
    await page.getByRole('button', { name: '선택한 문제만 보기' }).click()
    await page.screenshot({ path: test.info().outputPath('add-selected.png') })
    await submit.click()
    await expect(
      page.getByRole('heading', { name: '문제 추가하기', exact: true }),
    ).toBeHidden()
    await expect(
      page.getByRole('cell', { name: 'Hello World', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: '최빈수 구하기', exact: true }),
    ).toBeVisible()
    expect(addBodies).toEqual([
      { problemIds: [catalog[1]?.problemId, catalog[2]?.problemId] },
      { problemIds: [catalog[2]?.problemId, catalog[1]?.problemId] },
    ])
  })
}
