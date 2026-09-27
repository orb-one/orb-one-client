import { expect, test, type Page, type Route } from '@playwright/test'

import { expectPageBackLinkAboveHeading } from './page-back-link-assertions'

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

  await expect(page.getByText('BOJ 1000 · BRONZE_5')).toBeVisible()
  await page.getByRole('link', { name: /A\+B/ }).click()

  await expect(
    page.getByRole('heading', {
      name: 'A+B',
      level: 1,
    }),
  ).toBeVisible()
  await expectPageBackLinkAboveHeading(page, {
    label: '풀이 목록으로 돌아가기',
    href: '/solutions',
    headingName: 'A+B',
  })
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
  await expectPageBackLinkAboveHeading(page, {
    label: '풀이 목록으로 돌아가기',
    href: '/solutions',
    headingName: 'A+B',
  })
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

test('shows an independently scrollable live Markdown preview beside the editor on desktop and tabs on mobile', async ({
  page,
}) => {
  await mockCurrentUser(page)
  await mockSolutionApi(page)

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/solutions/new')

  await expectPageBackLinkAboveHeading(page, {
    label: '풀이 목록으로 돌아가기',
    href: '/solutions',
    headingName: '새 풀이 작성',
  })

  const editor = page.getByRole('textbox', { name: /풀이 설명/ })
  const source = page.getByRole('region', { name: '편집' })
  const preview = page.getByRole('region', { name: '미리보기' })
  const previewScroll = page.getByTestId('solution-markdown-preview-scroll')

  await expect(
    page.getByText('편집', { exact: true }).filter({ visible: true }),
  ).toHaveCount(0)
  await expect(
    page.getByText('미리보기', { exact: true }).filter({ visible: true }),
  ).toHaveCount(1)
  await expect(preview.getByText('미리볼 내용이 없습니다.')).toBeVisible()
  await editor.fill('# 실시간 미리보기')
  await expect(
    preview.getByRole('heading', { name: '실시간 미리보기', level: 3 }),
  ).toBeVisible()

  await editor.fill('[풀이 목록](/solutions)')
  const [previewLinkPage] = await Promise.all([
    page.waitForEvent('popup'),
    preview.getByRole('link', { name: '풀이 목록' }).click(),
  ])
  await expect(previewLinkPage).toHaveURL(/\/solutions$/)
  await expect(page).toHaveURL(/\/solutions\/new$/)
  await expect(editor).toHaveValue('[풀이 목록](/solutions)')
  await previewLinkPage.close()

  const sourceBounds = await source.boundingBox()
  const editorBounds = await editor.boundingBox()
  const previewBounds = await preview.boundingBox()
  if (!sourceBounds || !editorBounds || !previewBounds) {
    throw new Error('Markdown editor and preview must have visible bounds')
  }
  expect(editorBounds.width).toBeGreaterThan(400)
  expect(previewBounds.width).toBeGreaterThan(400)
  expect(editorBounds.x + editorBounds.width).toBeLessThan(previewBounds.x)
  expect(sourceBounds.height).toBe(previewBounds.height)

  const longMarkdown = Array.from({ length: 40 }, (_, index) => {
    const step = String(index + 1)
    return `## 단계 ${step}\n\n- 설명 ${step}`
  }).join('\n\n')
  await editor.fill(longMarkdown)
  await previewScroll.evaluate((element) => {
    element.scrollTop = 160
  })
  const previewScrollTop = await previewScroll.evaluate(
    (element) => element.scrollTop,
  )
  expect(previewScrollTop).toBeGreaterThan(0)
  await editor.evaluate((element) => {
    element.scrollTop = element.scrollHeight / 2
  })
  await expect
    .poll(() => previewScroll.evaluate((element) => element.scrollTop))
    .toBe(previewScrollTop)

  await editor.fill('# 변경된 설명')
  await expect(
    preview.getByRole('heading', { name: '변경된 설명', level: 3 }),
  ).toBeVisible()

  await page.setViewportSize({ width: 320, height: 667 })
  await expectPageBackLinkAboveHeading(page, {
    label: '풀이 목록으로 돌아가기',
    href: '/solutions',
    headingName: '새 풀이 작성',
  })
  await expect(editor).toBeVisible()
  await expect(preview).toBeHidden()
  await expect(page.getByTestId('solution-description')).toHaveCount(0)
  const editTab = page.getByRole('button', { name: '편집' })
  const previewTab = page.getByRole('button', { name: '미리보기' })
  await editTab.focus()
  await page.keyboard.press('ArrowRight')
  await expect(previewTab).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(
    preview.getByRole('heading', { name: '변경된 설명', level: 3 }),
  ).toBeVisible()
  await editTab.click()
  await expect(editor).toHaveValue('# 변경된 설명')

  const longCodeLine = 'x'.repeat(240)
  const markdownWithLongCode = [
    '# 긴 코드',
    '',
    '```java',
    `String value = "${longCodeLine}";`,
    '```',
  ].join('\n')
  await editor.fill(markdownWithLongCode)
  await previewTab.click()
  await expect(
    preview.getByRole('textbox', { name: 'java code' }),
  ).toContainText(longCodeLine)
  const codeScroller = preview.locator('.solution-code-mirror .cm-scroller')
  await expect
    .poll(() =>
      codeScroller.evaluate((element) =>
        element.scrollWidth > element.clientWidth ? 1 : 0,
      ),
    )
    .toBe(1)
  await codeScroller.evaluate((element) => {
    element.scrollLeft = element.scrollWidth
  })
  expect(
    await codeScroller.evaluate((element) => element.scrollLeft),
  ).toBeGreaterThan(0)
  await expect
    .poll(() =>
      page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ clientWidth: 320, scrollWidth: 320 })
  await editTab.click()
  await expect(editor).toHaveValue(markdownWithLongCode)
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
  const problemSearchInput = page.getByRole('textbox', { name: '문제 검색' })
  const problemPickerPagination = page.getByText('Page 1 of 2', {
    exact: true,
  })
  const problemScrollArea = page.getByTestId('problem-picker-list-scroll-area')

  await page.setViewportSize({ width: 320, height: 320 })
  await problemScrollArea.scrollIntoViewIfNeeded()
  await expect(problemScrollArea).toBeInViewport()
  await expect
    .poll(() =>
      problemScrollArea.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    )
    .toBeGreaterThanOrEqual(128)
  await page.setViewportSize({ width: 320, height: 667 })

  await page.getByRole('button', { name: 'Go to next page' }).click()
  await expect(
    page
      .getByRole('navigation', { name: '문제 목록 페이지' })
      .getByText('Page 2 of 2', { exact: true }),
  ).toBeVisible()
  await problemSearchInput.fill('1009')
  await expect(page.getByRole('button', { name: /E2E 문제 9/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /A\+B/ })).toHaveCount(0)
  await problemSearchInput.fill('')
  await expect(page.getByRole('button', { name: /A\+B/ })).toBeVisible()
  await expect(problemPickerPagination).toBeVisible()

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

  const descriptionMarkdown = '# E2E 신규 풀이 설명\n\n- 두 수를 더한다.'

  await page
    .getByRole('textbox', { name: /풀이 설명/ })
    .fill(descriptionMarkdown)
  await page.getByRole('button', { name: '미리보기' }).click()
  await expect(
    page.getByRole('heading', { name: 'E2E 신규 풀이 설명', level: 3 }),
  ).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ clientWidth: 320, scrollWidth: 320 })
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
    description: descriptionMarkdown,
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
  await expect(
    page.getByRole('heading', { name: 'E2E 신규 풀이 설명', level: 3 }),
  ).toBeVisible()
  await expect(page.getByText('12,345 KB')).toBeVisible()
  await expect(page.getByText('67 ms')).toBeVisible()
})

test('edits fields and preserves an author solution language alias', async ({
  page,
}) => {
  const editableSolution = { ...seededSolution, language: 'PyPy3' }
  await mockCurrentUser(page)
  const solutionApi = await mockSolutionApi(page, editableSolution)

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`/solutions/${editableSolution.solutionId}`)
  await page.getByRole('link', { name: '풀이 수정' }).click()
  await page.waitForURL(
    (url) => url.pathname === `/solutions/${editableSolution.solutionId}/edit`,
  )

  await expectPageBackLinkAboveHeading(page, {
    label: '풀이 상세로 돌아가기',
    href: `/solutions/${editableSolution.solutionId}`,
    headingName: '풀이 수정',
  })

  const description = page.getByRole('textbox', { name: /풀이 설명/ })

  await expect(
    page.getByRole('combobox', { name: '프로그래밍 언어' }),
  ).toHaveText('PyPy3')
  const preview = page.getByRole('region', { name: '미리보기' })
  await expect(description).toHaveValue(editableSolution.description ?? '')
  await expect(
    preview.getByRole('heading', { name: '접근 방법', level: 3 }),
  ).toBeVisible()
  const descriptionBounds = await description.boundingBox()
  const previewBounds = await preview.boundingBox()
  if (!descriptionBounds || !previewBounds) {
    throw new Error('Edit Markdown editor and preview must have visible bounds')
  }
  expect(descriptionBounds.x + descriptionBounds.width).toBeLessThan(
    previewBounds.x,
  )

  await page.setViewportSize({ width: 320, height: 667 })
  await expectPageBackLinkAboveHeading(page, {
    label: '풀이 상세로 돌아가기',
    href: `/solutions/${editableSolution.solutionId}`,
    headingName: '풀이 수정',
  })
  const descriptionMarkdown = '# 수정된 풀이 설명\n\n- 단계 확인'
  await description.fill(descriptionMarkdown)
  await page.getByRole('button', { name: '미리보기' }).click()
  await expect(
    preview.getByRole('heading', { name: '수정된 풀이 설명', level: 3 }),
  ).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ clientWidth: 320, scrollWidth: 320 })
  await page.getByRole('button', { name: '편집' }).click()
  await expect(description).toHaveValue(descriptionMarkdown)
  await expect(page.getByRole('checkbox', { name: /임시 저장/ })).toHaveCount(0)
  await page
    .getByRole('spinbutton', { name: /메모리 사용량/ })
    .fill('-2147483648')
  await page.getByRole('spinbutton', { name: /실행 시간/ }).fill('2147483647')
  await page.getByRole('button', { name: '변경사항 저장' }).click()

  await page.waitForURL(
    (url) => url.pathname === `/solutions/${editableSolution.solutionId}`,
  )
  expect(solutionApi.lastUpdateRequest()).toEqual({
    language: 'PyPy3',
    code: editableSolution.code,
    description: descriptionMarkdown,
    isSolved: true,
    isDraft: false,
    memoryUsage: -2_147_483_648,
    timeElapsed: 2_147_483_647,
  })
  await expect(
    page.getByRole('heading', { name: '수정된 풀이 설명', level: 3 }),
  ).toBeVisible()
})

test('deletes an authored solution and restores it from the undo toast', async ({
  page,
}) => {
  await mockCurrentUser(page)
  await mockSolutionApi(page)

  await page.goto(`/solutions/${seededSolution.solutionId}`)
  await page.getByRole('button', { name: '풀이 삭제' }).click()

  const dialog = page.getByRole('alertdialog', {
    name: '풀이를 삭제할까요?',
  })
  await expect(dialog).toContainText('실행 취소로 복구할 수 있습니다.')

  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        `/solutions/${seededSolution.solutionId}` &&
      response.request().method() === 'DELETE',
  )

  await dialog.getByRole('button', { name: '풀이 삭제' }).click()

  expect((await deleteResponsePromise).status()).toBe(204)
  await page.waitForURL((url) => url.pathname === '/solutions')
  await expect(page.getByText('풀이를 삭제했습니다.')).toBeVisible()
  await expect(page.getByRole('link', { name: /A\+B/ })).toHaveCount(0)

  const restoreResponsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        `/solutions/${seededSolution.solutionId}/restore` &&
      response.request().method() === 'POST',
  )

  await page.getByRole('button', { name: '실행 취소' }).click()

  expect((await restoreResponsePromise).status()).toBe(204)
  await expect(page.getByText('풀이를 복구했습니다.')).toBeVisible()
  await expect(page.getByRole('link', { name: /A\+B/ })).toBeVisible()
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
  let isSeededSolutionDeleted = false

  await page.route(apiUrl('/auth/csrf'), async (route) => {
    await fulfillJson(route, {
      token: 'e2e-csrf-token',
      headerName: 'X-XSRF-TOKEN',
    })
  })

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

    const requestUrl = new URL(route.request().url())
    const keyword = requestUrl.searchParams.get('keyword')?.trim().toLowerCase()
    const page = Number(requestUrl.searchParams.get('page') ?? 0)
    const size = Number(requestUrl.searchParams.get('size') ?? 10)
    const problems = Array.from({ length: 12 }, (_, index) =>
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
    )
    const filteredProblems = keyword
      ? problems.filter(
          (problem) =>
            problem.name.toLowerCase().includes(keyword) ||
            problem.externalProblemId.toLowerCase().includes(keyword),
        )
      : problems
    const start = page * size

    await fulfillJson(route, {
      problems: filteredProblems.slice(start, start + size),
      page,
      size,
      totalElements: filteredProblems.length,
      totalPages: Math.ceil(filteredProblems.length / size),
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
          ...(!isSeededSolutionDeleted ? [updatedSeededSolution] : []),
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
      expect(request.headers()['x-xsrf-token']).toBe('e2e-csrf-token')
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

  await page.route(`${apiUrl('/solutions')}/**`, async (route) => {
    if (route.request().isNavigationRequest()) {
      await route.fallback()
      return
    }

    const pathnameParts = new URL(route.request().url()).pathname.split('/')
    const isRestoreRequest = pathnameParts.at(-1) === 'restore'
    const solutionId = decodeURIComponent(
      pathnameParts.at(isRestoreRequest ? -2 : -1) ?? '',
    )

    if (route.request().method() === 'PUT') {
      expect(route.request().headers()['x-xsrf-token']).toBe('e2e-csrf-token')
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

    if (route.request().method() === 'DELETE') {
      expect(route.request().headers()['x-xsrf-token']).toBe('e2e-csrf-token')

      if (
        solutionId !== initialSeededSolution.solutionId ||
        isSeededSolutionDeleted
      ) {
        await fulfillJson(route, { message: 'Solution not found' }, 404)
        return
      }

      isSeededSolutionDeleted = true
      await fulfillEmpty(route, 204)
      return
    }

    if (route.request().method() === 'POST' && isRestoreRequest) {
      expect(route.request().headers()['x-xsrf-token']).toBe('e2e-csrf-token')

      if (
        solutionId !== initialSeededSolution.solutionId ||
        !isSeededSolutionDeleted
      ) {
        await fulfillJson(route, { message: 'Solution not found' }, 404)
        return
      }

      isSeededSolutionDeleted = false
      await fulfillEmpty(route, 204)
      return
    }

    const solution =
      solutionId === initialSeededSolution.solutionId &&
      !isSeededSolutionDeleted
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
    problemName: 'A+B',
    problemProvider: 'BOJ',
    problemNumber: '1000',
    problemDifficulty: 'BRONZE_5',
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

async function fulfillEmpty(route: Route, status: number) {
  await route.fulfill({ status, body: '' })
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
