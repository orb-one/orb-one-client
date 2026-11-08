import { expect, test } from '@playwright/test'

const apiBaseUrl = process.env.VITE_API_BASE_URL
if (!apiBaseUrl) throw new Error('VITE_API_BASE_URL is required')
const apiUrl = (path: string) =>
  new URL(path.replace(/^\/+/, ''), `${apiBaseUrl.replace(/\/$/, '')}/`).href
const groupPath = '/groups/member-order-group'

test.skip(
  process.env.E2E_ENABLE_MSW === 'true',
  'Uses route mocks with MSW disabled',
)
test.use({ serviceWorkers: 'block' })

for (const width of [320, 390, 1280]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`keeps the owner first and hides member IDs at ${String(width)}px in ${colorScheme}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      const members = [
        {
          userId: 'member-before',
          nickname: '첫 번째 멤버',
          role: 'MEMBER',
        },
        {
          userId: 'group-owner',
          nickname: '그룹 오너',
          role: 'OWNER',
        },
        {
          userId: 'member-after',
          nickname: '두 번째 멤버',
          role: 'MEMBER',
        },
      ]
      await page.route(apiUrl('/users/me'), (route) =>
        route.fulfill({
          json: {
            id: 'group-owner',
            nickname: '그룹 오너',
            email: 'owner@example.com',
          },
        }),
      )
      await page.route(apiUrl('/auth/csrf'), (route) =>
        route.fulfill({
          json: { token: 'member-csrf', headerName: 'X-XSRF-TOKEN' },
        }),
      )
      await page.route(apiUrl(groupPath), (route) =>
        route.fulfill({
          json: {
            groupId: 'member-order-group',
            groupName: '멤버 목록 검증',
            members,
          },
        }),
      )
      await page.goto(`${groupPath}?tab=members`)
      const content = page.getByTestId('group-tab-content')
      const rows = content.getByRole('listitem')
      await expect(rows).toHaveCount(3)
      await expect(rows.nth(0)).toContainText('그룹 오너')
      await expect(rows.nth(1)).toContainText('첫 번째 멤버')
      await expect(rows.nth(2)).toContainText('두 번째 멤버')
      await expect(content).not.toContainText('User ID:')
      for (const member of members)
        await expect(content).not.toContainText(member.userId)
      await expect(
        rows.nth(0).getByText('OWNER', { exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: '그룹 소유권 이전', exact: true }),
      ).toBeDisabled()
      await rows.nth(2).click()
      await expect(
        rows.nth(2).getByText('선택됨', { exact: true }),
      ).toBeVisible()
      const transfer = page.getByRole('button', {
        name: "'두 번째 멤버'에게 소유권 이전",
      })
      const kick = page.getByRole('button', {
        name: "'두 번째 멤버' 강퇴하기",
      })
      await expect(transfer).toBeEnabled()
      await expect(kick).toBeEnabled()
      const confirmations: string[] = []
      page.on('dialog', async (dialog) => {
        confirmations.push(dialog.message())
        await dialog.dismiss()
      })
      await transfer.click()
      await kick.click()
      expect(confirmations).toHaveLength(2)
      for (const confirmation of confirmations)
        expect(confirmation).toContain("'두 번째 멤버'")
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1)
      await page.screenshot({
        path: testInfo.outputPath('members.png'),
        fullPage: true,
      })
      await rows.nth(2).click()
      await expect(content.getByText('선택됨', { exact: true })).toHaveCount(0)
      await expect(
        page.getByRole('button', { name: '그룹 소유권 이전', exact: true }),
      ).toBeDisabled()
    })
  }
}
