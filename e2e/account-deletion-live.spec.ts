import { expect, test, type Page, type Response } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const isLiveAccountDeletionEnabled =
  process.env.E2E_LIVE_ACCOUNT_DELETION === 'true'
const isMswE2eEnabled = process.env.E2E_ENABLE_MSW === 'true'

test.beforeEach(() => {
  test.skip(
    !isLiveAccountDeletionEnabled || isMswE2eEnabled,
    'Set E2E_LIVE_ACCOUNT_DELETION=true and disable MSW to run against API_PROXY_TARGET.',
  )
})

test('deletes an account with a saved solution through the real API', async ({
  page,
}) => {
  const account = createRandomAccount()

  await registerAndLogin(page, account)

  const problemsResponse = await page.request.get('/problems?page=0&size=1')

  expect(problemsResponse.status()).toBe(200)

  const problems = (await problemsResponse.json()) as ProblemListResponse
  const problemId = problems.problems[0]?.problemId

  expect(problemId).toBeTruthy()

  if (!problemId) {
    throw new Error('The live API has no problem available for E2E testing.')
  }

  const solutionResponse = await page.request.post('/solutions', {
    headers: await getCsrfHeaders(page),
    data: {
      problemId,
      language: 'Java',
      code: 'class Main {}',
      isSolved: true,
      isDraft: false,
      memoryUsage: null,
      timeElapsed: null,
      description: 'Account deletion E2E',
    },
  })

  expect(solutionResponse.status()).toBe(201)

  await page.goto('/mypage')
  await page.getByRole('button', { name: '회원탈퇴' }).click()

  const deletionResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, '/users/me', 'DELETE'),
  )

  await confirmAccountDeletion(page)

  expect((await deletionResponsePromise).status()).toBe(204)
  await page.waitForURL((url) => url.pathname === '/')
  await expect(page.getByText('회원탈퇴가 완료되었습니다.')).toBeVisible()
  await expect(page.getByRole('link', { name: '로그인' })).toBeVisible()

  const currentUserResponse = await page.request.get('/users/me')

  expect(currentUserResponse.status()).toBe(401)
})

test('blocks a group owner and succeeds after the group is closed', async ({
  page,
}) => {
  const account = createRandomAccount()

  await registerAndLogin(page, account)

  const groupResponse = await page.request.post('/groups', {
    headers: await getCsrfHeaders(page),
    data: { name: `account-deletion-${account.token}` },
  })

  expect(groupResponse.status()).toBe(201)

  const { groupId } = (await groupResponse.json()) as { groupId: string }

  await page.goto('/mypage')
  await page.getByRole('button', { name: '회원탈퇴' }).click()

  const blockedResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, '/users/me', 'DELETE'),
  )

  await confirmAccountDeletion(page)

  const blockedResponse = await blockedResponsePromise

  expect(blockedResponse.status()).toBe(409)
  await expect(blockedResponse.json()).resolves.toMatchObject({
    code: 'USER_OWNS_GROUP',
  })
  await expect(page.getByRole('alert')).toContainText(
    '소유한 그룹이 있어 탈퇴할 수 없습니다.',
  )
  await expect(page).toHaveURL(/\/mypage$/)
  await expect(page.getByTestId('current-user')).toContainText(account.nickname)

  const closeGroupResponse = await page.request.delete(`/groups/${groupId}`, {
    headers: await getCsrfHeaders(page),
  })

  expect(closeGroupResponse.status()).toBe(204)

  await page.getByRole('button', { name: '회원탈퇴' }).click()

  const deletionResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, '/users/me', 'DELETE'),
  )

  await confirmAccountDeletion(page)

  expect((await deletionResponsePromise).status()).toBe(204)
  await expect(page.getByRole('link', { name: '로그인' })).toBeVisible()
})

async function registerAndLogin(page: Page, account: TestAccount) {
  await page.goto('/register')
  await page.getByLabel('이메일').fill(account.email)
  await page.getByLabel('닉네임').fill(account.nickname)
  await page.getByLabel('비밀번호', { exact: true }).fill(account.password)
  await page.getByLabel('비밀번호 확인').fill(account.password)

  const registerResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, '/auth/register', 'POST'),
  )

  await page.getByRole('button', { name: '회원가입', exact: true }).click()

  expect((await registerResponsePromise).status()).toBe(201)
  await page.waitForURL((url) => url.pathname === '/login')

  await page.getByLabel('이메일').fill(account.email)
  await page.getByLabel('비밀번호').fill(account.password)

  const loginResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, '/auth/login', 'POST'),
  )

  await page.getByRole('button', { name: '로그인', exact: true }).click()

  expect((await loginResponsePromise).status()).toBe(200)
  await page.waitForURL((url) => url.pathname === '/')
  await expect(page.getByTestId('current-user')).toContainText(account.nickname)
}

async function confirmAccountDeletion(page: Page) {
  const dialog = page.getByRole('dialog')

  await dialog
    .getByRole('textbox', { name: '확인 문구' })
    .fill('탈퇴에 동의합니다')
  await dialog.getByRole('button', { name: '회원탈퇴' }).click()
}

async function getCsrfHeaders(page: Page) {
  const response = await page.request.get('/auth/csrf')

  expect(response.status()).toBe(200)

  const csrf = (await response.json()) as {
    token: string
    headerName: string
  }

  expect(csrf.token).toBeTruthy()
  expect(csrf.headerName).toBe('X-XSRF-TOKEN')

  return { [csrf.headerName]: csrf.token }
}

function isApiResponse(response: Response, path: string, method: string) {
  return (
    new URL(response.url()).pathname === path &&
    response.request().method() === method
  )
}

function createRandomAccount(): TestAccount {
  const token = randomUUID().slice(0, 8)

  return {
    token,
    email: `account-deletion-${token}@example.com`,
    nickname: `e2e-${token}`,
    password: 'password123!',
  }
}

interface TestAccount {
  token: string
  email: string
  nickname: string
  password: string
}

interface ProblemListResponse {
  problems: { problemId: string }[]
}
