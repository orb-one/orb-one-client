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
