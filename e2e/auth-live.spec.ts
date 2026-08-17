import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Response,
} from '@playwright/test'

const isLiveAuthEnabled = process.env.E2E_LIVE_AUTH === 'true'
const isMswE2eEnabled = process.env.E2E_ENABLE_MSW === 'true'
const accessCookieName = process.env.E2E_ACCESS_COOKIE_NAME ?? 'access_token'
const refreshCookieName = process.env.E2E_REFRESH_COOKIE_NAME ?? 'refresh_token'

test('refreshes an invalid access cookie through the real auth API', async ({
  context,
  page,
}) => {
  test.skip(
    !isLiveAuthEnabled || isMswE2eEnabled,
    'Set E2E_LIVE_AUTH=true and disable MSW to run against API_PROXY_TARGET.',
  )

  const credentials = getTestCredentials()

  await login(page, credentials)

  const cookiesBeforeRefresh = await context.cookies()
  const accessCookie = getRequiredCookie(cookiesBeforeRefresh, accessCookieName)
  const refreshCookie = getRequiredCookie(
    cookiesBeforeRefresh,
    refreshCookieName,
  )

  await context.addCookies([{ ...accessCookie, value: 'invalid-access-token' }])

  const unauthorizedResponsePromise = page.waitForResponse(
    (response) =>
      isApiResponse(response, '/users/me', 'GET') && response.status() === 401,
  )
  const refreshResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, '/auth/refresh', 'POST'),
  )
  const recoveredResponsePromise = page.waitForResponse(
    (response) =>
      isApiResponse(response, '/users/me', 'GET') && response.status() === 200,
  )

  await page.reload()

  await unauthorizedResponsePromise
  const refreshResponse = await refreshResponsePromise
  await recoveredResponsePromise

  expect(refreshResponse.status()).toBe(200)
  expect(refreshResponse.request().headers()['x-xsrf-token']).toBeTruthy()

  const setCookieHeader = await refreshResponse.headerValue('set-cookie')

  expect(setCookieHeader).toContain(`${accessCookieName}=`)
  expect(setCookieHeader).toContain(`${refreshCookieName}=`)

  const cookiesAfterRefresh = await context.cookies()
  const refreshedAccessCookie = getRequiredCookie(
    cookiesAfterRefresh,
    accessCookieName,
  )
  const refreshedRefreshCookie = getRequiredCookie(
    cookiesAfterRefresh,
    refreshCookieName,
  )

  expect(refreshedAccessCookie.value).not.toBe('invalid-access-token')
  expect(refreshedAccessCookie.value).not.toBe(accessCookie.value)
  expect(refreshedRefreshCookie.value).not.toBe(refreshCookie.value)
  await expect(page.getByTestId('current-user')).toBeVisible()

  const logoutResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, '/auth/logout', 'POST'),
  )

  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  expect((await logoutResponsePromise).status()).toBe(200)
})

async function login(page: Page, credentials: TestCredentials) {
  await page.goto('/login')
  await page.getByLabel('이메일').fill(credentials.email)
  await page.getByLabel('비밀번호').fill(credentials.password)

  const loginResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, '/auth/login', 'POST'),
  )

  await page.getByRole('button', { name: '로그인', exact: true }).click()

  expect((await loginResponsePromise).status()).toBe(200)
  await page.waitForURL((url) => url.pathname === '/')
  await expect(page.getByTestId('current-user')).toBeVisible()
}

function getRequiredCookie(
  cookies: Awaited<ReturnType<BrowserContext['cookies']>>,
  name: string,
) {
  const cookie = cookies.find((candidate) => candidate.name === name)

  if (!cookie) {
    throw new Error(`Expected ${name} cookie from the auth server.`)
  }

  return cookie
}

function isApiResponse(response: Response, path: string, method: string) {
  return (
    new URL(response.url()).pathname === path &&
    response.request().method() === method
  )
}

function getTestCredentials(): TestCredentials {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      'E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required for live auth E2E tests.',
    )
  }

  return { email, password }
}

interface TestCredentials {
  email: string
  password: string
}
