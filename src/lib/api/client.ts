import { parseApiErrorResponse, type ApiErrorCode } from '@/lib/api/errors'

type RequestOptions = Omit<RequestInit, 'body' | 'credentials'> & {
  body?: unknown
}

interface ApiResponseResult {
  response: Response
  body: unknown
}

const CSRF_HEADER_NAME = 'X-XSRF-TOKEN'
const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE'])

let refreshPromise: Promise<void> | null = null
let csrfTokenPromise: Promise<string> | null = null

/** API 오류 응답과 파싱된 본문을 함께 제공하는 오류입니다. */
export class ApiError extends Error {
  readonly status: number
  readonly response: Response
  readonly body: unknown
  readonly code: ApiErrorCode | undefined

  constructor(
    message: string,
    status: number,
    response: Response,
    body: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.response = response
    this.body = body
    this.code = parseApiErrorResponse(body)?.code
  }
}

/** Refresh Token으로도 인증 세션을 복구할 수 없을 때 발생하는 오류입니다. */
export class AuthSessionExpiredError extends Error {
  constructor() {
    super('Auth session expired')
    this.name = 'AuthSessionExpiredError'
  }
}

/**
 * 상대 API 경로로 요청하고 응답 본문을 반환합니다.
 * 인증 만료 시 세션을 한 번 갱신한 뒤 원래 요청을 재시도합니다.
 */
export async function apiClient<TResponse = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const result = await sendApiRequest(path, options)

  if (result.response.ok) {
    return result.body as TResponse
  }

  if (result.response.status === 401 && isAuthRefreshPath(path)) {
    throw new AuthSessionExpiredError()
  }

  if (result.response.status === 401 && shouldAttemptAuthRefresh(path)) {
    await refreshAuthSession()

    const retryResult = await sendApiRequest(path, options)

    if (retryResult.response.ok) {
      return retryResult.body as TResponse
    }

    throw createApiError(retryResult)
  }

  throw createApiError(result)
}

/**
 * 실제 API 요청을 구성하고 응답 본문을 파싱합니다.
 * 안전하지 않은 HTTP 메서드에는 서버에서 받은 CSRF Token을 추가합니다.
 */
async function sendApiRequest(
  path: string,
  { body, headers, ...options }: RequestOptions,
): Promise<ApiResponseResult> {
  const url = buildApiUrl(path)
  const method = (options.method ?? 'GET').toUpperCase()
  const requestHeaders = new Headers(headers)

  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (!SAFE_HTTP_METHODS.has(method)) {
    requestHeaders.set(CSRF_HEADER_NAME, await getCsrfToken())
  }

  const requestInit: RequestInit = {
    ...options,
    credentials: 'include',
    headers: requestHeaders,
  }

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body)
  }

  const response = await fetch(url, requestInit)
  const responseBody = await parseResponseBody(response)

  return {
    response,
    body: responseBody,
  }
}

/** API base URL을 기준으로 외부 origin을 허용하지 않는 요청 URL을 만듭니다. */
function buildApiUrl(path: string) {
  if (isAbsoluteUrl(path)) {
    // 공통 헤더가 외부 도메인으로 나가지 않도록 상대 경로만 허용
    throw new TypeError('apiClient only accepts relative paths')
  }

  const baseUrl = getApiBaseUrl()

  // `users`, `/users` 모두 base URL의 `/api` 같은 경로 보존
  return new URL(
    stripLeadingSlashes(path),
    ensureTrailingSlash(baseUrl),
  ).toString()
}

/** 빌드 환경에서 필수 API base URL을 읽습니다. */
function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL

  if (!baseUrl) {
    throw new TypeError('VITE_API_BASE_URL is required')
  }

  return baseUrl
}

/** 401 응답 후 자동 인증 갱신을 시도할 수 있는 경로인지 판단합니다. */
function shouldAttemptAuthRefresh(path: string) {
  const normalizedPath = normalizeApiPath(path)

  return !['auth/login', 'auth/register', 'auth/refresh'].includes(
    normalizedPath,
  )
}

/** 요청 경로가 인증 갱신 endpoint인지 판단합니다. */
function isAuthRefreshPath(path: string) {
  return normalizeApiPath(path) === 'auth/refresh'
}

/** 비교 가능한 형태가 되도록 API 경로의 선행 slash와 query, hash를 제거합니다. */
function normalizeApiPath(path: string) {
  return stripLeadingSlashes(path).replace(/[?#].*$/, '')
}

/** 동시에 발생한 인증 갱신 요청이 하나의 Promise를 공유하도록 조정합니다. */
async function refreshAuthSession() {
  refreshPromise ??= requestAuthRefresh().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

/** CSRF 보호가 적용된 refresh 요청으로 인증 Cookie를 재발급합니다. */
async function requestAuthRefresh() {
  const result = await sendApiRequest('/auth/refresh', {
    method: 'POST',
  })

  if (result.response.ok) {
    return
  }

  if (result.response.status === 401) {
    throw new AuthSessionExpiredError()
  }

  throw createApiError(result)
}

/** 동시에 필요한 CSRF Token 요청이 하나의 Promise를 공유하도록 조정합니다. */
async function getCsrfToken() {
  csrfTokenPromise ??= requestCsrfToken().finally(() => {
    csrfTokenPromise = null
  })

  return csrfTokenPromise
}

/** CSRF endpoint에서 Token을 가져오고 응답 계약을 검증합니다. */
async function requestCsrfToken() {
  const response = await fetch(buildApiUrl('/auth/csrf'), {
    credentials: 'include',
  })
  const body = await parseResponseBody(response)

  if (!response.ok) {
    throw createApiError({ response, body })
  }

  if (
    !isRecord(body) ||
    typeof body.token !== 'string' ||
    body.token.length === 0 ||
    body.headerName !== CSRF_HEADER_NAME
  ) {
    throw new TypeError('Invalid CSRF token response')
  }

  return body.token
}

/** 실패한 API 응답을 호출자가 처리할 수 있는 ApiError로 변환합니다. */
function createApiError({ response, body }: ApiResponseResult) {
  return new ApiError(
    getApiErrorMessage(body, response),
    response.status,
    response,
    body,
  )
}

/** 상태 코드와 Content-Type에 맞춰 응답 본문을 안전하게 파싱합니다. */
async function parseResponseBody(response: Response): Promise<unknown> {
  // 본문이 없는 HTTP 상태 코드
  if (response.status === 204 || response.status === 205) {
    return undefined
  }

  // 빈 본문, JSON, 일반 텍스트를 나눠 처리하기 위해 text로 먼저 읽음
  const text = await response.text()

  if (text.length === 0) {
    return undefined
  }

  if (isJsonResponse(response)) {
    return JSON.parse(text) as unknown
  }

  return text
}

/** 파싱된 본문에서 사용자에게 전달할 API 오류 메시지를 선택합니다. */
function getApiErrorMessage(body: unknown, response: Response) {
  // API 에러의 `message`, `error` 우선 사용
  if (isRecord(body)) {
    if (typeof body.message === 'string') {
      return body.message
    }

    if (typeof body.error === 'string') {
      return body.error
    }
  }

  if (typeof body === 'string' && body.trim().length > 0) {
    return body
  }

  return response.statusText || `HTTP ${String(response.status)}`
}

/** 응답 Content-Type이 표준 또는 vendor JSON 형식인지 판단합니다. */
function isJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  // `application/problem+json` 같은 vendor JSON content type도 허용
  return (
    contentType.includes('application/json') || contentType.includes('+json')
  )
}

/** 경로가 scheme을 포함한 절대 URL인지 판단합니다. */
function isAbsoluteUrl(path: string) {
  return /^[a-z][a-z\d+\-.]*:/i.test(path)
}

/** URL 결합 시 base 경로가 보존되도록 마지막 slash를 보장합니다. */
function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

/** API 경로 앞에 붙은 slash를 제거합니다. */
function stripLeadingSlashes(value: string) {
  return value.replace(/^\/+/, '')
}

/** 값을 문자열 key로 조회할 수 있는 객체로 좁힙니다. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
