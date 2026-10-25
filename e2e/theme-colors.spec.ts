import { expect, test, type Locator, type Page } from '@playwright/test'

const apiBaseUrl = process.env.VITE_API_BASE_URL
if (!apiBaseUrl) {
  throw new Error('VITE_API_BASE_URL is required to run e2e tests')
}
const apiBase = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`
const groupPath = '/groups/group-theme'
const problemSetPath = `${groupPath}/problem-sets/set-theme`
const problemSourceUrl = 'https://www.acmicpc.net/problem/1000'
const problems = [
  {
    problemId: 'problem-add',
    provider: 'BOJ',
    externalProblemId: '1000',
    name: 'A+B',
    url: problemSourceUrl,
    difficulty: null,
  },
  {
    problemId: 'problem-subtract',
    provider: 'BOJ',
    externalProblemId: '1001',
    name: 'A-B',
    url: 'https://www.acmicpc.net/problem/1001',
    difficulty: null,
  },
  {
    problemId: 'problem-hello',
    provider: 'BOJ',
    externalProblemId: '2557',
    name: 'Hello World',
    url: 'https://www.acmicpc.net/problem/2557',
    difficulty: null,
  },
]

test.skip(
  process.env.E2E_ENABLE_MSW === 'true',
  'This suite uses page.route mocks and requires MSW to be disabled.',
)

test.use({ serviceWorkers: 'block' })

function apiUrl(path: string) {
  return new URL(path.replace(/^\/+/, ''), apiBase).href
}

async function mockThemePages(page: Page) {
  let selectedProblems = problems.slice(0, 2)
  const group = {
    groupId: 'group-theme',
    groupName: '테마 확인 그룹',
    members: [
      { userId: 'owner-theme', nickname: '그룹 소유자', role: 'OWNER' },
      { userId: 'member-theme', nickname: '테스트 멤버', role: 'MEMBER' },
    ],
  }

  await page.route(apiUrl('/users/me'), (route) =>
    route.fulfill({
      json: {
        id: 'owner-theme',
        email: 'theme@example.com',
        nickname: '그룹 소유자',
      },
    }),
  )
  await page.route(apiUrl('/auth/csrf'), (route) =>
    route.fulfill({
      json: { token: 'theme-e2e-csrf', headerName: 'X-XSRF-TOKEN' },
    }),
  )
  await page.route(apiUrl('/groups') + '?**', (route) =>
    route.fulfill({
      json: {
        items: [
          {
            groupId: group.groupId,
            name: group.groupName,
            nickname: '그룹 소유자',
            isMember: true,
            createdAt: '2026-10-25T00:00:00Z',
          },
        ],
        page: 0,
        size: 20,
        totalCount: 1,
        hasNext: false,
      },
    }),
  )
  await page.route(apiUrl(groupPath), (route) =>
    route.request().isNavigationRequest()
      ? route.fallback()
      : route.fulfill({ json: group }),
  )
  await page.route(apiUrl(`${groupPath}/practices`), (route) =>
    route.fulfill({ json: [] }),
  )
  await page.route(apiUrl('/problems') + '?**', (route) =>
    route.fulfill({
      json: {
        problems,
        page: 0,
        size: 10,
        totalElements: problems.length,
        totalPages: 1,
      },
    }),
  )
  await page.route(apiUrl('/solutions') + '?**', (route) =>
    route.fulfill({ json: { solutions: [] } }),
  )
  await page.route(apiUrl(problemSetPath) + '**', async (route) => {
    if (route.request().isNavigationRequest()) {
      return route.fallback()
    }

    const method = route.request().method()
    if (method === 'DELETE') {
      const problemId = new URL(route.request().url()).pathname
        .split('/')
        .at(-1)
      selectedProblems = selectedProblems.filter(
        (problem) => problem.problemId !== problemId,
      )
      return route.fulfill({ status: 204 })
    }
    if (method === 'POST') {
      const body = route.request().postDataJSON() as { problemIds: string[] }
      selectedProblems = problems.filter(
        (problem) =>
          selectedProblems.some(
            (selected) => selected.problemId === problem.problemId,
          ) || body.problemIds.includes(problem.problemId),
      )
      return route.fulfill({
        json: {
          problemSetId: 'set-theme',
          groupId: group.groupId,
          problems: selectedProblems,
          updatedAt: '2026-10-25T00:00:00Z',
        },
      })
    }
    return route.fulfill({
      json: {
        problemSetId: 'set-theme',
        groupId: group.groupId,
        name: '테마 확인 문제집',
        items: selectedProblems,
        page: 0,
        size: 20,
        totalCount: selectedProblems.length,
        hasNext: false,
        createdBy: 'owner-theme',
        createdAt: '2026-10-25T00:00:00Z',
        updatedAt: '2026-10-25T00:00:00Z',
      },
    })
  })
}

async function readColors(locator: Locator) {
  return locator.evaluate((element) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context)
      throw new Error('A canvas context is required to resolve colors')

    function parse(color: string) {
      if (!context) throw new Error('Missing canvas context')
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = color
      context.fillRect(0, 0, 1, 1)
      const rgba = context.getImageData(0, 0, 1, 1).data
      return {
        red: rgba[0] ?? 0,
        green: rgba[1] ?? 0,
        blue: rgba[2] ?? 0,
        alpha: (rgba[3] ?? 0) / 255,
      }
    }

    function blend(
      foreground: ReturnType<typeof parse>,
      background: ReturnType<typeof parse>,
    ) {
      return {
        red:
          foreground.red * foreground.alpha +
          background.red * (1 - foreground.alpha),
        green:
          foreground.green * foreground.alpha +
          background.green * (1 - foreground.alpha),
        blue:
          foreground.blue * foreground.alpha +
          background.blue * (1 - foreground.alpha),
        alpha: 1,
      }
    }

    function luminance(color: ReturnType<typeof parse>) {
      const linear = (channel: number) => {
        const value = channel / 255
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4
      }
      return (
        0.2126 * linear(color.red) +
        0.7152 * linear(color.green) +
        0.0722 * linear(color.blue)
      )
    }

    const ancestors: Element[] = []
    for (
      let current: Element | null = element;
      current;
      current = current.parentElement
    ) {
      ancestors.unshift(current)
    }
    let background = parse('white')
    for (const ancestor of ancestors) {
      background = blend(
        parse(getComputedStyle(ancestor).backgroundColor),
        background,
      )
    }
    const style = getComputedStyle(element)
    const foreground = blend(parse(style.color), background)
    const foregroundLuminance = luminance(foreground)
    const backgroundLuminance = luminance(background)

    return {
      background: style.backgroundColor,
      border: style.borderTopColor,
      shadow: style.boxShadow,
      contrast:
        (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05),
    }
  })
}

async function expectReadable(locator: Locator) {
  await expect(locator).toBeVisible()
  await expect
    .poll(async () => (await readColors(locator)).contrast)
    .toBeGreaterThanOrEqual(4.5)
}

async function finishTransitions(locator: Locator) {
  await locator.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    )
  })
}

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`${String(viewport.width)}px theme colors`, () => {
    test.use({ viewport })
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await mockThemePages(page)
    })

    test('keeps problem details readable when the system theme changes', async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ colorScheme: 'light' })
      await page.goto(problemSetPath)
      const card = page
        .getByTestId('problem-set-problem')
        .filter({ hasText: 'A+B' })
      const title = card.getByText('A+B', { exact: true })
      const backgrounds: string[] = []

      for (const colorScheme of ['light', 'dark', 'light'] as const) {
        await page.emulateMedia({ colorScheme })
        await expectReadable(title)
        await expectReadable(card.getByText('#1000', { exact: true }))
        await expectReadable(
          card.getByRole('button', { name: '풀이', exact: true }),
        )
        await expectReadable(
          card.getByRole('button', { name: '삭제', exact: true }),
        )
        backgrounds.push((await readColors(card)).background)
        await title.click()
        for (const label of ['플랫폼', '문제 번호', '난이도 수준', '미지정']) {
          await expectReadable(card.getByText(label, { exact: true }))
        }
        await expectReadable(card.locator('code').first())
        await expectReadable(card.locator('code').nth(1))
        await expectReadable(
          card.getByText(problemSourceUrl, { exact: true }).first(),
        )
        const sourceLink = card.getByRole('link', { name: /문제 원문 열기/ })
        await expectReadable(sourceLink)
        await expect(sourceLink).toHaveAttribute('href', problemSourceUrl)
        await expect(sourceLink).toHaveAttribute('target', '_blank')
        await expect(sourceLink).toHaveAttribute('rel', /noopener/)
        await expect(sourceLink).toHaveAttribute('rel', /noreferrer/)
        await testInfo.attach(
          `problem-details-${colorScheme}-${String(backgrounds.length)}`,
          {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
          },
        )
        await title.click()
        await expect(card.getByText('플랫폼', { exact: true })).toHaveCount(0)
      }
      expect(backgrounds[0]).not.toBe(backgrounds[1])
      expect(backgrounds[2]).toBe(backgrounds[0])
    })

    test('switches group hover, selection, borders and practice dividers with the theme', async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: 'light' })
      await page.goto('/groups')
      const groupRow = page.getByTitle('클릭하여 그룹으로 이동', {
        exact: true,
      })
      await groupRow.hover()
      await finishTransitions(groupRow)
      const lightHover = (await readColors(groupRow)).background
      await page.emulateMedia({ colorScheme: 'dark' })
      await expect
        .poll(async () => (await readColors(groupRow)).background)
        .not.toBe(lightHover)
      await expectReadable(
        groupRow.getByText('테마 확인 그룹', { exact: true }),
      )

      await page.goto(`${groupPath}?tab=members`)
      const content = page.getByTestId('group-tab-content')
      const darkBorder = (await readColors(content)).border
      const member = page.getByTitle(
        '클릭하여 강퇴/소유권 이전 대상으로 선택',
        { exact: true },
      )
      await member.hover()
      await finishTransitions(member)
      const darkMemberHover = (await readColors(member)).background
      await member.click()
      const selectedMember = page.getByTitle('클릭하여 선택 해제', {
        exact: true,
      })
      await finishTransitions(selectedMember)
      const darkSelection = (await readColors(selectedMember)).background
      await expect
        .poll(async () => (await readColors(selectedMember)).shadow)
        .not.toBe('none')
      await page.emulateMedia({ colorScheme: 'light' })
      await expect
        .poll(async () => (await readColors(content)).border)
        .not.toBe(darkBorder)
      await expect
        .poll(async () => (await readColors(selectedMember)).background)
        .not.toBe(darkSelection)
      await expectReadable(
        selectedMember.getByText('테스트 멤버', { exact: true }),
      )
      await selectedMember.click()
      await member.hover()
      await finishTransitions(member)
      await expect
        .poll(async () => (await readColors(member)).background)
        .not.toBe(darkMemberHover)

      await page.goto(`${groupPath}?tab=practice`)
      await page.getByRole('button', { name: '연습 생성', exact: true }).click()
      const dialog = page.getByRole('dialog')
      const separator = dialog
        .getByRole('separator')
        .locator(':scope > *')
        .first()
      await expect(separator).toBeVisible()
      const lightDivider = (await readColors(separator)).background
      await page.emulateMedia({ colorScheme: 'dark' })
      await expect
        .poll(async () => (await readColors(separator)).background)
        .not.toBe(lightDivider)
      await expectReadable(dialog.getByText('연습 이름', { exact: true }))
    })

    test('adds and deletes problems and opens solutions in dark mode', async ({
      page,
    }) => {
      page.on('dialog', async (dialog) => dialog.accept())
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto(problemSetPath)
      await page.getByRole('button', { name: '문제 추가', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await expectReadable(dialog.getByText('Hello World', { exact: true }))
      await dialog.getByText('Hello World', { exact: true }).click()
      await dialog
        .getByRole('button', { name: '선택한 문제 추가', exact: true })
        .click()
      const added = page
        .getByTestId('problem-set-problem')
        .filter({ hasText: 'Hello World' })
      await expect(added).toBeVisible()
      await added.getByRole('button', { name: '삭제', exact: true }).click()
      await expect(added).toHaveCount(0)
      await page
        .getByTestId('problem-set-problem')
        .filter({ hasText: 'A+B' })
        .getByRole('button', { name: '풀이', exact: true })
        .click()
      await expect(page).toHaveURL(/\/solutions\?problemId=problem-add$/)
      await expect(
        page.getByRole('heading', { name: '풀이 목록', exact: true }),
      ).toBeVisible()
    })
  })
}
