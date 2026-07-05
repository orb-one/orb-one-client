import { afterEach, expect, it, vi } from 'vitest'

import {
  getCurrentUser,
  loginAccount,
  logoutAccount,
  refreshSession,
  registerAccount,
} from '@/lib/api/auth'

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
    new Response(JSON.stringify(response), jsonResponseInit()),
  )

  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')

  await expect(registerAccount(request)).resolves.toEqual(response)

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/auth/register',
    expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    }),
  )

  const requestInit = fetchMock.mock.calls[0]?.[1]
  const headers = requestInit?.headers

  expect(headers).toBeInstanceOf(Headers)
  expect((headers as Headers).get('Content-Type')).toBe('application/json')
})

it('posts login requests to the auth API', async () => {
  const response = { message: 'Login successful' }
  const request = {
    email: 'user@example.com',
    password: 'password123!',
  }
  const fetchMock = mockFetch(
    new Response(JSON.stringify(response), jsonResponseInit()),
  )

  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')

  await expect(loginAccount(request)).resolves.toEqual(response)

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/auth/login',
    expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    }),
  )

  const requestInit = fetchMock.mock.calls[0]?.[1]
  const headers = requestInit?.headers

  expect(headers).toBeInstanceOf(Headers)
  expect((headers as Headers).get('Content-Type')).toBe('application/json')
})

it('posts refresh requests to the auth API', async () => {
  const response = { message: 'Token refreshed' }
  const fetchMock = mockFetch(
    new Response(JSON.stringify(response), jsonResponseInit()),
  )

  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')

  await expect(refreshSession()).resolves.toEqual(response)

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/auth/refresh',
    expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }),
  )
})

it('posts logout requests to the auth API', async () => {
  const response = { message: 'Logout successful' }
  const fetchMock = mockFetch(
    new Response(JSON.stringify(response), jsonResponseInit()),
  )

  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')

  await expect(logoutAccount()).resolves.toEqual(response)

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/auth/logout',
    expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }),
  )
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

  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')

  await expect(getCurrentUser()).resolves.toEqual(response)

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/users/me',
    expect.objectContaining({
      credentials: 'include',
    }),
  )
})

function jsonResponseInit(): ResponseInit {
  return {
    headers: { 'content-type': 'application/json' },
  }
}

function mockFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response)

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}
