import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { ApiError, apiClient, AuthSessionExpiredError } from '@/lib/api/client'

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

  await expect(
    apiClient('/auth/login', { method: 'POST' }),
  ).rejects.toMatchObject({
    body: { message: 'Invalid token' },
    message: 'Invalid token',
    status: 401,
  } satisfies Partial<ApiError>)
})

it('refreshes the auth session and retries once after 401 responses', async () => {
  const fetchMock = mockFetch(
    new Response(JSON.stringify({ message: 'Expired' }), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
    new Response(
      JSON.stringify({ message: 'Token refreshed' }),
      jsonResponseInit(),
    ),
    new Response(JSON.stringify({ nickname: 'orb-user' }), jsonResponseInit()),
  )

  await expect(apiClient('/users/me')).resolves.toEqual({
    nickname: 'orb-user',
  })
  expect(fetchMock).toHaveBeenNthCalledWith(
    1,
    'http://localhost:8080/users/me',
    expect.objectContaining({ credentials: 'include' }),
  )
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    'http://localhost:8080/auth/refresh',
    expect.objectContaining({ credentials: 'include', method: 'POST' }),
  )
  expect(fetchMock).toHaveBeenNthCalledWith(
    3,
    'http://localhost:8080/users/me',
    expect.objectContaining({ credentials: 'include' }),
  )
})

it('throws AuthSessionExpiredError when refresh fails', async () => {
  mockFetch(
    new Response(JSON.stringify({ message: 'Expired' }), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
    new Response(JSON.stringify({ message: 'Refresh expired' }), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
  )

  await expect(apiClient('/users/me')).rejects.toBeInstanceOf(
    AuthSessionExpiredError,
  )
})

it('throws AuthSessionExpiredError when refresh cannot be requested', async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Expired' }), {
        ...jsonResponseInit(),
        status: 401,
        statusText: 'Unauthorized',
      }),
    )
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))

  vi.stubGlobal('fetch', fetchMock)

  await expect(apiClient('/users/me')).rejects.toBeInstanceOf(
    AuthSessionExpiredError,
  )
})

it('shares one refresh request across concurrent 401 responses', async () => {
  let usersMeRequests = 0
  const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
    const url = getRequestUrl(input)

    if (url.endsWith('/auth/refresh')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ message: 'Token refreshed' }),
          jsonResponseInit(),
        ),
      )
    }

    usersMeRequests += 1

    if (usersMeRequests <= 3) {
      return Promise.resolve(
        new Response(JSON.stringify({ message: 'Expired' }), {
          ...jsonResponseInit(),
          status: 401,
          statusText: 'Unauthorized',
        }),
      )
    }

    return Promise.resolve(
      new Response(
        JSON.stringify({ nickname: 'orb-user' }),
        jsonResponseInit(),
      ),
    )
  })

  vi.stubGlobal('fetch', fetchMock)

  await expect(
    Promise.all([
      apiClient('/users/me'),
      apiClient('/users/me'),
      apiClient('/users/me'),
    ]),
  ).resolves.toEqual([
    { nickname: 'orb-user' },
    { nickname: 'orb-user' },
    { nickname: 'orb-user' },
  ])
  expect(
    fetchMock.mock.calls.filter(([url]) =>
      getRequestUrl(url).endsWith('/auth/refresh'),
    ),
  ).toHaveLength(1)
})

it.each(['/auth/login', '/auth/register', '/auth/refresh'])(
  'does not refresh %s 401 responses',
  async (path) => {
    const fetchMock = mockFetch(
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        ...jsonResponseInit(),
        status: 401,
        statusText: 'Unauthorized',
      }),
    )

    await expect(apiClient(path, { method: 'POST' })).rejects.toBeInstanceOf(
      ApiError,
    )
    expect(fetchMock).toHaveBeenCalledOnce()
  },
)

it('refreshes and retries logout 401 responses', async () => {
  const fetchMock = mockFetch(
    new Response(JSON.stringify({ message: 'Expired' }), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
    new Response(
      JSON.stringify({ message: 'Token refreshed' }),
      jsonResponseInit(),
    ),
    new Response(JSON.stringify({ message: 'Logged out' }), jsonResponseInit()),
  )

  await expect(apiClient('/auth/logout', { method: 'POST' })).resolves.toEqual({
    message: 'Logged out',
  })
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    'http://localhost:8080/auth/refresh',
    expect.objectContaining({ credentials: 'include', method: 'POST' }),
  )
})

it('does not refresh more than once for the same request', async () => {
  mockFetch(
    new Response(JSON.stringify({ message: 'Expired' }), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
    new Response(
      JSON.stringify({ message: 'Token refreshed' }),
      jsonResponseInit(),
    ),
    new Response(JSON.stringify({ message: 'Still expired' }), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
  )

  await expect(apiClient('/users/me')).rejects.toMatchObject({
    message: 'Still expired',
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

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>()

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response)
  }

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

function getRequestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') {
    return input
  }

  if (input instanceof URL) {
    return input.toString()
  }

  return input.url
}
