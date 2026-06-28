import { afterEach, expect, it, vi } from 'vitest'

import { loginAccount, registerAccount } from '@/lib/api/auth'

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
      body: JSON.stringify(request),
    }),
  )

  const requestInit = fetchMock.mock.calls[0]?.[1]
  const headers = requestInit?.headers

  expect(headers).toBeInstanceOf(Headers)
  expect((headers as Headers).get('Content-Type')).toBe('application/json')
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
