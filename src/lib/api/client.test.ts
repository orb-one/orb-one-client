import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { ApiError as ApiErrorType } from '@/lib/api/client'
import { isRateLimitError } from '@/lib/api/errors'

let ApiError: typeof import('@/lib/api/client').ApiError
let apiClient: typeof import('@/lib/api/client').apiClient
let AuthSessionExpiredError: typeof import('@/lib/api/client').AuthSessionExpiredError

beforeEach(async () => {
  vi.resetModules()
  const client = await import('@/lib/api/client')

  ApiError = client.ApiError
  apiClient = client.apiClient
  AuthSessionExpiredError = client.AuthSessionExpiredError
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

it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
  'adds the CSRF token to %s requests',
  async (method) => {
    const fetchMock = mockFetch(
      csrfResponse(),
      new Response('{}', jsonResponseInit()),
    )

    await apiClient('/users/me', { method })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8080/auth/csrf',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(getRequestHeader(fetchMock, 2, 'X-XSRF-TOKEN')).toBe('csrf-token')
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8080/users/me',
      expect.objectContaining({ credentials: 'include', method }),
    )
  },
)

it.each(['GET', 'HEAD', 'OPTIONS', 'TRACE'])(
  'does not request a CSRF token for %s requests',
  async (method) => {
    const fetchMock = mockFetch(new Response('{}', jsonResponseInit()))

    await apiClient('/users/me', { method })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(getRequestHeader(fetchMock, 1, 'X-XSRF-TOKEN')).toBeNull()
  },
)

it('overwrites caller-provided CSRF headers', async () => {
  const fetchMock = mockFetch(
    csrfResponse(),
    new Response('{}', jsonResponseInit()),
  )

  await apiClient('/users/me', {
    method: 'PATCH',
    headers: { 'X-XSRF-TOKEN': 'caller-token' },
  })

  expect(getRequestHeader(fetchMock, 2, 'X-XSRF-TOKEN')).toBe('csrf-token')
})

it('shares one CSRF token request across concurrent unsafe requests', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
    if (getRequestUrl(input).endsWith('/auth/csrf')) {
      return Promise.resolve(csrfResponse())
    }

    return Promise.resolve(new Response('{}', jsonResponseInit()))
  })
  vi.stubGlobal('fetch', fetchMock)

  await Promise.all([
    apiClient('/groups', { method: 'POST' }),
    apiClient('/solutions/1', { method: 'PUT' }),
  ])

  expect(
    fetchMock.mock.calls.filter(([input]) =>
      getRequestUrl(input).endsWith('/auth/csrf'),
    ),
  ).toHaveLength(1)
})

it('does not send unsafe requests when the CSRF response is invalid', async () => {
  const fetchMock = mockFetch(
    new Response(
      JSON.stringify({ token: '', headerName: 'X-XSRF-TOKEN' }),
      jsonResponseInit(),
    ),
  )

  await expect(apiClient('/groups', { method: 'POST' })).rejects.toThrow(
    'Invalid CSRF token response',
  )
  expect(fetchMock).toHaveBeenCalledOnce()
})

it('does not fall back when the CSRF endpoint fails', async () => {
  const fetchMock = mockFetch(
    new Response(JSON.stringify({ message: 'CSRF unavailable' }), {
      ...jsonResponseInit(),
      status: 503,
      statusText: 'Service Unavailable',
    }),
  )

  await expect(apiClient('/groups', { method: 'POST' })).rejects.toBeInstanceOf(
    ApiError,
  )
  expect(fetchMock).toHaveBeenCalledOnce()
})

it('requests a fresh CSRF token after a previous token request fails', async () => {
  const fetchMock = mockFetch(
    new Response(JSON.stringify({ message: 'CSRF unavailable' }), {
      ...jsonResponseInit(),
      status: 503,
      statusText: 'Service Unavailable',
    }),
    csrfResponse('recovered-csrf-token'),
    new Response('{}', jsonResponseInit()),
  )

  await expect(apiClient('/groups', { method: 'POST' })).rejects.toMatchObject({
    status: 503,
  } satisfies Partial<ApiErrorType>)
  await expect(apiClient('/groups', { method: 'POST' })).resolves.toEqual({})

  expect(fetchMock).toHaveBeenCalledTimes(3)
  expect(getRequestHeader(fetchMock, 3, 'X-XSRF-TOKEN')).toBe(
    'recovered-csrf-token',
  )
})

it('does not retry forbidden unsafe requests and fetches a fresh token next time', async () => {
  const fetchMock = mockFetch(
    csrfResponse('forbidden-csrf-token'),
    new Response(JSON.stringify({ message: 'Forbidden' }), {
      ...jsonResponseInit(),
      status: 403,
      statusText: 'Forbidden',
    }),
    csrfResponse('next-csrf-token'),
    new Response('{}', jsonResponseInit()),
  )

  await expect(apiClient('/groups', { method: 'POST' })).rejects.toMatchObject({
    status: 403,
  } satisfies Partial<ApiErrorType>)
  expect(fetchMock).toHaveBeenCalledTimes(2)

  await expect(apiClient('/groups', { method: 'POST' })).resolves.toEqual({})
  expect(fetchMock).toHaveBeenCalledTimes(4)
  expect(getRequestHeader(fetchMock, 2, 'X-XSRF-TOKEN')).toBe(
    'forbidden-csrf-token',
  )
  expect(getRequestHeader(fetchMock, 4, 'X-XSRF-TOKEN')).toBe('next-csrf-token')
})

it('requests a fresh CSRF token for each sequential unsafe request', async () => {
  const fetchMock = mockFetch(
    csrfResponse('register-csrf-token'),
    new Response(
      JSON.stringify({ message: 'Registration successful' }),
      jsonResponseInit(),
    ),
    csrfResponse('login-csrf-token'),
    new Response(
      JSON.stringify({ message: 'Login successful' }),
      jsonResponseInit(),
    ),
  )

  await apiClient('/auth/register', { method: 'POST' })
  await apiClient('/auth/login', { method: 'POST' })

  expect(getRequestHeader(fetchMock, 2, 'X-XSRF-TOKEN')).toBe(
    'register-csrf-token',
  )
  expect(getRequestHeader(fetchMock, 4, 'X-XSRF-TOKEN')).toBe(
    'login-csrf-token',
  )
})

it('throws ApiError with parsed response body', async () => {
  const body = {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid token',
    timestamp: '2026-07-12T00:00:00Z',
  }

  mockFetch(
    csrfResponse(),
    new Response(JSON.stringify(body), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
  )

  await expect(
    apiClient('/auth/login', { method: 'POST' }),
  ).rejects.toMatchObject({
    body,
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid token',
    status: 401,
  } satisfies Partial<ApiErrorType>)
})

it('does not expose unrecognized server error codes', async () => {
  mockFetch(
    new Response(
      JSON.stringify({
        code: 'FUTURE_ERROR',
        message: 'Future server error',
        timestamp: '2026-07-12T00:00:00Z',
      }),
      {
        ...jsonResponseInit(),
        status: 400,
      },
    ),
  )

  await expect(apiClient('/auth/login')).rejects.toMatchObject({
    code: undefined,
    message: 'Future server error',
  } satisfies Partial<ApiErrorType>)
})

it('preserves the status needed to recognize bodyless rate limit responses', async () => {
  mockFetch(
    new Response(null, {
      status: 429,
      statusText: 'Too Many Requests',
    }),
  )

  const error = await apiClient('/users/me').catch((caught: unknown) => caught)

  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ status: 429, code: undefined })
  expect(isRateLimitError(error)).toBe(true)
})

it('refreshes the auth session and retries once after 401 responses', async () => {
  const fetchMock = mockFetch(
    new Response(JSON.stringify({ message: 'Expired' }), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
    csrfResponse(),
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
    'http://localhost:8080/auth/csrf',
    expect.objectContaining({ credentials: 'include' }),
  )
  expect(fetchMock).toHaveBeenNthCalledWith(
    3,
    'http://localhost:8080/auth/refresh',
    expect.objectContaining({ credentials: 'include', method: 'POST' }),
  )
  expect(getRequestHeader(fetchMock, 3, 'X-XSRF-TOKEN')).toBe('csrf-token')
  expect(fetchMock).toHaveBeenNthCalledWith(
    4,
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
    csrfResponse(),
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

it('preserves network errors when refresh cannot be requested', async () => {
  const networkError = new TypeError('Failed to fetch')
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Expired' }), {
        ...jsonResponseInit(),
        status: 401,
        statusText: 'Unauthorized',
      }),
    )
    .mockResolvedValueOnce(csrfResponse())
    .mockRejectedValueOnce(networkError)

  vi.stubGlobal('fetch', fetchMock)

  await expect(apiClient('/users/me')).rejects.toBe(networkError)
})

it('preserves CSRF endpoint errors while preparing a refresh request', async () => {
  const fetchMock = mockFetch(
    new Response(JSON.stringify({ message: 'Expired' }), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
    new Response(JSON.stringify({ message: 'CSRF unavailable' }), {
      ...jsonResponseInit(),
      status: 503,
      statusText: 'Service Unavailable',
    }),
  )

  await expect(apiClient('/users/me')).rejects.toMatchObject({
    message: 'CSRF unavailable',
    status: 503,
  } satisfies Partial<ApiErrorType>)
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('preserves invalid CSRF responses while preparing a refresh request', async () => {
  const fetchMock = mockFetch(
    new Response(JSON.stringify({ message: 'Expired' }), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
    new Response(
      JSON.stringify({ token: '', headerName: 'X-XSRF-TOKEN' }),
      jsonResponseInit(),
    ),
  )

  await expect(apiClient('/users/me')).rejects.toThrow(
    'Invalid CSRF token response',
  )
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it.each([403, 429, 500])(
  'preserves refresh endpoint %s errors',
  async (status) => {
    const fetchMock = mockFetch(
      new Response(JSON.stringify({ message: 'Expired' }), {
        ...jsonResponseInit(),
        status: 401,
        statusText: 'Unauthorized',
      }),
      csrfResponse(),
      new Response(JSON.stringify({ message: 'Refresh failed' }), {
        ...jsonResponseInit(),
        status,
      }),
    )

    await expect(apiClient('/users/me')).rejects.toMatchObject({
      message: 'Refresh failed',
      status,
    } satisfies Partial<ApiErrorType>)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  },
)

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

    if (url.endsWith('/auth/csrf')) {
      return Promise.resolve(csrfResponse())
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

it.each(['/auth/login', '/auth/register'])(
  'does not refresh %s 401 responses',
  async (path) => {
    const fetchMock = mockFetch(
      csrfResponse(),
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        ...jsonResponseInit(),
        status: 401,
        statusText: 'Unauthorized',
      }),
    )

    await expect(apiClient(path, { method: 'POST' })).rejects.toBeInstanceOf(
      ApiError,
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  },
)

it('treats direct refresh 401 responses as an expired auth session', async () => {
  const fetchMock = mockFetch(
    csrfResponse(),
    new Response(JSON.stringify({ message: 'Refresh expired' }), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
  )

  await expect(
    apiClient('/auth/refresh', { method: 'POST' }),
  ).rejects.toBeInstanceOf(AuthSessionExpiredError)
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('refreshes and retries logout 401 responses', async () => {
  const fetchMock = mockFetch(
    csrfResponse('logout-csrf-token'),
    new Response(JSON.stringify({ message: 'Expired' }), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
    csrfResponse('refresh-csrf-token'),
    new Response(
      JSON.stringify({ message: 'Token refreshed' }),
      jsonResponseInit(),
    ),
    csrfResponse('retried-logout-csrf-token'),
    new Response(JSON.stringify({ message: 'Logged out' }), jsonResponseInit()),
  )

  await expect(apiClient('/auth/logout', { method: 'POST' })).resolves.toEqual({
    message: 'Logged out',
  })
  expect(fetchMock).toHaveBeenNthCalledWith(
    4,
    'http://localhost:8080/auth/refresh',
    expect.objectContaining({ credentials: 'include', method: 'POST' }),
  )
  expect(getRequestHeader(fetchMock, 2, 'X-XSRF-TOKEN')).toBe(
    'logout-csrf-token',
  )
  expect(getRequestHeader(fetchMock, 4, 'X-XSRF-TOKEN')).toBe(
    'refresh-csrf-token',
  )
  expect(getRequestHeader(fetchMock, 6, 'X-XSRF-TOKEN')).toBe(
    'retried-logout-csrf-token',
  )
})

it('does not refresh more than once for the same request', async () => {
  mockFetch(
    new Response(JSON.stringify({ message: 'Expired' }), {
      ...jsonResponseInit(),
      status: 401,
      statusText: 'Unauthorized',
    }),
    csrfResponse(),
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
  } satisfies Partial<ApiErrorType>)
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

function csrfResponse(token = 'csrf-token') {
  return new Response(
    JSON.stringify({ token, headerName: 'X-XSRF-TOKEN' }),
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
  const requestInit = fetchMock.mock.calls[callNumber - 1]?.[1]

  return new Headers(requestInit?.headers).get(name)
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
