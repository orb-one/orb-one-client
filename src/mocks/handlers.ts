import { http, HttpResponse, passthrough } from 'msw'

import {
  consumeMockLogoutFailure,
  failNextMockLogout,
  getCurrentMockUser,
  updateMockUserNickname,
} from '@/mocks/auth-session'
import { problemHandlers } from '@/mocks/problem-handlers'
import { solutionHandlers } from '@/mocks/solution-handlers'
import { groupHandlers } from '@/mocks/groups-handlers'
import { problemSetHandlers } from '@/mocks/problem-sets-handlers'

export const handlers = [
  ...problemHandlers,
  ...solutionHandlers,
  ...groupHandlers,
  ...problemSetHandlers,
  http.get('*/auth/csrf', () =>
    HttpResponse.json({
      token: 'mock-csrf-token',
      headerName: 'X-XSRF-TOKEN',
    }),
  ),
  http.post('*/__msw/auth/logout-failure', () => {
    // Playwright route는 Service Worker가 제어하는 요청을 가로채기 어렵기 때문에,
    // E2E에서 다음 logout 요청만 실패시키는 테스트 전용 control endpoint를 둔다.
    failNextMockLogout()

    return HttpResponse.json({ ok: true })
  }),
  http.post('*/auth/logout', () => {
    if (consumeMockLogoutFailure()) {
      return HttpResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 },
      )
    }

    return passthrough()
  }),
  http.get('*/users/me', () => {
    const currentUser = getCurrentMockUser()

    if (!currentUser) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    return HttpResponse.json(currentUser)
  }),
  http.patch('*/users/me', async ({ request }) => {
    if (!getCurrentMockUser()) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const updatedUser = updateMockUserNickname(await request.json())

    if (!updatedUser) {
      return HttpResponse.json(
        {
          code: 'INVALID_FIELD',
          message: '요청 값이 올바르지 않습니다.',
          timestamp: new Date().toISOString(),
          fieldErrors: [{ field: 'nickname', reason: 'INVALID_VALUE' }],
        },
        { status: 400 },
      )
    }

    return HttpResponse.json(updatedUser)
  }),
  http.patch('*/users/me/password', async ({ request }) => {
    if (!getCurrentMockUser()) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!isPasswordChangeBody(body)) {
      return HttpResponse.json(
        {
          code: 'INVALID_FIELD',
          message: '요청 값이 올바르지 않습니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    return HttpResponse.json({ message: 'Password changed successfully' })
  }),
]

function isPasswordChangeBody(value: unknown): value is {
  currentPassword: string
  newPassword: string
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'currentPassword' in value &&
    typeof value.currentPassword === 'string' &&
    value.currentPassword.trim().length > 0 &&
    'newPassword' in value &&
    typeof value.newPassword === 'string' &&
    value.newPassword.trim().length > 0 &&
    value.newPassword.length >= 8
  )
}
