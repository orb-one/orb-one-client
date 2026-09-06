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
    name: '오브원',
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

test('opens the protected my page from the signed-in navigation', async ({
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
        id: 'mypage-user',
        email: 'mypage@example.com',
        nickname: 'mypage-user',
      }),
    })
  })

  await page.goto('/')
  await page.getByRole('link', { name: '마이페이지' }).click()

  await page.waitForURL((url) => url.pathname === '/mypage')
  await expect(page.getByRole('heading', { name: '마이페이지' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '계정 정보' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '비밀번호 변경' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: '회원탈퇴' })).toBeVisible()
  await expect(page.getByLabel('닉네임')).toHaveValue('mypage-user')
  await expect(page.getByLabel('이메일')).toHaveValue('mypage@example.com')
})

test('keeps focus inside the account deletion dialog and restores it on close', async ({
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
        id: 'keyboard-user',
        email: 'keyboard@example.com',
        nickname: 'keyboard-user',
      }),
    })
  })

  await page.goto('/mypage')

  const openDialogButton = page.getByRole('button', { name: '회원탈퇴' })

  await openDialogButton.focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: '정말 회원탈퇴할까요?' })
  const dialogHeading = dialog.getByRole('heading', {
    name: '정말 회원탈퇴할까요?',
  })
  const confirmationInput = dialog.getByRole('textbox', { name: '확인 문구' })
  const cancelButton = dialog.getByRole('button', { name: '취소' })
  const deleteButton = dialog.getByRole('button', { name: '회원탈퇴' })

  await expect(dialogHeading).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(confirmationInput).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(cancelButton).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(confirmationInput).toBeFocused()

  await confirmationInput.fill('탈퇴에 동의합니다')
  await page.keyboard.press('Tab')
  await expect(cancelButton).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(deleteButton).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(confirmationInput).toBeFocused()

  await page.keyboard.press('Escape')

  await expect(dialog).not.toBeVisible()
  await expect(openDialogButton).toBeFocused()
})

test('updates the nickname across the my page and application header', async ({
  page,
}) => {
  test.skip(
    isMswE2eEnabled,
    'MSW-enabled runs already control /users/me through the service worker.',
  )

  const currentUser = {
    id: 'mypage-user',
    email: 'mypage@example.com',
    nickname: 'before-update',
  }
  let nicknameUpdateRequest: unknown

  await mockCsrfEndpoint(page)
  await page.route(apiUrl('/users/me'), async (route) => {
    if (route.request().method() === 'PATCH') {
      nicknameUpdateRequest = route.request().postDataJSON()
      currentUser.nickname = (
        nicknameUpdateRequest as { nickname: string }
      ).nickname
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(currentUser),
    })
  })

  await page.goto('/mypage')

  await expect(page.getByLabel('이메일')).toHaveValue('mypage@example.com')
  await page.getByLabel('닉네임').fill('after-update')
  await page.getByRole('button', { name: '변경사항 저장' }).click()

  await expect(page.getByText('닉네임을 변경했습니다.')).toBeVisible()
  await expect(page.getByLabel('닉네임')).toHaveValue('after-update')
  await expect(page.getByTestId('current-user')).toContainText('after-update')
  expect(nicknameUpdateRequest).toEqual({ nickname: 'after-update' })

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1280)

  await page.setViewportSize({ width: 320, height: 667 })

  await expect(page.getByLabel('이메일')).toBeVisible()
  await expect(page.getByLabel('닉네임')).toBeVisible()
  await expect(page.getByLabel('현재 비밀번호')).toBeVisible()
  await expect(page.getByLabel('새 비밀번호', { exact: true })).toBeVisible()
  await expect(page.getByLabel('새 비밀번호 확인')).toBeVisible()
  const accountDeletionButton = page.getByRole('button', { name: '회원탈퇴' })

  await expect(accountDeletionButton).toBeVisible()
  await accountDeletionButton.click()

  const deletionDialog = page.getByRole('dialog')

  await expect(deletionDialog).toBeInViewport()
  await expect(
    deletionDialog.getByRole('textbox', { name: '확인 문구' }),
  ).toBeInViewport()
  await expect(
    deletionDialog.getByRole('button', { name: '회원탈퇴' }),
  ).toBeInViewport()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320)

  await deletionDialog.getByRole('button', { name: '취소' }).click()
})

test('changes the password and signs the user out', async ({ page }) => {
  test.skip(
    isMswE2eEnabled,
    'MSW-enabled runs already control auth requests through the service worker.',
  )

  let passwordChangeRequest: unknown

  await mockCsrfEndpoint(page)
  await page.route(apiUrl('/users/me'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'password-user',
        email: 'password@example.com',
        nickname: 'password-user',
      }),
    })
  })
  await page.route(apiUrl('/users/me/password'), async (route) => {
    passwordChangeRequest = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Password changed successfully' }),
    })
  })
  await page.route(apiUrl('/auth/logout'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Logout successful' }),
    })
  })

  await page.goto('/mypage')
  await expect(
    page.getByText(
      '현재 비밀번호를 확인한 뒤 사용할 새 비밀번호를 입력하세요. 변경을 완료하면 자동으로 로그아웃됩니다.',
    ),
  ).toBeVisible()
  await page.getByLabel('현재 비밀번호').fill('old-password123!')
  await page.getByLabel('새 비밀번호', { exact: true }).fill('new-password123!')
  await page.getByLabel('새 비밀번호 확인').fill('new-password123!')
  await page.getByRole('button', { name: '비밀번호 변경' }).click()

  await page.waitForURL(
    (url) =>
      url.pathname === '/login' && url.searchParams.has('passwordChanged'),
  )
  await expect(
    page.getByText(
      '비밀번호를 변경했습니다. 새 비밀번호로 다시 로그인해 주세요.',
    ),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: '로그인', exact: true }),
  ).toBeVisible()
  expect(passwordChangeRequest).toEqual({
    currentPassword: 'old-password123!',
    newPassword: 'new-password123!',
  })
})

test('deletes the account only after explicit consent', async ({ page }) => {
  test.skip(
    isMswE2eEnabled,
    'MSW-enabled runs already control /users/me through the service worker.',
  )

  let deletionRequestCount = 0

  await mockCsrfEndpoint(page)
  await page.route(apiUrl('/users/me'), async (route) => {
    if (route.request().method() === 'DELETE') {
      deletionRequestCount += 1
      await route.fulfill({ status: 204 })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'delete-user',
        email: 'delete@example.com',
        nickname: 'delete-user',
      }),
    })
  })

  await page.goto('/mypage')
  await page.getByRole('button', { name: '회원탈퇴' }).click()

  const deletionDialog = page.getByRole('dialog')
  const confirmDeletionButton = deletionDialog.getByRole('button', {
    name: '회원탈퇴',
  })

  await expect(deletionDialog).toContainText(
    '계정과 저장한 풀이가 영구 삭제되며',
  )
  await expect(confirmDeletionButton).toBeDisabled()
  expect(deletionRequestCount).toBe(0)

  await deletionDialog
    .getByRole('textbox', { name: '확인 문구' })
    .fill('탈퇴에 동의합니다 ')
  await expect(confirmDeletionButton).toBeDisabled()

  await deletionDialog
    .getByRole('textbox', { name: '확인 문구' })
    .fill('탈퇴에 동의합니다')
  await expect(confirmDeletionButton).toBeEnabled()

  const deletionResponsePromise = page.waitForResponse(
    (response) =>
      response.url() === apiUrl('/users/me') &&
      response.request().method() === 'DELETE',
  )

  await confirmDeletionButton.click()

  const deletionResponse = await deletionResponsePromise

  expect(deletionResponse.status()).toBe(204)
  expect(deletionRequestCount).toBe(1)
  await page.waitForURL((url) => url.pathname === '/')
  await expect(page.getByText('회원탈퇴가 완료되었습니다.')).toBeVisible()
  await expect(
    page
      .getByRole('navigation', { name: '주요 탐색' })
      .getByRole('link', { name: '로그인' }),
  ).toBeVisible()
})

test('explains group ownership conflicts without signing the user out', async ({
  page,
}) => {
  test.skip(
    isMswE2eEnabled,
    'MSW-enabled runs already control /users/me through the service worker.',
  )

  await mockCsrfEndpoint(page)
  await page.route(apiUrl('/users/me'), async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'USER_OWNS_GROUP',
          message: 'User owns a group',
          timestamp: '2026-08-23T00:00:00Z',
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'group-owner',
        email: 'owner@example.com',
        nickname: 'group-owner',
      }),
    })
  })

  await page.goto('/mypage')
  await page.getByRole('button', { name: '회원탈퇴' }).click()
  const deletionDialog = page.getByRole('dialog')

  await deletionDialog
    .getByRole('textbox', { name: '확인 문구' })
    .fill('탈퇴에 동의합니다')
  await deletionDialog.getByRole('button', { name: '회원탈퇴' }).click()

  await expect(page.getByRole('alert')).toContainText(
    '소유한 그룹이 있어 탈퇴할 수 없습니다.',
  )
  await expect(page.getByRole('alert')).toContainText(
    '그룹 소유권을 이전하거나 그룹을 폐쇄한 뒤 다시 시도해 주세요.',
  )
  await expect(page).toHaveURL(/\/mypage$/)
  await expect(page.getByTestId('current-user')).toContainText('group-owner')
})

test('redirects signed-out users away from the protected my page', async ({
  page,
}) => {
  test.skip(
    isMswE2eEnabled,
    'MSW-enabled runs already control auth requests through the service worker.',
  )

  await mockCsrfEndpoint(page)
  await page.route(apiUrl('/users/me'), async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthorized' }),
    })
  })
  await page.route(apiUrl('/auth/refresh'), async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthorized' }),
    })
  })

  await page.goto('/mypage')

  await page.waitForURL((url) => url.pathname === '/login')
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()
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
  let hasRefreshed = false

  await mockCsrfEndpoint(page)
  await page.route(apiUrl('/users/me'), async (route) => {
    currentUserRequestCount += 1

    if (!hasRefreshed) {
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
    hasRefreshed = true
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
  expect(currentUserRequestCount).toBeGreaterThanOrEqual(2)
})

test('does not repeat auth requests after the signed-out state becomes stale', async ({
  page,
}) => {
  test.skip(
    isMswE2eEnabled,
    'MSW-enabled runs already control auth requests through the service worker.',
  )

  const initialTime = new Date('2026-08-17T00:00:00Z').getTime()
  const requestCounts = {
    currentUser: 0,
    csrf: 0,
    refresh: 0,
  }

  await page.clock.setFixedTime(initialTime)
  await page.route(apiUrl('/users/me'), async (route) => {
    requestCounts.currentUser += 1
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthorized' }),
    })
  })
  await page.route(apiUrl('/auth/csrf'), async (route) => {
    requestCounts.csrf += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'e2e-csrf-token',
        headerName: 'X-XSRF-TOKEN',
      }),
    })
  })
  await page.route(apiUrl('/auth/refresh'), async (route) => {
    requestCounts.refresh += 1
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthorized' }),
    })
  })

  await page.goto('/')
  await expect(
    page
      .getByRole('navigation', { name: '주요 탐색' })
      .getByRole('link', { name: '로그인' }),
  ).toBeVisible()
  expect(requestCounts.currentUser).toBeGreaterThan(0)
  expect(requestCounts.csrf).toBe(1)
  expect(requestCounts.refresh).toBe(1)

  const requestCountsAfterBootstrap = { ...requestCounts }

  await page.clock.setFixedTime(initialTime + 61_000)
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('offline'))
    window.dispatchEvent(new Event('online'))
  })
  await page.waitForTimeout(100)

  expect(requestCounts).toEqual(requestCountsAfterBootstrap)
})

test('registers a random account, logs in, and logs out through the auth pages', async ({
  page,
}) => {
  const account = createRandomAccount()
  const currentUserContract = await mockCurrentUserContract(page, account)

  await registerAndLogin(page, account, currentUserContract)

  const currentUserRequestCountBeforeLogout =
    currentUserContract.currentUserRequestCount()
  const unexpectedPostLogoutRequests: string[] = []

  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname

    if (pathname === '/users/me' || pathname === '/auth/refresh') {
      unexpectedPostLogoutRequests.push(pathname)
    }
  })

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
  await expect(
    page
      .getByRole('navigation', { name: '주요 탐색' })
      .getByRole('link', { name: '로그인' }),
  ).toBeVisible()
  expect(currentUserContract.currentUserRequestCount()).toBe(
    currentUserRequestCountBeforeLogout,
  )
  expect(unexpectedPostLogoutRequests).toEqual([])

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
  let currentUserRequestCount = 0

  // 서버의 /users/me가 구현될 때까지 현재 사용자 조회만 계약 응답으로 대체한다.
  await page.route(apiUrl('/users/me'), async (route) => {
    currentUserRequestCount += 1

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
    currentUserRequestCount() {
      return currentUserRequestCount
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
