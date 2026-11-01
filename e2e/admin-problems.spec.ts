import { expect, test, type Page } from '@playwright/test'

const apiBaseUrl = process.env.VITE_API_BASE_URL
if (!apiBaseUrl) throw new Error('VITE_API_BASE_URL is required')
const apiBase = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`
const catalogPath = '/admin/problems'

test.skip(
  process.env.E2E_ENABLE_MSW === 'true',
  'These tests control API responses without MSW.',
)

interface CatalogProblem {
  problemId: string
  provider: string
  externalProblemId: string
  name: string
  url: string | null
  difficulty: string | null
}

const firstProblem: CatalogProblem = {
  problemId: '11111111-1111-4111-8111-111111111111',
  provider: 'BOJ',
  externalProblemId: '1000',
  name: 'A+B',
  url: 'https://www.acmicpc.net/problem/1000',
  difficulty: 'BRONZE_5',
}

function apiUrl(path: string) {
  return new URL(path.replace(/^\/+/, ''), apiBase).href
}

async function mockCatalog(
  page: Page,
  role: 'ADMIN' | 'USER' | 'missing' | 'signed-out' = 'ADMIN',
) {
  const state = {
    userRole: role,
    userStatus: role === 'signed-out' ? 401 : 200,
    rows: [{ ...firstProblem }],
    reads: [] as URL[],
    writes: [] as {
      method: string
      path: string
      body: unknown
      csrf: string | undefined
    }[],
    saveStatus: 200,
    saveErrorBody: null as unknown,
    deleteStatus: 204,
    listStatus: 200,
    waitForSave: Promise.resolve(),
  }
  await page.route(apiUrl('/users/me'), (route) =>
    route.fulfill({
      status: state.userStatus,
      json:
        state.userStatus !== 200
          ? { message: 'Unauthenticated' }
          : {
              id: 'admin-1',
              email: 'admin@example.com',
              nickname: 'catalog-admin',
              ...(state.userRole === 'missing' ? {} : { role: state.userRole }),
            },
    }),
  )
  await page.route(apiUrl('/auth/refresh'), (route) =>
    route.fulfill({ status: 401, json: { message: 'Session expired' } }),
  )
  await page.route(apiUrl('/auth/csrf'), (route) =>
    route.fulfill({
      json: { token: 'catalog-csrf', headerName: 'X-XSRF-TOKEN' },
    }),
  )
  await page.route(`${apiUrl('/problems')}?*`, (route) => {
    const url = new URL(route.request().url())
    state.reads.push(url)
    if (state.listStatus !== 200)
      return route.fulfill({
        status: state.listStatus,
        json: { message: '목록 조회 오류' },
      })
    const keyword = (url.searchParams.get('keyword') ?? '').toLowerCase()
    const provider = url.searchParams.get('provider')
    const rows = state.rows.filter(
      (row) =>
        (!provider || row.provider === provider) &&
        (!keyword ||
          `${row.name} ${row.externalProblemId}`
            .toLowerCase()
            .includes(keyword)),
    )
    const pageIndex = Number(url.searchParams.get('page'))
    const size = Number(url.searchParams.get('size'))
    return route.fulfill({
      json: {
        problems: rows.slice(pageIndex * size, (pageIndex + 1) * size),
        page: pageIndex,
        size,
        totalElements: rows.length,
        totalPages: Math.ceil(rows.length / size),
      },
    })
  })
  const handleWrite = async (
    route: Parameters<Parameters<Page['route']>[1]>[0],
  ) => {
    if (route.request().isNavigationRequest()) return route.fallback()
    const request = route.request()
    const method = request.method()
    const body: unknown = method === 'DELETE' ? null : request.postDataJSON()
    const path = new URL(request.url()).pathname
    state.writes.push({
      method,
      path,
      body,
      csrf: request.headers()['x-xsrf-token'],
    })
    if (method === 'DELETE') {
      if (state.deleteStatus !== 204)
        return route.fulfill({
          status: state.deleteStatus,
          json: { message: `삭제 오류 ${String(state.deleteStatus)}` },
        })
      state.rows = state.rows.filter((row) => !path.endsWith(row.problemId))
      return route.fulfill({ status: 204 })
    }
    await state.waitForSave
    if (state.saveStatus >= 400)
      return route.fulfill({
        status: state.saveStatus,
        json: state.saveErrorBody ?? {
          message: `저장 오류 ${String(state.saveStatus)}`,
        },
      })
    const problem = {
      ...(body as Omit<CatalogProblem, 'problemId'>),
      problemId:
        method === 'POST'
          ? '22222222-2222-4222-8222-222222222222'
          : path.split('/').at(-1),
    } as CatalogProblem
    state.rows =
      method === 'POST'
        ? [problem, ...state.rows]
        : state.rows.map((row) =>
            row.problemId === problem.problemId ? problem : row,
          )
    return route.fulfill({
      status: method === 'POST' ? 201 : 200,
      json: problem,
    })
  }
  await page.route(apiUrl('/admin/problems'), handleWrite)
  await page.route(`${apiUrl('/admin/problems')}/**`, handleWrite)
  return state
}

async function fillNewProblem(page: Page) {
  await page.getByRole('button', { name: '문제 등록', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '문제 등록' })
  await dialog.getByRole('combobox', { name: /플랫폼/ }).click()
  await page.getByRole('option', { name: 'LEETCODE', exact: true }).click()
  await dialog.getByRole('textbox', { name: /문제 식별자/ }).fill('two-sum')
  await dialog.getByRole('textbox', { name: /제목/ }).fill('Two Sum')
  return dialog
}

async function refocusAfterUserQueryExpires(page: Page) {
  const now = await page.evaluate(() => Date.now())
  await page.clock.setSystemTime(now + 61_000)
  const response = page.waitForResponse(apiUrl('/users/me'))
  await page.evaluate(() => {
    window.dispatchEvent(new Event('visibilitychange'))
  })
  await (await response).finished()
  await page.clock.runFor(50)
}

for (const mode of ['create', 'edit'] as const) {
  test(`preserves the ${mode} draft across a failed user refetch and recovery`, async ({
    page,
  }) => {
    await page.clock.install()
    const state = await mockCatalog(page)
    await page.goto(catalogPath)
    if (mode === 'create') {
      await fillNewProblem(page)
    } else {
      await page.getByRole('button', { name: 'A+B 수정', exact: true }).click()
    }
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox', { name: /제목/ }).fill('보존할 초안')
    await dialog
      .getByRole('textbox', { name: /원문 URL/ })
      .fill('https://example.com/draft')

    state.userStatus = 500
    await refocusAfterUserQueryExpires(page)
    await expect(dialog.getByRole('textbox', { name: /제목/ })).toHaveValue(
      '보존할 초안',
    )
    await expect(dialog.getByRole('textbox', { name: /원문 URL/ })).toHaveValue(
      'https://example.com/draft',
    )
    expect(state.writes).toHaveLength(0)

    state.userStatus = 200
    await refocusAfterUserQueryExpires(page)
    await expect(dialog.getByRole('textbox', { name: /제목/ })).toHaveValue(
      '보존할 초안',
    )
    await dialog
      .getByRole('button', {
        name: mode === 'create' ? '문제 등록' : '변경사항 저장',
        exact: true,
      })
      .click()
    await expect(dialog).toHaveCount(0)
    expect(state.writes).toHaveLength(1)
    expect(state.writes[0]?.body).toMatchObject({
      name: '보존할 초안',
      url: 'https://example.com/draft',
    })
  })
}

for (const reason of [
  'role-revoked',
  'forbidden',
  'session-expired',
] as const) {
  test(`blocks catalog access after ${reason} even with a cached admin user`, async ({
    page,
  }) => {
    await page.clock.install()
    const state = await mockCatalog(page)
    await page.goto(catalogPath)
    await fillNewProblem(page)

    if (reason === 'role-revoked') state.userRole = 'USER'
    if (reason === 'forbidden') state.userStatus = 403
    if (reason === 'session-expired') state.userStatus = 401
    await refocusAfterUserQueryExpires(page)

    await expect(page.getByRole('dialog')).toHaveCount(0)
    if (reason === 'role-revoked') {
      await expect(
        page.getByRole('heading', { name: '관리자 권한이 필요합니다' }),
      ).toBeVisible()
    } else if (reason === 'session-expired') {
      await expect(
        page.getByRole('heading', { name: '로그인 후 이용해 주세요' }),
      ).toBeVisible()
    } else {
      await expect(
        page.getByText('사용자 정보를 확인하지 못했습니다.', { exact: true }),
      ).toBeVisible()
    }
    expect(state.writes).toHaveLength(0)
  })
}

for (const role of ['USER', 'missing'] as const) {
  test(`blocks ${role} before fetching catalog data`, async ({ page }) => {
    const state = await mockCatalog(page, role)
    await page.goto(catalogPath)
    await expect(
      page.getByRole('heading', { name: '관리자 권한이 필요합니다' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: '문제 관리', exact: true }),
    ).toHaveCount(0)
    expect(state.reads).toHaveLength(0)
    expect(state.writes).toHaveLength(0)
  })
}

test('offers sign-in when the session cannot be refreshed', async ({
  page,
}) => {
  const state = await mockCatalog(page, 'signed-out')
  await page.goto(catalogPath)
  await expect(
    page.getByRole('heading', { name: '로그인 후 이용해 주세요' }),
  ).toBeVisible()
  expect(state.reads).toHaveLength(0)
})

for (const { provider, label, value } of [
  { provider: 'BOJ', label: 'Gold III', value: 'GOLD_3' },
  { provider: 'JUNGOL', label: 'Ruby I', value: 'RUBY_1' },
  { provider: 'SWEA', label: 'D8', value: 'D8' },
  { provider: 'PROGRAMMERS', label: 'Lv. 0', value: 'LEVEL_0' },
  { provider: 'PROGRAMMERS', label: 'Lv. 5', value: 'LEVEL_5' },
  { provider: 'LEETCODE', label: 'Medium', value: 'MEDIUM' },
  { provider: 'BOJ', label: 'Unrated', value: 'UNRATED' },
  { provider: 'BOJ', label: 'Not ratable', value: 'NOT_RATABLE' },
  { provider: 'BOJ', label: 'Sprout I+', value: 'SPROUT_1_PLUS' },
]) {
  test(`creates ${provider} problems with selected difficulty ${label}`, async ({
    page,
  }) => {
    const state = await mockCatalog(page)
    await page.goto(catalogPath)
    await page.getByRole('button', { name: '문제 등록', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '문제 등록' })
    const difficulty = dialog.getByLabel(/^난이도.*선택 사항$/)
    await expect(difficulty).toBeDisabled()
    await expect(dialog.getByRole('textbox', { name: /난이도/ })).toHaveCount(0)
    await dialog.getByRole('combobox', { name: /플랫폼/ }).click()
    await page.getByRole('option', { name: provider, exact: true }).click()
    await expect(difficulty).toBeEnabled()
    await difficulty.click()
    await page.getByRole('option', { name: label, exact: true }).click()
    await expect(difficulty).toContainText(label)
    await dialog.getByRole('textbox', { name: /문제 식별자/ }).fill('example')
    await dialog.getByRole('textbox', { name: /제목/ }).fill('난이도 선택 확인')
    await dialog.getByRole('button', { name: '문제 등록', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    expect(state.writes[0]?.body).toMatchObject({ provider, difficulty: value })
  })
}

test('resets difficulty only when the platform changes and drops the old options', async ({
  page,
}) => {
  const state = await mockCatalog(page)
  await page.goto(catalogPath)
  await page.getByRole('button', { name: 'A+B 수정', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '문제 수정' })
  const provider = dialog.getByRole('combobox', { name: /플랫폼/ })
  const difficulty = dialog.getByLabel(/^난이도.*선택 사항$/)
  await expect(difficulty).toContainText('Bronze V')
  await provider.click()
  await page.getByRole('option', { name: 'LEETCODE', exact: true }).click()
  await expect(difficulty).toContainText('미지정')
  await difficulty.click()
  await expect(page.getByRole('option', { name: /Bronze/ })).toHaveCount(0)
  await page.getByRole('option', { name: 'Medium', exact: true }).click()
  await provider.click()
  await page.getByRole('option', { name: 'LEETCODE', exact: true }).click()
  await expect(difficulty).toContainText('Medium')
  await provider.click()
  await page.getByRole('option', { name: 'SWEA', exact: true }).click()
  await expect(difficulty).toContainText('미지정')
  await dialog.getByRole('button', { name: '변경사항 저장' }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0]?.body).toMatchObject({
    provider: 'SWEA',
    difficulty: null,
  })
})

test('preserves an unknown stored difficulty exactly and allows replacing it', async ({
  page,
}) => {
  const state = await mockCatalog(page)
  const original = '  custom-level / 2  '
  state.rows[0] = { ...firstProblem, difficulty: original }
  await page.goto(catalogPath)
  await page.getByRole('button', { name: 'A+B 수정', exact: true }).click()
  let dialog = page.getByRole('dialog', { name: '문제 수정' })
  await expect(dialog.getByLabel(/^난이도.*선택 사항$/)).toContainText(
    '기존 값:',
  )
  await dialog.getByRole('textbox', { name: /제목/ }).fill('제목만 수정')
  await dialog.getByRole('button', { name: '변경사항 저장' }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0]?.body).toMatchObject({ difficulty: original })
  await page
    .getByRole('button', { name: '제목만 수정 수정', exact: true })
    .click()
  dialog = page.getByRole('dialog', { name: '문제 수정' })
  await dialog.getByLabel(/^난이도.*선택 사항$/).click()
  await page.getByRole('option', { name: 'Silver II', exact: true }).click()
  await dialog.getByRole('button', { name: '변경사항 저장' }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[1]?.body).toMatchObject({ difficulty: 'SILVER_2' })
})

test('clears an existing difficulty by choosing not specified', async ({
  page,
}) => {
  const state = await mockCatalog(page)
  await page.goto(catalogPath)
  await page.getByRole('button', { name: 'A+B 수정', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '문제 수정' })
  await dialog.getByLabel(/^난이도.*선택 사항$/).click()
  await page.getByRole('option', { name: '미지정', exact: true }).click()
  await dialog.getByRole('button', { name: '변경사항 저장' }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0]?.body).toMatchObject({ difficulty: null })
})

test.describe('difficulty selection on a touch screen', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })

  test('searches tiers, returns to the form and saves the selected code', async ({
    page,
  }) => {
    const state = await mockCatalog(page)
    await page.goto(catalogPath)
    await page.getByRole('button', { name: 'A+B 수정', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '문제 수정' })
    await dialog.getByLabel(/^난이도.*선택 사항$/).click()
    const search = page.getByPlaceholder('난이도 검색')
    await search.fill('Ruby')
    await page.getByRole('option', { name: 'Ruby V', exact: true }).click()
    await expect(search).not.toBeVisible()
    await expect(dialog.getByLabel(/^난이도.*선택 사항$/)).toContainText(
      'Ruby V',
    )
    await expect(dialog.getByLabel(/^난이도.*선택 사항$/)).toBeFocused()
    await expect(dialog.getByRole('textbox', { name: /제목/ })).toHaveValue(
      'A+B',
    )
    await dialog.getByRole('button', { name: '변경사항 저장' }).click()
    await expect(dialog).toHaveCount(0)
    expect(state.writes[0]?.body).toMatchObject({ difficulty: 'RUBY_5' })
  })
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`uses provider difficulty colors in the list, options and selection in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    const state = await mockCatalog(page)
    const samples = [
      {
        provider: 'BOJ',
        difficulty: 'BRONZE_5',
        background: 'rgb(172, 86, 0)',
        text: 'rgb(255, 255, 255)',
      },
      {
        provider: 'BOJ',
        difficulty: 'GOLD_3',
        background: 'rgb(236, 154, 0)',
        text: 'rgb(17, 17, 17)',
      },
      {
        provider: 'SWEA',
        difficulty: 'D3',
        background: 'rgb(107, 203, 119)',
        text: 'rgb(17, 17, 17)',
      },
      {
        provider: 'SWEA',
        difficulty: 'D8',
        background: 'rgb(255, 107, 107)',
        text: 'rgb(17, 17, 17)',
      },
    ]
    state.rows = samples.map((sample, index) => ({
      ...firstProblem,
      problemId: `color-${String(index)}`,
      provider: sample.provider,
      difficulty: sample.difficulty,
      name: `색상 확인 ${String(index)}`,
    }))
    await page.goto(catalogPath)
    for (const [index, sample] of samples.entries()) {
      const chip = page
        .getByRole('row')
        .filter({ hasText: `색상 확인 ${String(index)}` })
        .locator('.astryx-token')
      await expect(chip).toHaveCSS('background-color', sample.background)
      await expect(chip).toHaveCSS('color', sample.text)
    }
    await page.getByRole('button', { name: '문제 등록', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '문제 등록' })
    await dialog.getByRole('combobox', { name: /플랫폼/ }).click()
    await page.getByRole('option', { name: 'SWEA', exact: true }).click()
    await dialog.getByLabel(/^난이도.*선택 사항$/).click()
    const option = page.getByRole('option', { name: 'D3', exact: true })
    await expect(option.locator('.astryx-token')).toHaveCSS(
      'background-color',
      'rgb(107, 203, 119)',
    )
    await option.click()
    await expect(
      dialog.getByLabel(/^난이도.*선택 사항$/).locator('.astryx-token'),
    ).toHaveCSS('background-color', 'rgb(107, 203, 119)')
  })
}

test('creates, fully updates and deletes with CSRF and refreshed lists', async ({
  page,
}) => {
  const state = await mockCatalog(page)
  await page.goto(catalogPath)
  await expect(
    page.getByRole('link', { name: '문제 관리', exact: true }),
  ).toBeVisible()
  const dialog = await fillNewProblem(page)
  await expect(
    dialog.getByRole('textbox', { name: /문제 식별자.*필수/ }),
  ).toHaveAttribute('aria-required', 'true')
  await expect(
    dialog.getByRole('combobox', { name: /플랫폼.*필수/ }),
  ).toHaveAttribute('aria-required', 'true')
  await expect(
    dialog.getByRole('textbox', { name: /원문 URL.*선택/ }),
  ).toBeVisible()
  await expect(dialog.getByText(/Required|Optional/)).toHaveCount(0)
  await dialog.getByRole('button', { name: '문제 등록', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(
    page
      .getByRole('region', { name: '알림', exact: true })
      .getByText('문제를 등록했습니다.', { exact: true }),
  ).toBeVisible()
  expect(state.writes[0]).toMatchObject({
    method: 'POST',
    csrf: 'catalog-csrf',
    body: {
      provider: 'LEETCODE',
      externalProblemId: 'two-sum',
      name: 'Two Sum',
      url: null,
      difficulty: null,
    },
  })

  await page.getByRole('button', { name: 'Two Sum 수정', exact: true }).click()
  const editor = page.getByRole('dialog', { name: '문제 수정' })
  await expect(
    editor.getByRole('textbox', { name: /문제 식별자/ }),
  ).toHaveValue('two-sum')
  await editor.getByRole('textbox', { name: /제목/ }).fill('Two Sum updated')
  await editor.getByRole('button', { name: '변경사항 저장' }).click()
  await expect(editor).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Two Sum updated 수정' }),
  ).toBeVisible()
  expect(state.writes[1]).toMatchObject({
    method: 'PUT',
    path: '/admin/problems/22222222-2222-4222-8222-222222222222',
    csrf: 'catalog-csrf',
    body: {
      provider: 'LEETCODE',
      externalProblemId: 'two-sum',
      name: 'Two Sum updated',
      url: null,
      difficulty: null,
    },
  })

  await page.getByRole('button', { name: 'Two Sum updated 삭제' }).click()
  const confirmation = page.getByRole('alertdialog')
  await expect(
    confirmation.getByText('Two Sum updated', { exact: true }),
  ).toBeVisible()
  await expect(confirmation.getByRole('button', { name: '취소' })).toBeFocused()
  await confirmation
    .getByRole('button', { name: '문제 삭제', exact: true })
    .click()
  await expect(confirmation).toHaveCount(0)
  await expect(
    page
      .getByRole('region', { name: '알림', exact: true })
      .getByText('문제를 삭제했습니다.', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Two Sum updated 삭제' }),
  ).toHaveCount(0)
  expect(state.writes[2]).toMatchObject({
    method: 'DELETE',
    csrf: 'catalog-csrf',
  })
})

for (const status of [400, 403, 404, 409, 500]) {
  test(`retains form input and shows server save error ${String(status)}`, async ({
    page,
  }) => {
    const state = await mockCatalog(page)
    state.saveStatus = status
    await page.goto(catalogPath)
    const dialog = await fillNewProblem(page)
    await dialog.getByRole('button', { name: '문제 등록', exact: true }).click()
    await expect(
      dialog.getByText(`저장 오류 ${String(status)}`, { exact: true }),
    ).toBeVisible()
    await expect(
      dialog.getByRole('textbox', { name: /문제 식별자/ }),
    ).toHaveValue('two-sum')
    await expect(dialog.getByRole('textbox', { name: /제목/ })).toHaveValue(
      'Two Sum',
    )
    await expect(
      dialog.getByRole('button', { name: '문제 등록', exact: true }),
    ).toBeEnabled()
    expect(state.writes).toHaveLength(1)
    expect(state.rows).toHaveLength(1)
  })
}

for (const status of [403, 404, 500]) {
  test(`keeps the confirmation and list after delete error ${String(status)}`, async ({
    page,
  }) => {
    const state = await mockCatalog(page)
    state.deleteStatus = status
    await page.goto(catalogPath)
    await page.getByRole('button', { name: 'A+B 삭제', exact: true }).click()
    const confirmation = page.getByRole('alertdialog')
    await confirmation
      .getByRole('button', { name: '문제 삭제', exact: true })
      .click()
    await expect(
      confirmation.getByText(`삭제 오류 ${String(status)}`, { exact: true }),
    ).toBeVisible()
    expect(state.rows).toHaveLength(1)
    await confirmation.getByRole('button', { name: '취소' }).click()
    await expect(
      page.getByRole('button', { name: 'A+B 수정', exact: true }),
    ).toBeVisible()
  })
}

test('keeps the server validation message and translates field reason codes', async ({
  page,
}) => {
  const state = await mockCatalog(page)
  state.saveStatus = 400
  state.saveErrorBody = {
    code: 'INVALID_FIELD',
    message: '요청 값이 올바르지 않습니다.',
    fieldErrors: [
      { field: 'name', reason: 'INVALID_LENGTH' },
      { field: 'difficulty', reason: 'NEW_REASON' },
    ],
  }
  await page.goto(catalogPath)
  const dialog = await fillNewProblem(page)
  await dialog.getByRole('button', { name: '문제 등록', exact: true }).click()

  await expect(
    dialog.getByText(
      '요청 값이 올바르지 않습니다. (문제 이름: 길이 오류, 난이도: 값 오류)',
      { exact: true },
    ),
  ).toBeVisible()
  await expect(dialog.getByText(/INVALID_LENGTH|NEW_REASON/)).toHaveCount(0)
  await expect(dialog.getByRole('textbox', { name: /제목/ })).toHaveValue(
    'Two Sum',
  )
})

test('shows a readable character limit before sending the request', async ({
  page,
}) => {
  const state = await mockCatalog(page)
  await page.goto(catalogPath)
  const dialog = await fillNewProblem(page)
  await dialog.getByRole('textbox', { name: /제목/ }).fill('가'.repeat(101))
  await dialog.getByRole('button', { name: '문제 등록', exact: true }).click()

  await expect(
    dialog.getByText('100자 이내로 입력해 주세요.', { exact: true }),
  ).toBeVisible()
  expect(state.writes).toHaveLength(0)
})

for (const operation of ['save', 'delete', 'list'] as const) {
  test(`uses a readable fallback for a failed ${operation} connection`, async ({
    page,
  }) => {
    await mockCatalog(page)
    if (operation === 'list') {
      await page.route(`${apiUrl('/problems')}?*`, (route) =>
        route.abort('failed'),
      )
      await page.goto(catalogPath)
      await expect(
        page.getByText('문제 목록을 불러오지 못했습니다.', { exact: true }),
      ).toBeVisible()
      return
    }
    await page.goto(catalogPath)
    if (operation === 'save') {
      const dialog = await fillNewProblem(page)
      await page.route(apiUrl('/admin/problems'), (route) =>
        route.abort('failed'),
      )
      await dialog
        .getByRole('button', { name: '문제 등록', exact: true })
        .click()
      await expect(
        dialog.getByText(
          '문제를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
          { exact: true },
        ),
      ).toBeVisible()
      await expect(dialog.getByRole('textbox', { name: /제목/ })).toHaveValue(
        'Two Sum',
      )
    } else {
      await page.route(`${apiUrl('/admin/problems')}/**`, (route) =>
        route.abort('failed'),
      )
      await page.getByRole('button', { name: 'A+B 삭제', exact: true }).click()
      const confirmation = page.getByRole('alertdialog')
      await confirmation
        .getByRole('button', { name: '문제 삭제', exact: true })
        .click()
      await expect(
        confirmation.getByText(
          '문제를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
          { exact: true },
        ),
      ).toBeVisible()
    }
    await expect(
      page.getByText('Failed to fetch', { exact: true }),
    ).toHaveCount(0)
  })
}

test('validates required fields, resets canceled drafts and prevents duplicate submission', async ({
  page,
}) => {
  const state = await mockCatalog(page)
  await page.goto(catalogPath)
  await page.getByRole('button', { name: '문제 등록', exact: true }).click()
  let dialog = page.getByRole('dialog', { name: '문제 등록' })
  await dialog.getByRole('button', { name: '문제 등록', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: /제목/ })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  expect(state.writes).toHaveLength(0)
  await dialog.getByRole('textbox', { name: /제목/ }).fill('취소할 초안')
  await dialog.getByRole('button', { name: '취소' }).click()
  await page.getByRole('button', { name: '문제 등록', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: /제목/ })).toHaveValue('')
  await expect(
    dialog.getByRole('textbox', { name: /문제 식별자/ }),
  ).toHaveValue('')
  await dialog.getByRole('button', { name: '취소' }).click()
  dialog = await fillNewProblem(page)
  await expect(dialog.getByRole('textbox', { name: /제목/ })).toHaveValue(
    'Two Sum',
  )
  let finishSave!: () => void
  state.waitForSave = new Promise<void>((resolve) => {
    finishSave = resolve
  })
  await dialog.getByRole('button', { name: '문제 등록', exact: true }).click()
  await expect.poll(() => state.writes.length).toBe(1)
  await expect(
    dialog.getByRole('button', { name: '문제 등록', exact: true }),
  ).toBeDisabled()
  await dialog.locator('form').evaluate((form) => {
    if (form instanceof HTMLFormElement) form.requestSubmit()
  })
  expect(state.writes).toHaveLength(1)
  finishSave()
  await expect(dialog).toHaveCount(0)
})

test('applies search and provider filters on the server and resets pagination', async ({
  page,
}) => {
  const state = await mockCatalog(page)
  state.rows = Array.from({ length: 21 }, (_, index) => ({
    ...firstProblem,
    problemId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    externalProblemId: String(1000 + index),
    name: `문제 ${String(index)}`,
    provider: index === 20 ? 'LEETCODE' : 'BOJ',
  }))
  await page.goto(catalogPath)
  const pages = page.getByRole('navigation', { name: '문제 목록 페이지' })
  await pages.getByRole('button').last().click()
  await expect(
    page.getByRole('button', { name: '문제 20 수정', exact: true }),
  ).toBeVisible()
  await page.getByRole('combobox', { name: '플랫폼', exact: true }).click()
  await page.getByRole('option', { name: 'LEETCODE', exact: true }).click()
  await expect
    .poll(() => state.reads.at(-1)?.searchParams.get('provider'))
    .toBe('LEETCODE')
  expect(state.reads.at(-1)?.searchParams.get('page')).toBe('0')
  await page
    .getByRole('textbox', { name: '문제 검색', exact: true })
    .fill('  문제 20  ')
  await expect
    .poll(() => state.reads.at(-1)?.searchParams.get('keyword'))
    .toBe('문제 20')
  await expect(
    page.getByRole('button', { name: '문제 20 수정', exact: true }),
  ).toBeVisible()
  await expect(pages).toHaveCount(0)
})

test('recovers from list errors and shows an empty catalog', async ({
  page,
}) => {
  const state = await mockCatalog(page)
  state.listStatus = 500
  await page.goto(catalogPath)
  await expect(page.getByText('목록 조회 오류', { exact: true })).toBeVisible()
  state.listStatus = 200
  state.rows = []
  await page.getByRole('button', { name: '다시 시도', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: '등록된 문제가 없습니다' }),
  ).toBeVisible()
  await page
    .getByRole('textbox', { name: '문제 검색', exact: true })
    .fill('없음')
  await expect(
    page.getByRole('heading', { name: '검색 결과가 없습니다' }),
  ).toBeVisible()
})

test('fits the mobile list and dialogs in a short dark viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await mockCatalog(page)
  await page.goto(catalogPath)
  await expect(
    page.getByRole('button', { name: 'A+B 수정', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('table')).toHaveCount(0)
  const dialog = await fillNewProblem(page)
  await expect(
    dialog.getByRole('button', { name: '문제 등록', exact: true }),
  ).toBeInViewport()
  const sizes = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    }
  })
  expect(sizes.left).toBeGreaterThanOrEqual(0)
  expect(sizes.right).toBeLessThanOrEqual(sizes.viewportWidth)
  expect(sizes.top).toBeGreaterThanOrEqual(0)
  expect(sizes.bottom).toBeLessThanOrEqual(sizes.viewportHeight)
  await dialog.getByRole('button', { name: '취소' }).click()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})
