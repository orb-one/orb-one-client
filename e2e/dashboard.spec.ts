import { expect, test } from '@playwright/test'

test('keeps the dashboard usable on a narrow viewport', async ({ page }) => {
  await page.route('**/users/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthorized' }),
    })
  })
  await page.route('**/auth/refresh', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthorized' }),
    })
  })
  await page.setViewportSize({ width: 320, height: 667 })
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Orb One client' }),
  ).toBeVisible()
  await expect(page.getByText('React + TypeScript')).toBeVisible()

  const launchButton = page.getByRole('button', { name: 'Launch count: 0' })

  await launchButton.scrollIntoViewIfNeeded()
  await expect(launchButton).toBeInViewport()
  await launchButton.click()
  await expect(
    page.getByRole('button', { name: 'Launch count: 1' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Reset' }).click()

  await expect(
    page.getByRole('button', { name: 'Launch count: 0' }),
  ).toBeVisible()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320)
})
