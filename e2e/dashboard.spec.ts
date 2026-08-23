import { expect, test } from '@playwright/test'

test('keeps the public landing page usable on a narrow viewport', async ({
  page,
}) => {
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
  await page.route('**/auth/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'landing-e2e-csrf-token',
        headerName: 'X-XSRF-TOKEN',
      }),
    })
  })
  await page.setViewportSize({ width: 320, height: 667 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: '풀이를 모으고, 함께 돌아봅니다.',
      level: 1,
    }),
  ).toBeVisible()

  const startRecordingLink = page
    .getByRole('link', { name: '풀이 기록 시작' })
    .first()

  await expect(startRecordingLink).toBeInViewport()
  await expect(startRecordingLink).toHaveAttribute('href', '/register')
  await expect(page.locator('.landing-hero-copy')).toHaveCSS(
    'animation-name',
    'none',
  )

  const navigation = page.getByRole('navigation', { name: '주요 탐색' })

  await expect(navigation.getByRole('link', { name: '풀이' })).toBeHidden()
  await expect(navigation.getByRole('link', { name: '그룹' })).toBeHidden()
  await expect(
    navigation.getByRole('link', { name: '풀이 기록 시작' }),
  ).toBeHidden()
  await expect(navigation.getByRole('link', { name: '로그인' })).toBeVisible()

  const problemSetImage = page.getByRole('img', {
    name: '그룹에서 함께 풀 문제를 정리한 문제집 화면',
  })

  await problemSetImage.scrollIntoViewIfNeeded()
  await expect(problemSetImage).toBeInViewport()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320)
})
