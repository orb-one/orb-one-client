import { expect, test, type Locator, type Page } from '@playwright/test'

async function mockPublicSession(page: Page) {
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
}

async function getContrastRatio(locator: Locator) {
  const colors = await locator.evaluate((element) => {
    const style = getComputedStyle(element)

    return {
      background: style.backgroundColor,
      foreground: style.color,
    }
  })
  const backgroundLuminance = relativeLuminance(colors.background)
  const foregroundLuminance = relativeLuminance(colors.foreground)
  const lighter = Math.max(backgroundLuminance, foregroundLuminance)
  const darker = Math.min(backgroundLuminance, foregroundLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

function relativeLuminance(cssColor: string) {
  const channels = cssColor
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number)

  if (channels?.length !== 3) {
    throw new Error(`Unsupported CSS color: ${cssColor}`)
  }

  const [redChannel, greenChannel, blueChannel] = channels

  if (
    redChannel === undefined ||
    greenChannel === undefined ||
    blueChannel === undefined
  ) {
    throw new Error(`Incomplete CSS color: ${cssColor}`)
  }

  const toLinear = (channel: number) => {
    const normalized = channel / 255
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }
  const red = toLinear(redChannel)
  const green = toLinear(greenChannel)
  const blue = toLinear(blueChannel)

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

test('keeps the public landing page usable on a narrow viewport', async ({
  page,
}) => {
  await mockPublicSession(page)
  await page.setViewportSize({ width: 320, height: 667 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: '같은 문제를 풀고, 풀이를 나누며 함께 성장하세요.',
      level: 1,
    }),
  ).toBeVisible()

  await expect(
    page.getByRole('group', { name: '오브원 제품 화면 미리보기' }),
  ).toBeInViewport()
  await expect(
    page.getByRole('main').getByRole('link', { name: '풀이 기록 시작' }),
  ).toHaveCount(0)
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

  const providerMarquee = page.locator('.landing-provider-marquee')
  const providerTrack = page.locator('.landing-provider-track')

  await providerMarquee.scrollIntoViewIfNeeded()
  await expect(providerTrack).toHaveCSS('animation-name', 'none')
  await expect(providerMarquee).toHaveCSS('overflow-x', 'auto')
  await providerMarquee.focus()
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(() => providerMarquee.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320)
})

test('follows the system light and dark color schemes', async ({ page }) => {
  await mockPublicSession(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/')

  const landing = page.locator('.orb-study-landing')
  const navigation = page.getByRole('navigation', { name: '주요 탐색' })
  const registerLink = navigation.getByRole('link', { name: '풀이 기록 시작' })
  const programmersLogo = page.getByRole('img', { name: 'Programmers' })

  await expect(landing).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(registerLink).toHaveCSS('color', 'rgb(255, 255, 255)')
  expect(await getContrastRatio(registerLink)).toBeGreaterThanOrEqual(4.5)
  const lightNavigationBackground = await navigation.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  )
  await expect
    .poll(() =>
      programmersLogo.evaluate(
        (image) => (image as HTMLImageElement).currentSrc,
      ),
    )
    .toContain('programmers-dark')

  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })

  await expect(landing).toHaveCSS('background-color', 'rgb(38, 38, 38)')
  await expect(registerLink).toHaveCSS('color', 'rgb(23, 23, 23)')
  expect(await getContrastRatio(registerLink)).toBeGreaterThanOrEqual(4.5)
  const darkNavigationBackground = await navigation.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  )
  expect(darkNavigationBackground).not.toBe(lightNavigationBackground)
  await expect
    .poll(() =>
      programmersLogo.evaluate(
        (image) => (image as HTMLImageElement).currentSrc,
      ),
    )
    .toContain('programmers-light')
})

test('keeps the sticky navigation above landing page layers', async ({
  page,
}) => {
  await mockPublicSession(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const landing = page.locator('.orb-study-landing')
  const navigation = page.getByRole('navigation', { name: '주요 탐색' })
  const heading = page.getByRole('heading', {
    name: '같은 문제를 풀고, 풀이를 나누며 함께 성장하세요.',
    level: 1,
  })

  await expect(landing).toHaveCSS('isolation', 'isolate')
  await heading.evaluate((element) => {
    window.scrollTo({
      top: window.scrollY + element.getBoundingClientRect().top,
      behavior: 'instant',
    })
  })

  await expect(navigation).toBeInViewport()
  await expect
    .poll(() =>
      navigation.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        const topElement = document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        )

        return topElement !== null && element.contains(topElement)
      }),
    )
    .toBe(true)
})
