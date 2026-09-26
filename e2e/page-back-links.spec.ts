import { expect, test, type Page } from '@playwright/test'

const apiBaseUrl = getRequiredEnv('VITE_API_BASE_URL')
const isMswE2eEnabled = process.env.E2E_ENABLE_MSW === 'true'
const practice = {
  groupId: '1',
  id: 'p-1',
  title: '1주차',
  startDate: '2026-07-20T00:00:00Z',
  endDate: '2026-08-10T23:59:59Z',
}
const problemSet = {
  groupId: '54f2cc6b-c10b-4e79-96d2-e933297fe748',
  id: '4455f522-c5e7-4567-b96d-8b32b2c85de2',
  name: '1주차 - 배열/문자열',
}

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required to run e2e tests`)
  }

  return value
}

function apiUrl(path: string) {
  const base = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`
  return new URL(path.replace(/^\/+/, ''), base).href
}

async function mockGroupRequests(page: Page, groupId: string) {
  await page.route(apiUrl('/users/me'), (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        email: 'user@example.com',
        nickname: 'user',
      }),
    }),
  )
  await page.route(apiUrl(`/groups/${groupId}`), (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        groupId,
        groupName: '알고리즘 스터디',
        members: [],
      }),
    }),
  )
}

test('returns from a practice detail to the practice tab on mobile', async ({
  page,
}) => {
  await mockGroupRequests(page, practice.groupId)
  await page.route(apiUrl(`/groups/${practice.groupId}/practices`), (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: practice.id,
          title: practice.title,
          group_id: practice.groupId,
          start_date: practice.startDate,
          end_date: practice.endDate,
          created_at: practice.startDate,
          updated_at: practice.startDate,
          problems: [],
        },
      ]),
    }),
  )
  await page.route(
    apiUrl(`/groups/${practice.groupId}/practices/${practice.id}`),
    (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          id: practice.id,
          title: practice.title,
          group_id: practice.groupId,
          start_date: practice.startDate,
          end_date: practice.endDate,
          created_at: practice.startDate,
          updated_at: practice.startDate,
          problems: [],
        }),
      }),
  )

  await page.setViewportSize({ width: 320, height: 667 })
  await page.goto(`/groups/${practice.groupId}/practices/${practice.id}`)

  const backLink = page.getByRole('link', { name: '연습 목록으로 돌아가기' })

  await expect(
    page.getByRole('heading', { name: practice.title, level: 1 }),
  ).toBeVisible()
  await expect(backLink).toHaveAttribute(
    'href',
    `/groups/${practice.groupId}?tab=practice`,
  )
  await expect(backLink.locator('svg')).toBeVisible()
  await expect(backLink).toBeInViewport()
  await backLink.focus()
  await page.keyboard.press('Enter')

  await page.waitForURL(`/groups/${practice.groupId}?tab=practice`)
  await expect(page.getByRole('button', { name: '연습 생성' })).toBeVisible()
  await expect(page.getByRole('button', { name: '문제집 생성' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: practice.title })).toBeVisible()
})

test('returns from a problem set detail to the problem set tab on desktop', async ({
  page,
}) => {
  await mockGroupRequests(page, problemSet.groupId)
  await page.route(
    `${apiUrl(`/groups/${problemSet.groupId}/problem-sets`)}**`,
    (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              problemSetId: problemSet.id,
              name: problemSet.name,
              problemCount: 2,
              createdBy: 'user-1',
              createdAt: '2026-07-31T15:48:14',
            },
          ],
          page: 0,
          size: 20,
          totalCount: 1,
          hasNext: false,
        }),
      }),
  )
  await page.route(
    `${apiUrl(`/groups/${problemSet.groupId}/problem-sets/${problemSet.id}`)}**`,
    (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          problemSetId: problemSet.id,
          groupId: problemSet.groupId,
          name: problemSet.name,
          items: [],
          page: 0,
          size: 20,
          totalCount: 0,
          hasNext: false,
          createdBy: 'user-1',
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        }),
      }),
  )

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`/groups/${problemSet.groupId}/problem-sets/${problemSet.id}`)

  const backLink = page.getByRole('link', {
    name: '문제집 목록으로 돌아가기',
  })

  if (!isMswE2eEnabled) {
    await expect(
      page.getByRole('heading', { name: problemSet.name, level: 1 }),
    ).toBeVisible()
  }
  await expect(backLink).toHaveAttribute(
    'href',
    `/groups/${problemSet.groupId}?tab=problem-sets`,
  )
  await expect(backLink.locator('svg')).toBeVisible()
  await backLink.click()

  await page.waitForURL(`/groups/${problemSet.groupId}?tab=problem-sets`)
  await expect(page.getByRole('button', { name: '문제집 생성' })).toBeVisible()
  await expect(page.getByRole('button', { name: '연습 생성' })).toHaveCount(0)
  if (!isMswE2eEnabled) {
    await expect(page.getByText(problemSet.name)).toBeVisible()
  }
})
