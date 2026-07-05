import { expect, test } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const apiBaseUrl = getRequiredEnv('VITE_API_BASE_URL')
const password = process.env.E2E_TEST_PASSWORD ?? 'password123!'
const emailDomain = process.env.E2E_TEST_EMAIL_DOMAIN ?? 'example.com'
const accessCookieName = process.env.E2E_ACCESS_COOKIE_NAME ?? 'access_token'
const refreshCookieName = process.env.E2E_REFRESH_COOKIE_NAME ?? 'refresh_token'
const expectAuthCookies = process.env.E2E_EXPECT_AUTH_COOKIES === 'true'

test('registers a random account and logs in through the auth pages', async ({
  page,
}) => {
  const account = createRandomAccount()

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

  await page.getByRole('button', { name: '로그인', exact: true }).click()

  const loginResponse = await loginResponsePromise

  expect(loginResponse.status()).toBe(200)
  await page.waitForURL((url) => url.pathname === '/')

  if (expectAuthCookies) {
    // 직접 API 호출은 cross-site가 될 수 있으므로 proxy 또는 same-site 환경에서 켠다.
    const cookies = await page.context().cookies(apiBaseUrl)
    const cookieNames = cookies.map((cookie) => cookie.name)

    expect(cookieNames).toContain(accessCookieName)
    expect(cookieNames).toContain(refreshCookieName)
  }
})

function createRandomAccount() {
  const token = `${String(Date.now())}-${randomUUID().slice(0, 8)}`

  return {
    email: `orb-one-e2e-${token}@${emailDomain}`,
    nickname: `e2e-${token.slice(-8)}`,
    password,
  }
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
