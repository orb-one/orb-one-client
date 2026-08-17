import { expect, test, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const apiBaseUrl = getRequiredEnv('VITE_API_BASE_URL')
const password = process.env.E2E_TEST_PASSWORD ?? 'password123!'
const emailDomain = process.env.E2E_TEST_EMAIL_DOMAIN ?? 'example.com'
const accessCookieName = process.env.E2E_ACCESS_COOKIE_NAME ?? 'access_token'
const refreshCookieName = process.env.E2E_REFRESH_COOKIE_NAME ?? 'refresh_token'
const expectAuthCookies = process.env.E2E_EXPECT_AUTH_COOKIES === 'true'
const isMswE2eEnabled = process.env.E2E_ENABLE_MSW === 'true'

test('shows the first registration error in view on a short viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 667 })
  await page.goto('/register')

  await page.getByRole('button', { name: '회원가입', exact: true }).click()

  const emailInput = page.getByLabel('이메일')
  const emailError = page.getByText('이메일을 입력해 주세요.')

  await expect(emailInput).toBeFocused()
  await expect(emailInput).toBeInViewport()
  await expect(emailError).toBeInViewport()
})

test('shows the first login error in view on a short viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 667 })
  await page.goto('/login')

  const mainBox = await page.getByRole('main').boundingBox()

  expect(mainBox).not.toBeNull()

  if (!mainBox) {
    throw new Error('Application main content must have a layout box.')
  }

  expect(Math.round(mainBox.y + mainBox.height)).toBeGreaterThanOrEqual(667)

  await page.getByRole('button', { name: '로그인', exact: true }).click()

  const emailInput = page.getByLabel('이메일')
  const emailError = page.getByText('이메일을 입력해 주세요.')

  await expect(emailInput).toBeFocused()
  await expect(emailInput).toBeInViewport()
  await expect(emailError).toBeInViewport()
})

test('keeps the signed-in application navigation usable across viewports', async ({
  page,
}) => {
  test.skip(
    isMswE2eEnabled,
    'MSW-enabled runs already control /users/me through the service worker.',
  )

  await page.route(apiUrl('/users/me'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'responsive-user',
        email: 'responsive@example.com',
        nickname: 'responsive-navigation-user-with-a-long-name',
      }),
    })
  })

  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')

  const navigation = page.getByRole('navigation', { name: '주요 탐색' })
  const brandLink = navigation.getByRole('link', {
    name: 'Orb One',
    exact: true,
  })
  const currentUser = page.getByTestId('current-user')
  const logoutButton = page.getByRole('button', {
    name: '로그아웃',
    exact: true,
  })

  await expect(navigation).toBeVisible()
  await expect(brandLink).toBeVisible()
  await expect(
    page.getByRole('img', { name: '현재 로그인한 사용자' }),
  ).toBeVisible()
  await expect(currentUser).toBeInViewport()
  await expect(logoutButton).toBeInViewport()

  await page.setViewportSize({ width: 320, height: 667 })

  await expect(navigation).toBeVisible()
  await expect(currentUser).toBeInViewport()
  await expect(logoutButton).toBeInViewport()

  const [brandBox, currentUserBox, logoutBox] = await Promise.all([
    brandLink.boundingBox(),
    currentUser.boundingBox(),
    logoutButton.boundingBox(),
  ])

  expect(brandBox).not.toBeNull()
  expect(currentUserBox).not.toBeNull()
  expect(logoutBox).not.toBeNull()

  if (!brandBox || !currentUserBox || !logoutBox) {
    throw new Error('Application navigation elements must have layout boxes.')
  }

  expect(brandBox.x + brandBox.width).toBeLessThanOrEqual(currentUserBox.x)
  expect(currentUserBox.x + currentUserBox.width).toBeLessThanOrEqual(
    logoutBox.x,
  )
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320)
})

test('refreshes expired current user requests before showing signed-in UI', async ({
  page,
}) => {
  test.skip(
    isMswE2eEnabled,
    'MSW-enabled runs already control /users/me through the service worker.',
  )

  const account = createRandomAccount()
  let currentUserRequestCount = 0

  await mockCsrfEndpoint(page)
  await page.route(apiUrl('/users/me'), async (route) => {
    currentUserRequestCount += 1

    if (currentUserRequestCount === 1) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: account.id,
        email: account.email,
        nickname: account.nickname,
      }),
    })
  })
  await page.route(apiUrl('/auth/refresh'), async (route) => {
    expect(route.request().headers()['x-xsrf-token']).toBe('e2e-csrf-token')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Token refreshed' }),
    })
  })

  const refreshResponsePromise = page.waitForResponse(
    (response) =>
      response.url() === apiUrl('/auth/refresh') &&
      response.request().method() === 'POST',
  )

  await page.goto('/')

  const refreshResponse = await refreshResponsePromise

  expect(refreshResponse.status()).toBe(200)
  await expect(page.getByTestId('current-user')).toContainText(account.nickname)
  expect(currentUserRequestCount).toBe(2)
})

test('registers a random account, logs in, and logs out through the auth pages', async ({
  page,
}) => {
  const account = createRandomAccount()
  const currentUserContract = await mockCurrentUserContract(page, account)

  await registerAndLogin(page, account, currentUserContract)

  if (expectAuthCookies) {
    // 직접 API 호출은 cross-site가 될 수 있으므로 proxy 또는 same-site 환경에서 켠다.
    const cookies = await page.context().cookies(apiBaseUrl)
    const cookieNames = cookies.map((cookie) => cookie.name)

    expect(cookieNames).toContain(accessCookieName)
    expect(cookieNames).toContain(refreshCookieName)
  }

  const logoutResponsePromise = page.waitForResponse(
    (response) =>
      response.url() === apiUrl('/auth/logout') &&
      response.request().method() === 'POST',
  )

  currentUserContract.signOut()
  await page.getByRole('button', { name: '로그아웃', exact: true }).click()

  const logoutResponse = await logoutResponsePromise

  expect(logoutResponse.status()).toBe(200)
  await expect(page.getByRole('link', { name: '로그인' })).toBeVisible()

  if (expectAuthCookies) {
    const cookies = await page.context().cookies(apiBaseUrl)
    const cookieNames = cookies.map((cookie) => cookie.name)

    expect(cookieNames).not.toContain(accessCookieName)
    expect(cookieNames).not.toContain(refreshCookieName)
  }
})

test('keeps the signed-in state and shows a toast when logout fails', async ({
  page,
}) => {
  const account = createRandomAccount()
  const currentUserContract = await mockCurrentUserContract(page, account)

  await registerAndLogin(page, account, currentUserContract)

  if (isMswE2eEnabled) {
    await failNextMswLogout(page)
  } else {
    await page.route(apiUrl('/auth/logout'), async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      })
    })
  }

  const logoutResponsePromise = page.waitForResponse(
    (response) =>
      response.url() === apiUrl('/auth/logout') &&
      response.request().method() === 'POST',
  )

  await page.getByRole('button', { name: '로그아웃', exact: true }).click()

  const logoutResponse = await logoutResponsePromise

  expect(logoutResponse.status()).toBe(500)
  await expect(
    page.getByText('로그아웃에 실패했습니다. 다시 시도해 주세요.'),
  ).toBeVisible()
  await expect(page.getByTestId('current-user')).toContainText(account.nickname)
  await expect(
    page.getByRole('button', { name: '로그아웃', exact: true }),
  ).toBeEnabled()

  if (expectAuthCookies) {
    const cookies = await page.context().cookies(apiBaseUrl)
    const cookieNames = cookies.map((cookie) => cookie.name)

    expect(cookieNames).toContain(accessCookieName)
    expect(cookieNames).toContain(refreshCookieName)
  }
})

async function registerAndLogin(
  page: Page,
  account: ReturnType<typeof createRandomAccount>,
  currentUserContract: Awaited<ReturnType<typeof mockCurrentUserContract>>,
) {
  await page.goto('/register')
  await page.getByLabel('이메일').fill(account.email)
  await page.getByLabel('닉네임').fill(account.nickname)
  await page.getByLabel('비밀번호', { exact: true }).fill(account.password)
  await page.getByLabel('비밀번호 확인').fill(account.password)

  const registerResponsePromise = page.waitForResponse(
    (response) =>
      response.url() === apiUrl('/auth/register') &&
      response.request().method() === 'POST',
  )

  await page.getByRole('button', { name: '회원가입', exact: true }).click()

  const registerResponse = await registerResponsePromise

  expect(registerResponse.status()).toBe(201)
  await page.waitForURL((url) => url.pathname === '/login')

  await page.getByLabel('이메일').fill(account.email)
  await page.getByLabel('비밀번호').fill(account.password)

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url() === apiUrl('/auth/login') &&
      response.request().method() === 'POST',
  )

  currentUserContract.signIn()
  await page.getByRole('button', { name: '로그인', exact: true }).click()

  const loginResponse = await loginResponsePromise

  expect(loginResponse.status()).toBe(200)
  await page.waitForURL((url) => url.pathname === '/')
  await expect(page.getByTestId('current-user')).toContainText(account.nickname)
}

function createRandomAccount() {
  const token = `${String(Date.now())}-${randomUUID().slice(0, 8)}`

  return {
    id: randomUUID(),
    email: `orb-one-e2e-${token}@${emailDomain}`,
    nickname: `e2e-${token.slice(-8)}`,
    password,
  }
}

async function mockCurrentUserContract(
  page: Page,
  account: ReturnType<typeof createRandomAccount>,
) {
  let isSignedIn = false

  // 서버의 /users/me가 구현될 때까지 현재 사용자 조회만 계약 응답으로 대체한다.
  await page.route(apiUrl('/users/me'), async (route) => {
    if (!isSignedIn) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: account.id,
        email: account.email,
        nickname: account.nickname,
      }),
    })
  })

  return {
    signIn() {
      isSignedIn = true
    },
    signOut() {
      isSignedIn = false
    },
  }
}

async function mockCsrfEndpoint(page: Page) {
  await page.route(apiUrl('/auth/csrf'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'e2e-csrf-token',
        headerName: 'X-XSRF-TOKEN',
      }),
    })
  })
}

async function failNextMswLogout(page: Page) {
  const response = await page.evaluate(async () => {
    const response = await fetch('/__msw/auth/logout-failure', {
      method: 'POST',
    })

    return {
      ok: response.ok,
      status: response.status,
    }
  })

  expect(response).toEqual({ ok: true, status: 200 })
}

function apiUrl(path: string) {
  return new URL(stripLeadingSlashes(path), ensureTrailingSlash(apiBaseUrl))
    .href
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

function stripLeadingSlashes(value: string) {
  return value.replace(/^\/+/, '')
}

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required to run e2e tests`)
  }

  return value
}
