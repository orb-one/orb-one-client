import { afterEach, beforeEach, expect, it, vi } from 'vitest'

let getCurrentUser: typeof import('@/lib/api/auth').getCurrentUser
let changeCurrentUserPassword: typeof import('@/lib/api/auth').changeCurrentUserPassword
let deleteCurrentUser: typeof import('@/lib/api/auth').deleteCurrentUser
let loginAccount: typeof import('@/lib/api/auth').loginAccount
let logoutAccount: typeof import('@/lib/api/auth').logoutAccount
let refreshSession: typeof import('@/lib/api/auth').refreshSession
let registerAccount: typeof import('@/lib/api/auth').registerAccount
let updateCurrentUser: typeof import('@/lib/api/auth').updateCurrentUser
let AuthSessionExpiredError: typeof import('@/lib/api/client').AuthSessionExpiredError

beforeEach(async () => {
  vi.resetModules()
  const auth = await import('@/lib/api/auth')
  const client = await import('@/lib/api/client')

  getCurrentUser = auth.getCurrentUser
  changeCurrentUserPassword = auth.changeCurrentUserPassword
  deleteCurrentUser = auth.deleteCurrentUser
  loginAccount = auth.loginAccount
  logoutAccount = auth.logoutAccount
  refreshSession = auth.refreshSession
  registerAccount = auth.registerAccount
  updateCurrentUser = auth.updateCurrentUser
  AuthSessionExpiredError = client.AuthSessionExpiredError
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('posts register requests to the auth API', async () => {
  const response = { message: 'Registration successful' }
  const request = {
    email: 'user@example.com',
    password: 'password123!',
    nickname: 'orbone-user',
  }
  const fetchMock = mockFetch(
    csrfResponse(),
    new Response(JSON.stringify(response), jsonResponseInit()),
  )

  await expect(registerAccount(request)).resolves.toEqual(response)

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/auth/register',
    expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    }),
  )

  const requestInit = fetchMock.mock.calls[1]?.[1]
  const headers = requestInit?.headers

  expect(headers).toBeInstanceOf(Headers)
  expect((headers as Headers).get('Content-Type')).toBe('application/json')
  expect((headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-token')
})

it('posts login requests to the auth API', async () => {
  const response = { message: 'Login successful' }
  const request = {
    email: 'user@example.com',
    password: 'password123!',
  }
  const fetchMock = mockFetch(
    csrfResponse(),
    new Response(JSON.stringify(response), jsonResponseInit()),
  )

  await expect(loginAccount(request)).resolves.toEqual(response)

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/auth/login',
    expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    }),
  )

  const requestInit = fetchMock.mock.calls[1]?.[1]
  const headers = requestInit?.headers

  expect(headers).toBeInstanceOf(Headers)
  expect((headers as Headers).get('Content-Type')).toBe('application/json')
  expect((headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-token')
})

it('posts refresh requests to the auth API', async () => {
  const response = { message: 'Token refreshed' }
  const fetchMock = mockFetch(
    csrfResponse(),
    new Response(JSON.stringify(response), jsonResponseInit()),
  )

  await expect(refreshSession()).resolves.toEqual(response)

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/auth/refresh',
    expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }),
  )
  expect(getRequestHeader(fetchMock, 2, 'X-XSRF-TOKEN')).toBe('csrf-token')
})

it('treats refresh 401 responses as an expired auth session', async () => {
  const fetchMock = mockFetch(
    csrfResponse(),
    new Response(JSON.stringify({ message: 'Refresh expired' }), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
  )

  await expect(refreshSession()).rejects.toBeInstanceOf(AuthSessionExpiredError)
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('posts logout requests to the auth API', async () => {
  const response = { message: 'Logout successful' }
  const fetchMock = mockFetch(
    csrfResponse(),
    new Response(JSON.stringify(response), jsonResponseInit()),
  )

  await expect(logoutAccount()).resolves.toEqual(response)

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/auth/logout',
    expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }),
  )
  expect(getRequestHeader(fetchMock, 2, 'X-XSRF-TOKEN')).toBe('csrf-token')
})

it('gets the current user from the user API', async () => {
  const response = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    nickname: 'orbone-user',
  }
  const fetchMock = mockFetch(
    new Response(JSON.stringify(response), jsonResponseInit()),
  )

  await expect(getCurrentUser()).resolves.toEqual(response)

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/users/me',
    expect.objectContaining({
      credentials: 'include',
    }),
  )
})

it('patches the current user nickname with CSRF protection', async () => {
  const request = { nickname: 'updated-user' }
  const response = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    nickname: request.nickname,
  }
  const fetchMock = mockFetch(
    csrfResponse(),
    new Response(JSON.stringify(response), jsonResponseInit()),
  )

  await expect(updateCurrentUser(request)).resolves.toEqual(response)

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/users/me',
    expect.objectContaining({
      method: 'PATCH',
      credentials: 'include',
      body: JSON.stringify(request),
    }),
  )
  expect(getRequestHeader(fetchMock, 2, 'Content-Type')).toBe(
    'application/json',
  )
  expect(getRequestHeader(fetchMock, 2, 'X-XSRF-TOKEN')).toBe('csrf-token')
})

it('patches the current user password with CSRF protection', async () => {
  const request = {
    currentPassword: 'old-password123!',
    newPassword: 'new-password123!',
  }
  const response = { message: 'Password changed successfully' }
  const fetchMock = mockFetch(
    csrfResponse(),
    new Response(JSON.stringify(response), jsonResponseInit()),
  )

  await expect(changeCurrentUserPassword(request)).resolves.toEqual(response)

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/users/me/password',
    expect.objectContaining({
      method: 'PATCH',
      credentials: 'include',
      body: JSON.stringify(request),
    }),
  )
  expect(getRequestHeader(fetchMock, 2, 'Content-Type')).toBe(
    'application/json',
  )
  expect(getRequestHeader(fetchMock, 2, 'X-XSRF-TOKEN')).toBe('csrf-token')
})

it('deletes the current user with CSRF protection', async () => {
  const fetchMock = mockFetch(
    csrfResponse(),
    new Response(null, { status: 204 }),
  )

  await expect(deleteCurrentUser()).resolves.toBeUndefined()

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/users/me',
    expect.objectContaining({
      method: 'DELETE',
      credentials: 'include',
    }),
  )
  expect(getRequestHeader(fetchMock, 2, 'X-XSRF-TOKEN')).toBe('csrf-token')
})

function jsonResponseInit(): ResponseInit {
  return {
    headers: { 'content-type': 'application/json' },
  }
}

function csrfResponse() {
  return new Response(
    JSON.stringify({ token: 'csrf-token', headerName: 'X-XSRF-TOKEN' }),
    jsonResponseInit(),
  )
}

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>()

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response)
  }

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

function getRequestHeader(
  fetchMock: ReturnType<typeof mockFetch>,
  callNumber: number,
  name: string,
) {
  return new Headers(fetchMock.mock.calls[callNumber - 1]?.[1]?.headers).get(
    name,
  )
}
