import { expect, test, type Page } from '@playwright/test'

const apiBase = process.env.VITE_API_BASE_URL
if (!apiBase) throw new Error('VITE_API_BASE_URL is required')
const groupPath = '/groups/schedule-group'
const listPath = `${groupPath}/practices`
const detailPath = `${listPath}/schedule-practice`
const apiUrl = (path: string) =>
  new URL(path.replace(/^\/+/, ''), `${apiBase.replace(/\/$/, '')}/`).href
const problem = {
  problemId: '10000000-0000-4000-8000-000000000001',
  provider: 'BOJ',
  externalProblemId: '1000',
  name: 'A+B',
  difficulty: null,
  url: 'https://www.acmicpc.net/problem/1000',
}
interface PracticeDto {
  practiceId: string
  groupId: string
  title: string
  startDate: string
  endDate: string
  problems: (typeof problem)[]
}

test.skip(
  process.env.E2E_ENABLE_MSW === 'true',
  'Uses route mocks with MSW disabled',
)

async function fillTime(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true })
  await input.fill(value)
  await input.press('Tab')
}

async function expectEmptyTimeRejected(
  page: Page,
  requests: Record<string, unknown>[],
  submitLabel: string,
) {
  for (const [label, value] of [
    ['시작 시간', '09:30'],
    ['종료 시간', '18:45'],
  ] as const) {
    const count = requests.length
    const input = page.getByLabel(label, { exact: true })
    await input.fill('')
    await input.press('Enter')
    await expect(input).not.toBeFocused()
    await expect(input).toHaveValue('')
    expect(requests).toHaveLength(count)
    await page.getByRole('button', { name: submitLabel, exact: true }).click()
    await expect(
      page.getByTestId('practice-form-scroll-area').getByRole('alert').filter({
        hasText: '시작 시간과 종료 시간을 모두 입력해 주세요.',
      }),
    ).toBeVisible()
    expect(requests).toHaveLength(count)
    await fillTime(page, label, value)
  }
}

async function settleAnimations(page: Page) {
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (Number.isFinite(animation.effect?.getComputedTiming().endTime))
        animation.finish()
    }
  })
}

async function expectFormFits(page: Page) {
  await settleAnimations(page)
  const area = page.getByTestId('practice-form-scroll-area')
  expect(
    await area.evaluate((element) => element.scrollWidth - element.clientWidth),
  ).toBeLessThanOrEqual(1)
  for (const label of ['시작 시간', '종료 시간']) {
    const input = page.getByLabel(label, { exact: true })
    if (await input.count()) {
      const outer = await area.boundingBox()
      const inner = await input.boundingBox()
      if (!outer || !inner) throw new Error('Missing form/input bounds')
      expect(inner.x).toBeGreaterThanOrEqual(outer.x)
      expect(inner.x + inner.width).toBeLessThanOrEqual(
        outer.x + outer.width + 1,
      )
    }
  }
}

for (const timezoneId of ['UTC', 'Asia/Seoul']) {
  for (const mobile of [false, true]) {
    test.describe(`${timezoneId} ${mobile ? 'mobile' : 'desktop'}`, () => {
      test.use({
        timezoneId,
        viewport: mobile
          ? { width: 390, height: 740 }
          : { width: 1280, height: 800 },
        isMobile: mobile,
        hasTouch: mobile,
        serviceWorkers: 'block',
      })

      for (const isAllDay of [true, false]) {
        test(`${isAllDay ? 'all-day' : 'timed'} create → list/detail → edit round-trip`, async ({
          page,
        }, testInfo) => {
          await page.clock.setFixedTime(new Date('2030-01-01T00:00:00Z'))
          const requests: Record<string, unknown>[] = []
          const unexpected: string[] = []
          let practice: PracticeDto | null = null
          await page.route('**/*', (route) => {
            const url = new URL(route.request().url())
            if (['localhost', '127.0.0.1'].includes(url.hostname))
              return route.continue()
            unexpected.push(url.origin)
            return route.abort()
          })
          await page.route(apiUrl('/users/me'), (route) =>
            route.fulfill({
              json: {
                id: 'user-1',
                nickname: '테스터',
                email: 'test@example.com',
              },
            }),
          )
          await page.route(apiUrl('/auth/csrf'), (route) =>
            route.fulfill({
              json: { token: 'local-csrf', headerName: 'X-XSRF-TOKEN' },
            }),
          )
          await page.route(apiUrl(groupPath), (route) =>
            route.fulfill({
              json: {
                groupId: 'schedule-group',
                groupName: '시간대 테스트 그룹',
                members: [],
              },
            }),
          )
          await page.route(apiUrl('/problems') + '?**', (route) =>
            route.fulfill({
              json: {
                problems: [problem],
                page: 0,
                size: 20,
                totalElements: 1,
                totalPages: 1,
              },
            }),
          )
          const save = (body: Record<string, unknown>): PracticeDto => ({
            practiceId: 'schedule-practice',
            groupId: 'schedule-group',
            title: String(body.title),
            startDate: new Date(String(body.startDate)).toISOString(),
            endDate: new Date(String(body.endDate)).toISOString(),
            problems: [problem],
          })
          await page.route(apiUrl(listPath), async (route) => {
            if (route.request().method() === 'POST') {
              const body = route.request().postDataJSON() as Record<
                string,
                unknown
              >
              requests.push(body)
              practice = save(body)
              return route.fulfill({ status: 201, json: practice })
            }
            return route.fulfill({ json: practice ? [practice] : [] })
          })
          await page.route(apiUrl(detailPath), async (route) => {
            if (route.request().method() === 'PUT') {
              const body = route.request().postDataJSON() as Record<
                string,
                unknown
              >
              requests.push(body)
              practice = save(body)
            }
            return route.fulfill({ json: practice })
          })

          await page.goto(`${groupPath}?tab=practice`)
          await page
            .getByRole('button', { name: '연습 생성', exact: true })
            .click()
          await page
            .getByRole('textbox', { name: '연습 이름' })
            .fill('한국 시간 연습')
          await page.getByRole('button', { name: /^연습 기간:/ }).click()
          await page.locator('button[data-date="2030-01-02"]').click()
          await page.locator('button[data-date="2030-01-02"]').click()
          if (!isAllDay) {
            await page
              .getByRole('checkbox', { name: '종일', exact: true })
              .uncheck()
            await fillTime(page, '시작 시간', '09:30')
            await fillTime(page, '종료 시간', '18:45')
          }
          await expectFormFits(page)
          await settleAnimations(page)
          await page.screenshot({ path: testInfo.outputPath('create.png') })
          await page
            .getByRole('button', { name: '문제 선택', exact: true })
            .click()
          await page
            .getByRole('button')
            .filter({ has: page.getByText('A+B', { exact: true }) })
            .click()
          await page
            .getByRole('button', { name: '선택 완료', exact: true })
            .click()
          if (!isAllDay) {
            await expectEmptyTimeRejected(page, requests, '생성하기')
            for (const end of ['09:30', '09:29']) {
              await fillTime(page, '종료 시간', end)
              await page
                .getByRole('button', { name: '생성하기', exact: true })
                .click()
              await expect(
                page
                  .getByTestId('practice-form-scroll-area')
                  .getByRole('alert')
                  .filter({
                    hasText: '종료 일시는 시작 일시보다 이후여야 합니다.',
                  }),
              ).toHaveText('종료 일시는 시작 일시보다 이후여야 합니다.')
              expect(requests).toHaveLength(0)
            }
            await fillTime(page, '종료 시간', '18:45')
          }
          await page
            .getByRole('button', { name: '생성하기', exact: true })
            .click()
          await expect(
            page.getByRole('heading', { name: '연습 만들기' }),
          ).toBeHidden()
          const expectedStart = `2030-01-02T${isAllDay ? '00:00' : '09:30'}:00+09:00`
          const expectedEnd = isAllDay
            ? '2030-01-03T00:00:00+09:00'
            : '2030-01-02T18:45:00+09:00'
          expect(requests[0]).toEqual({
            title: '한국 시간 연습',
            startDate: expectedStart,
            endDate: expectedEnd,
            problemIds: [problem.problemId],
          })
          await expect(
            page.getByText(isAllDay ? '2030-01-02 00:00' : '2030-01-02 09:30', {
              exact: true,
            }),
          ).toBeVisible()
          await expect(
            page.getByText(isAllDay ? '2030-01-03 00:00' : '2030-01-02 18:45', {
              exact: true,
            }),
          ).toBeVisible()
          await settleAnimations(page)
          await page.screenshot({ path: testInfo.outputPath('list.png') })

          await page.getByRole('button', { name: '수정', exact: true }).click()
          await expect(
            page.getByRole('checkbox', { name: '종일', exact: true }),
          ).toBeChecked({ checked: isAllDay })
          if (!isAllDay) {
            await expect(
              page.getByLabel('시작 시간', { exact: true }),
            ).toHaveValue('09:30')
            await expect(
              page.getByLabel('종료 시간', { exact: true }),
            ).toHaveValue('18:45')
          }
          await expect(
            page.getByRole('button', { name: /^연습 기간:/ }),
          ).toContainText('1월 2일')
          await expectFormFits(page)
          await settleAnimations(page)
          await page.screenshot({ path: testInfo.outputPath('edit.png') })
          await page
            .getByRole('textbox', { name: '연습 이름' })
            .fill('이름만 수정')
          if (!isAllDay) await expectEmptyTimeRejected(page, requests, '저장')
          await page.getByRole('button', { name: '저장', exact: true }).click()
          await expect(
            page.getByRole('heading', { name: '연습 수정하기' }),
          ).toBeHidden()
          expect(requests[1]).toEqual({
            title: '이름만 수정',
            startDate: new Date(expectedStart).toISOString(),
            endDate: new Date(expectedEnd).toISOString(),
          })

          await page
            .getByRole('link', { name: '이름만 수정', exact: true })
            .click()
          await expect(
            page.getByText(
              isAllDay
                ? '2030-01-02 · 종일 (한국 시간)'
                : '2030-01-02 09:30 ~ 2030-01-02 18:45 (한국 시간, 종료 시각 미포함)',
              { exact: true },
            ),
          ).toBeVisible()
          await settleAnimations(page)
          await page.screenshot({ path: testInfo.outputPath('detail.png') })
          expect(unexpected).toEqual([])
        })
      }
    })
  }
}
