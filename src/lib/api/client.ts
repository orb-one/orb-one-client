const DEFAULT_API_BASE_URL = 'http://localhost:3000'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly response: Response
  readonly body: unknown

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
  }
}

export async function apiClient<TResponse = unknown>(
  path: string,
  { body, headers, ...options }: RequestOptions = {},
): Promise<TResponse> {
  const requestHeaders = new Headers(headers)

  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  const requestInit: RequestInit = {
    ...options,
    headers: requestHeaders,
  }

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body)
  }

  const response = await fetch(buildApiUrl(path), requestInit)
  const responseBody = await parseResponseBody(response)

  if (!response.ok) {
    throw new ApiError(
      getApiErrorMessage(responseBody, response),
      response.status,
      response,
      responseBody,
    )
  }

  return responseBody as TResponse
}

function buildApiUrl(path: string) {
  if (isAbsoluteUrl(path)) {
    // 공통 헤더가 외부 도메인으로 나가지 않도록 상대 경로만 허용
    throw new TypeError('apiClient only accepts relative paths')
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL

  // `users`, `/users` 모두 base URL의 `/api` 같은 경로 보존
  return new URL(
    stripLeadingSlashes(path),
    ensureTrailingSlash(baseUrl),
  ).toString()
}

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

function isJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  // `application/problem+json` 같은 vendor JSON content type도 허용
  return (
    contentType.includes('application/json') || contentType.includes('+json')
  )
}

function isAbsoluteUrl(path: string) {
  return /^[a-z][a-z\d+\-.]*:/i.test(path)
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

function stripLeadingSlashes(value: string) {
  return value.replace(/^\/+/, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
