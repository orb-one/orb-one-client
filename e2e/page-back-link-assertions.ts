import { expect, type Page } from '@playwright/test'

interface PageBackLinkExpectation {
  label: string
  href: string
  headingName?: string
}

export async function expectPageBackLinkAboveHeading(
  page: Page,
  { label, href, headingName }: PageBackLinkExpectation,
) {
  const link = page.getByRole('link', { name: label })
  const heading = page.getByRole('heading', {
    level: 1,
    ...(headingName ? { name: headingName } : {}),
  })

  await expect(link).toHaveCount(1)
  await expect(link).toHaveAttribute('href', href)
  await expect(link.locator('svg')).toBeVisible()
  await expect(heading).toBeVisible()

  const linkBox = await link.boundingBox()
  const headingBox = await heading.boundingBox()

  if (!linkBox || !headingBox) {
    throw new Error('Back link and heading must have visible bounds')
  }

  expect(Math.round(headingBox.y - (linkBox.y + linkBox.height))).toBe(8)
}
