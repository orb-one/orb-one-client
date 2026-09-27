import { expect, test } from '@playwright/test'

for (const { expectedSize, viewportWidth } of [
  { expectedSize: 'compact', viewportWidth: 320 },
  { expectedSize: 'compact', viewportWidth: 390 },
  { expectedSize: 'flexible', viewportWidth: 432 },
]) {
  test(`fits Turnstile at ${String(viewportWidth)}px`, async ({ page }) => {
    const callbackWarnings: string[] = []

    page.on('console', (message) => {
      if (message.text().includes('Unable to find onload callback')) {
        callbackWarnings.push(message.text())
      }
    })

    await page.setViewportSize({ width: viewportWidth, height: 667 })
    await page.goto('/login')
    await expect(
      page.getByRole('button', { name: '로그인', exact: true }),
    ).toBeEnabled()

    const measurement = await page.locator('#cf-turnstile').evaluate((node) => {
      const widgetRect = node.getBoundingClientRect()
      let clipRight = Number.POSITIVE_INFINITY
      let ancestor = node.parentElement

      while (ancestor) {
        if (getComputedStyle(ancestor).overflow === 'clip') {
          clipRight = Math.min(
            clipRight,
            ancestor.getBoundingClientRect().right,
          )
        }
        ancestor = ancestor.parentElement
      }

      return {
        clipRight,
        widgetRight: widgetRect.right,
        widgetWidth: widgetRect.width,
      }
    })

    await page.waitForTimeout(1_200)

    if (expectedSize === 'compact') {
      expect(measurement.widgetWidth).toBe(150)
    } else {
      expect(measurement.widgetWidth).toBeGreaterThanOrEqual(300)
    }
    expect(measurement.widgetRight).toBeLessThanOrEqual(measurement.clipRight)
    expect(callbackWarnings).toEqual([])
  })
}
