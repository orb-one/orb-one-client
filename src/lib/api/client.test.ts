import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { ApiError, apiClient } from '@/lib/api/client'

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('parses json responses', async () => {
  mockFetch(new Response(JSON.stringify({ name: 'Orb' }), jsonResponseInit()))

  await expect(apiClient<{ name: string }>('/users/1')).resolves.toEqual({
    name: 'Orb',
  })
})

it('returns undefined for empty success responses', async () => {
  mockFetch(new Response(null, { status: 204 }))

  await expect(apiClient('/users/1')).resolves.toBeUndefined()
})

it('returns text for non-json responses', async () => {
  mockFetch(
    new Response('accepted', {
      headers: { 'content-type': 'text/plain' },
      status: 202,
    }),
  )

  await expect(apiClient<string>('/jobs/1')).resolves.toBe('accepted')
})

it('includes credentials in API requests', async () => {
  const fetchMock = mockFetch(new Response('{}', jsonResponseInit()))

  await apiClient('/users/me')

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/users/me',
    expect.objectContaining({
      credentials: 'include',
    }),
  )
})

it('throws ApiError with parsed response body', async () => {
  mockFetch(
    new Response(JSON.stringify({ message: 'Invalid token' }), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
  )

  await expect(apiClient('/me')).rejects.toMatchObject({
    body: { message: 'Invalid token' },
    message: 'Invalid token',
    status: 401,
  } satisfies Partial<ApiError>)
})

it('preserves api path prefixes when joining urls', async () => {
  const fetchMock = mockFetch(new Response('{}', jsonResponseInit()))

  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000/api')

  await apiClient('users')

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:3000/api/users',
    expect.any(Object),
  )
})

it('rejects absolute urls', async () => {
  const fetchMock = mockFetch(new Response('{}', jsonResponseInit()))

  await expect(apiClient('https://example.com/users')).rejects.toThrow(
    'apiClient only accepts relative paths',
  )
  expect(fetchMock).not.toHaveBeenCalled()
})

it('requires an api base url environment variable', async () => {
  const fetchMock = mockFetch(new Response('{}', jsonResponseInit()))

  vi.stubEnv('VITE_API_BASE_URL', '')

  await expect(apiClient('/users')).rejects.toThrow(
    'VITE_API_BASE_URL is required',
  )
  expect(fetchMock).not.toHaveBeenCalled()
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
