import type { LoginRequest, RegisterRequest } from '@/lib/api/auth'

// 실제 auth API 성공 이후에만 MSW 세션을 맞추는 dev-only bridge.
// MSW가 꺼져 있거나 production build에서는 아무 작업도 하지 않는다.
export async function rememberMockRegisteredUser(request: RegisterRequest) {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true') {
    const { rememberRegisteredUser } = await import('@/mocks/auth-session')

    rememberRegisteredUser(request)
  }
}

export async function signInMockUser(request: LoginRequest) {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true') {
    const { signInMockUser: signIn } = await import('@/mocks/auth-session')

    signIn(request)
  }
}

export async function signOutMockUser() {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true') {
    const { signOutMockUser: signOut } = await import('@/mocks/auth-session')

    signOut()
  }
}
