import { apiClient } from '@/lib/api/client'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  nickname: string
}

export interface MessageResponse {
  message: string
}

export interface CurrentUserResponse {
  id: string
  email: string
  nickname: string
}

// route에서 auth API path와 request shape 직접 관리 방지
export function loginAccount(request: LoginRequest) {
  return apiClient<MessageResponse>('/auth/login', {
    method: 'POST',
    body: request,
  })
}

export function registerAccount(request: RegisterRequest) {
  return apiClient<MessageResponse>('/auth/register', {
    method: 'POST',
    body: request,
  })
}

export function refreshSession() {
  return apiClient<MessageResponse>('/auth/refresh', {
    method: 'POST',
  })
}

export function logoutAccount() {
  return apiClient<MessageResponse>('/auth/logout', {
    method: 'POST',
  })
}

export function getCurrentUser(signal?: AbortSignal) {
  return apiClient<CurrentUserResponse>(
    '/users/me',
    signal ? { signal } : undefined,
  )
}
