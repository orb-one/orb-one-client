import { expect, test, type Page } from '@playwright/test'

const isLiveApiEnabled = process.env.E2E_LIVE_API === 'true'
const isMswE2eEnabled = process.env.E2E_ENABLE_MSW === 'true'

test('updates, deletes, and restores a solution through the real API', async ({
  page,
}, testInfo) => {
  test.skip(
    !isLiveApiEnabled || isMswE2eEnabled,
    'Set E2E_LIVE_API=true and disable MSW to run against API_PROXY_TARGET.',
  )

  const credentials = getTestCredentials()
  let solutionId: string | null = null

  const currentUser = await login(page, credentials)

  try {
    const problemsResponse = await page.request.get('/problems?page=0&size=1')

    expect(problemsResponse.status()).toBe(200)

    const problems = (await problemsResponse.json()) as ProblemListResponse
    const problem = problems.problems[0]
    const problemId = problem?.problemId

    expect(problemId).toBeTruthy()

    if (!problemId) {
      throw new Error('The live API has no problem available for E2E testing.')
    }

    const createResponse = await page.request.post('/solutions', {
      headers: await getCsrfHeaders(page),
      data: {
        problemId,
        language: 'PyPy3',
        code: 'print(1)',
        isSolved: false,
        isDraft: false,
        memoryUsage: null,
        timeElapsed: null,
        description: null,
      },
    })

    expect(createResponse.status()).toBe(201)

    const createResult = (await createResponse.json()) as {
      solutionId: string
    }
    const createdSolutionId = createResult.solutionId
    const createdSolutionLink = page.locator(
      `a[href="/solutions/${createdSolutionId}"]`,
    )
    solutionId = createdSolutionId

    await page.goto(`/solutions/${createdSolutionId}`)
    await expect(
      page.getByRole('heading', { name: problem.name, level: 1 }),
    ).toBeVisible()
    await expect(
      page.getByText(`${problem.provider} ${problem.externalProblemId}`),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /문제 원문 보기/ }),
    ).toHaveAttribute('href', problem.url)
    await expect(
      page.getByText(`${currentUser.nickname} (내 풀이)`),
    ).toBeVisible()
    await page.getByRole('link', { name: '풀이 수정' }).click()

    await expect(
      page.getByRole('combobox', { name: '프로그래밍 언어' }),
    ).toHaveText('PyPy3')
    await expect(page.getByRole('checkbox', { name: /임시 저장/ })).toHaveCount(
      0,
    )

    await page
      .getByRole('textbox', { name: /풀이 설명/ })
      .fill('실제 서버 E2E 수정')
    await page.getByRole('checkbox', { name: /풀이 완료/ }).check()
    await page.getByRole('spinbutton', { name: /메모리 사용량/ }).fill('12345')
    await page.getByRole('spinbutton', { name: /실행 시간/ }).fill('67')

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          `/solutions/${createdSolutionId}` &&
        response.request().method() === 'PUT',
    )

    await page.getByRole('button', { name: '변경사항 저장' }).click()

    const updateResponse = await updateResponsePromise

    expect(updateResponse.status()).toBe(200)
    await page.waitForURL(
      (url) => url.pathname === `/solutions/${createdSolutionId}`,
    )
    await expect(page.getByText('실제 서버 E2E 수정')).toBeVisible()

    const verifyResponse = await page.request.get(
      `/solutions/${createdSolutionId}`,
    )

    expect(verifyResponse.status()).toBe(200)
    await expect(verifyResponse.json()).resolves.toMatchObject({
      solutionId: createdSolutionId,
      language: 'PyPy3',
      code: 'print(1)',
      isSolved: true,
      isDraft: false,
      memoryUsage: 12_345,
      timeElapsed: 67,
      description: '실제 서버 E2E 수정',
    })

    await page.getByRole('button', { name: '풀이 삭제' }).click()

    const deleteDialog = page.getByRole('alertdialog', {
      name: '풀이를 삭제할까요?',
    })

    await expect(deleteDialog).toContainText(
      '삭제 후 표시되는 실행 취소로 복구할 수 있습니다.',
    )
    await page.waitForTimeout(300)

    const confirmationScreenshot = testInfo.outputPath(
      'solution-delete-confirmation.png',
    )
    await page.screenshot({ path: confirmationScreenshot, fullPage: true })
    await testInfo.attach('solution-delete-confirmation', {
      path: confirmationScreenshot,
      contentType: 'image/png',
    })

    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          `/solutions/${createdSolutionId}` &&
        response.request().method() === 'DELETE',
    )
    const listResponsePromise = page.waitForResponse((response) => {
      const requestUrl = new URL(response.url())

      return (
        requestUrl.pathname === '/solutions' &&
        response.request().method() === 'GET'
      )
    })

    await deleteDialog.getByRole('button', { name: '풀이 삭제' }).click()

    expect((await deleteResponsePromise).status()).toBe(204)
    await page.waitForURL((url) => url.pathname === '/solutions')
    expect((await listResponsePromise).status()).toBe(200)
    await expect(page.getByText('풀이를 삭제했습니다.')).toBeVisible()
    await expect(createdSolutionLink).toHaveCount(0)
    await page.waitForTimeout(300)

    const undoScreenshot = testInfo.outputPath('solution-delete-undo.png')
    await page.screenshot({ path: undoScreenshot, fullPage: true })
    await testInfo.attach('solution-delete-undo', {
      path: undoScreenshot,
      contentType: 'image/png',
    })

    const restoreResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          `/solutions/${createdSolutionId}/restore` &&
        response.request().method() === 'POST',
    )

    await page.getByRole('button', { name: '실행 취소' }).click()

    expect((await restoreResponsePromise).status()).toBe(204)
    await expect(page.getByText('풀이를 복구했습니다.')).toBeVisible()
    await expect(createdSolutionLink).toBeVisible()

    const restoredResponse = await page.request.get(
      `/solutions/${createdSolutionId}`,
    )

    expect(restoredResponse.status()).toBe(200)
  } finally {
    if (solutionId) {
      const deleteResponse = await page.request.delete(
        `/solutions/${solutionId}`,
        { headers: await getCsrfHeaders(page) },
      )

      expect(deleteResponse.status()).toBe(204)
    }
  }
})

async function getCsrfHeaders(page: Page) {
  const csrfResponse = await page.request.get('/auth/csrf')

  expect(csrfResponse.status()).toBe(200)

  const csrf = (await csrfResponse.json()) as {
    token: string
    headerName: string
  }

  expect(csrf.token).toBeTruthy()
  expect(csrf.headerName).toBe('X-XSRF-TOKEN')

  return { [csrf.headerName]: csrf.token }
}

async function login(page: Page, credentials: TestCredentials) {
  await page.goto('/login')
  await page.getByLabel('이메일').fill(credentials.email)
  await page.getByLabel('비밀번호').fill(credentials.password)

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/auth/login' &&
      response.request().method() === 'POST',
  )

  await page.getByRole('button', { name: '로그인', exact: true }).click()

  expect((await loginResponsePromise).status()).toBe(200)
  await page.waitForURL((url) => url.pathname === '/')
  const currentUserResponse = await page.request.get('/users/me')

  expect(currentUserResponse.status()).toBe(200)

  const currentUser = (await currentUserResponse.json()) as CurrentUserResponse

  await expect(page.getByTestId('current-user')).toContainText(
    currentUser.nickname,
  )

  return currentUser
}

function getTestCredentials(): TestCredentials {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      'E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required for live API E2E tests.',
    )
  }

  return { email, password }
}

interface TestCredentials {
  email: string
  password: string
}

interface CurrentUserResponse {
  id: string
  email: string
  nickname: string
}

interface ProblemListResponse {
  problems: {
    problemId: string
    provider: string
    externalProblemId: string
    name: string
    url: string
  }[]
}
