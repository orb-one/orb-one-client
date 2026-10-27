import { expect, test, type Locator, type Page } from '@playwright/test'

const apiBaseUrl = process.env.VITE_API_BASE_URL
if (!apiBaseUrl)
  throw new Error('VITE_API_BASE_URL is required to run e2e tests')
const apiBase = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`
const groupPath = '/groups/dialog-group'
const practicePath = `${groupPath}/practices/dialog-practice`
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
    provider: 'BOJ',
    externalProblemId: '1001',
    name: 'A-B',
    url: 'https://www.acmicpc.net/problem/1001',
    difficulty: null,
  },
]
type FormKind = 'create' | 'add'

function apiUrl(path: string) {
  return new URL(path.replace(/^\/+/, ''), apiBase).href
}

test.skip(
  process.env.E2E_ENABLE_MSW === 'true',
  'This suite uses page.route mocks with MSW disabled.',
)
test.use({ serviceWorkers: 'block' })

test.beforeEach(async ({ page }) => {
  await page.route(apiUrl('/users/me'), (route) =>
    route.fulfill({
      json: { id: 'user-1', nickname: '테스터', email: 'user@example.com' },
    }),
  )
  await page.route(apiUrl('/auth/csrf'), (route) =>
    route.fulfill({
      json: { token: 'dialog-e2e-csrf', headerName: 'X-XSRF-TOKEN' },
    }),
  )
  await page.route(apiUrl(groupPath), (route) =>
    route.request().isNavigationRequest()
      ? route.fallback()
      : route.fulfill({
          json: {
            groupId: 'dialog-group',
            groupName: '모달 테스트 그룹',
            members: [],
          },
        }),
  )
  await page.route(apiUrl(`${groupPath}/practices`), (route) =>
    route.fulfill({ json: [] }),
  )
  await page.route(apiUrl(practicePath), (route) =>
    route.request().isNavigationRequest()
      ? route.fallback()
      : route.fulfill({
          json: {
            practiceId: 'dialog-practice',
            groupId: 'dialog-group',
            title: '모달 테스트 연습',
            startDate: '2030-01-01T00:00:00',
            endDate: '2030-01-03T23:59:59',
            problems: catalog.slice(2, 3),
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
})

async function openForm(page: Page, kind: FormKind) {
  await page.goto(
    kind === 'create' ? `${groupPath}?tab=practice` : practicePath,
  )
  await page
    .getByRole('button', {
      name: kind === 'create' ? '연습 생성' : '문제 추가',
      exact: true,
    })
    .click()
  if (kind === 'create') {
    await page.getByRole('textbox', { name: '연습 이름' }).fill('보존할 초안')
    await page.getByRole('textbox', { name: '시작 일시' }).fill('20300101')
    await page.getByRole('textbox', { name: '종료 일시' }).fill('20300103')
  }
}

async function openPicker(page: Page) {
  const button = page.getByRole('button', {
    name: /문제 선택|문제 변경/,
    exact: true,
  })
  if (await button.count()) await button.click()
  else await page.getByRole('textbox', { name: '문제 검색' }).focus()
  await expect(page.getByRole('textbox', { name: '문제 검색' })).toBeFocused()
}

async function chooseProblem(page: Page, name: string) {
  await page
    .getByRole('button')
    .filter({ has: page.getByText(name, { exact: true }) })
    .click()
  if (
    !(await page
      .getByRole('heading', { name: '문제 추가하기', exact: true })
      .count())
  ) {
    await expect(
      page.getByRole('heading', { name: '문제 선택', exact: true }),
    ).toBeHidden()
  }
}

for (const kind of ['create', 'add'] as const) {
  test(`${kind}: search Enter never submits the draft, including after reselecting`, async ({
    page,
  }) => {
    const requests: unknown[] = []
    const submitPath =
      kind === 'create' ? `${groupPath}/practices` : `${practicePath}/problems`
    await page.route(apiUrl(submitPath), async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      requests.push(route.request().postDataJSON())
      return route.fulfill({
        status: kind === 'create' ? 201 : 200,
        json: { practiceId: 'dialog-practice', title: '보존할 초안' },
      })
    })
    await openForm(page, kind)
    await openPicker(page)
    await page.getByRole('textbox', { name: '문제 검색' }).press('Enter')
    await chooseProblem(page, 'Hello World')
    await openPicker(page)
    const search = page.getByRole('textbox', { name: '문제 검색' })
    await search.fill('1000')
    await expect(
      page
        .getByRole('button')
        .filter({ has: page.getByText('Hello World', { exact: true }) }),
    ).toHaveCount(0)
    await search.press('Enter')
    await chooseProblem(page, 'A+B')
    await page
      .getByRole('button', {
        name: kind === 'create' ? '생성하기' : '선택한 문제 추가',
        exact: true,
      })
      .click()
    await expect(
      page.getByRole('heading', {
        name: kind === 'create' ? '연습 만들기' : '문제 추가하기',
        exact: true,
      }),
    ).toBeHidden()
    expect(requests).toEqual([
      kind === 'create'
        ? {
            title: '보존할 초안',
            startDate: '2030-01-01T00:00:00',
            endDate: '2030-01-03T23:59:59',
            problemIds: [catalog[0]?.problemId],
          }
        : { problemIds: [catalog[1]?.problemId, catalog[0]?.problemId] },
    ])
  })

  test(`${kind}: Escape closes the picker and restores the appropriate draft state`, async ({
    page,
  }) => {
    await openForm(page, kind)
    await openPicker(page)
    await chooseProblem(page, 'Hello World')
    if (kind === 'add') {
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await page.getByRole('button', { name: '문제 추가', exact: true }).click()
      await expect(page.getByText('0개 선택됨')).toBeVisible()
      return
    }
    await openPicker(page)
    await page.getByRole('textbox', { name: '문제 검색' }).press('Escape')
    await expect(
      page.getByRole('heading', { name: '문제 선택', exact: true }),
    ).toBeHidden()
    await expect(
      page.getByRole('heading', {
        name: '연습 만들기',
        exact: true,
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: '문제 변경', exact: true }),
    ).toBeFocused()
    await expect(
      page.getByText('Hello World', { exact: true }).filter({ visible: true }),
    ).toBeVisible()
    await expect(page.getByRole('textbox', { name: '연습 이름' })).toHaveValue(
      '보존할 초안',
    )
    await expect(page.getByRole('textbox', { name: '시작 일시' })).toHaveValue(
      '2030-01-01',
    )
    await expect(page.getByRole('textbox', { name: '종료 일시' })).toHaveValue(
      '2030-01-03',
    )
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('heading', {
        name: '연습 만들기',
        exact: true,
      }),
    ).toBeHidden()
  })

  test(`${kind}: browser Back releases dialog scroll locks`, async ({
    page,
  }) => {
    await page.route(apiUrl(`${groupPath}/problem-sets`) + '?**', (route) =>
      route.fulfill({
        json: { items: [], page: 0, size: 20, totalCount: 0, hasNext: false },
      }),
    )
    if (kind === 'create') {
      await page.goto(groupPath)
      await page.getByRole('button', { name: '연습', exact: true }).click()
      await page.getByRole('button', { name: '연습 생성', exact: true }).click()
    } else {
      await page.route(apiUrl(`${groupPath}/practices`), (route) =>
        route.fulfill({
          json: [
            {
              practiceId: 'dialog-practice',
              groupId: 'dialog-group',
              title: '모달 테스트 연습',
              startDate: '2030-01-01T00:00:00',
              endDate: '2030-01-03T23:59:59',
            },
          ],
        }),
      )
      await page.goto(`${groupPath}?tab=practice`)
      await page
        .getByRole('link', { name: '모달 테스트 연습', exact: true })
        .click()
      await page.getByRole('button', { name: '문제 추가', exact: true }).click()
    }
    await openPicker(page)
    await page.goBack()
    await expect(
      page.getByRole('heading', { name: '문제 선택', exact: true }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: '연습', exact: true }),
    ).toBeVisible()
    await expectBodyScrollUnlocked(page)
  })

  test(`${kind}: auth-required navigation restores scrolling on the login page`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 430 })
    await page.route(apiUrl('/problems') + '?**', (route) =>
      route.fulfill({ status: 401, json: { message: 'Unauthorized' } }),
    )
    await page.route(apiUrl('/auth/refresh'), (route) =>
      route.fulfill({ status: 401, json: { message: 'Unauthorized' } }),
    )
    await openForm(page, kind)
    await openPicker(page)
    const picker = page.getByRole('dialog').filter({
      has: page.getByRole('heading', {
        name: kind === 'create' ? '문제 선택' : '문제 추가하기',
        exact: true,
      }),
    })
    await expect(
      picker.getByText('로그인이 필요합니다.', { exact: true }),
    ).toBeVisible()
    await picker.getByRole('link', { name: '로그인', exact: true }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expectBodyScrollUnlocked(page)
    await page.mouse.move(180, 250)
    await page.mouse.wheel(0, 1000)
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0)
  })
}

async function expectBodyScrollUnlocked(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        position: document.body.style.position,
        overflow: document.body.style.overflow,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
      })),
    )
    .toEqual({ position: '', overflow: '', top: '', left: '', right: '' })
}

async function expectPointerReachable(button: Locator) {
  await expect(button).toBeInViewport({ ratio: 1 })
  await expect
    .poll(() =>
      button.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        )
        return hit === element || Boolean(hit && element.contains(hit))
      }),
    )
    .toBe(true)
}

for (const viewport of [
  { width: 390, height: 430 },
  { width: 844, height: 390 },
]) {
  for (const kind of ['create', 'add'] as const) {
    test(`keeps ${kind} actions visible while the form body scrolls at ${String(viewport.width)}x${String(viewport.height)}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport)
      await page.route(
        apiUrl(
          kind === 'create'
            ? `${groupPath}/practices`
            : `${practicePath}/problems`,
        ),
        (route) =>
          route.request().method() === 'POST'
            ? route.fulfill({
                status: 400,
                json: {
                  code: 'INVALID_FIELD',
                  message: '요청 값이 올바르지 않습니다.',
                },
              })
            : route.fallback(),
      )
      await openForm(page, kind)
      await openPicker(page)
      await chooseProblem(page, 'Hello World')
      const submit = page.getByRole('button', {
        name: kind === 'create' ? '생성하기' : '선택한 문제 추가',
        exact: true,
      })
      await expectPointerReachable(submit)
      const body = page.getByTestId(
        kind === 'create'
          ? 'practice-form-scroll-area'
          : 'problem-multi-picker-scroll-area',
      )
      const rect = await body.boundingBox()
      if (!rect) throw new Error('Practice form body is missing')
      await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
      await page.mouse.wheel(0, -1000)
      await expect
        .poll(() => body.evaluate((element) => element.scrollTop))
        .toBe(0)
      await page.mouse.wheel(0, 1000)
      await expect
        .poll(() => body.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0)
      await expectPointerReachable(submit)
      await submit.click()
      await expect(
        page.getByText('요청 값이 올바르지 않습니다.', { exact: true }),
      ).toBeInViewport({ ratio: 1 })
      await expectPointerReachable(submit)
      await page.screenshot({
        path: test.info().outputPath(`short-practice-${kind}.png`),
      })
    })
  }
}
