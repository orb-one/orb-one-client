import type { CurrentUserResponse } from '@/lib/api/auth'

interface RegisterBody {
  email: string
  nickname: string
}

interface LoginBody {
  email: string
}

const fallbackUser: CurrentUserResponse = {
  id:
    import.meta.env.VITE_MSW_USER_ID ?? '00000000-0000-4000-8000-000000000001',
  email: import.meta.env.VITE_MSW_USER_EMAIL ?? 'dev-user@example.com',
  nickname: import.meta.env.VITE_MSW_USER_NICKNAME ?? 'dev-user',
}

// /users/me 서버 구현 전까지 방금 가입한 사용자의 표시 정보만 보관한다.
// password/token은 저장하지 않고, browser memory에만 유지된다.
const usersByEmail = new Map<string, CurrentUserResponse>()

let currentUser: CurrentUserResponse | null = null
let shouldFailNextLogout = false

export function getCurrentMockUser() {
  return currentUser
}

export function rememberRegisteredUser(body: unknown) {
  if (!isRegisterBody(body)) {
    return
  }

  usersByEmail.set(body.email, {
    id: crypto.randomUUID(),
    email: body.email,
    nickname: body.nickname,
  })
}

export function signInMockUser(body: unknown) {
  if (!isLoginBody(body)) {
    currentUser = fallbackUser
    return
  }

  currentUser = usersByEmail.get(body.email) ?? {
    ...fallbackUser,
    email: body.email,
  }
}

export function signOutMockUser() {
  currentUser = null
}

export function updateMockUserNickname(body: unknown) {
  if (!currentUser || !isNicknameUpdateBody(body)) {
    return null
  }

  currentUser = {
    ...currentUser,
    nickname: body.nickname,
  }
  usersByEmail.set(currentUser.email, currentUser)

  return currentUser
}

export function failNextMockLogout() {
  shouldFailNextLogout = true
}

export function consumeMockLogoutFailure() {
  const shouldFail = shouldFailNextLogout

  shouldFailNextLogout = false

  return shouldFail
}

function isRegisterBody(value: unknown): value is RegisterBody {
  return (
    isRecord(value) &&
    typeof value.email === 'string' &&
    typeof value.nickname === 'string'
  )
}

function isLoginBody(value: unknown): value is LoginBody {
  return isRecord(value) && typeof value.email === 'string'
}

function isNicknameUpdateBody(value: unknown): value is { nickname: string } {
  return (
    isRecord(value) &&
    typeof value.nickname === 'string' &&
    value.nickname.trim().length > 0 &&
    value.nickname.length <= 50
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
