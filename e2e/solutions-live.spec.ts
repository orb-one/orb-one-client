import { expect, test, type Page } from '@playwright/test'

const isLiveApiEnabled = process.env.E2E_LIVE_API === 'true'
const isMswE2eEnabled = process.env.E2E_ENABLE_MSW === 'true'

test('updates a solution through the real API without exposing draft controls', async ({
  page,
}) => {
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
  } finally {
    if (solutionId) {
      const deleteResponse = await page.request.delete(
        `/solutions/${solutionId}`,
      )

      expect(deleteResponse.status()).toBe(204)
    }
  }
})

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
