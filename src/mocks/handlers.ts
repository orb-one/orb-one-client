import { http, HttpResponse, passthrough } from 'msw'

import {
  consumeMockLogoutFailure,
  failNextMockLogout,
  getCurrentMockUser,
} from '@/mocks/auth-session'
import { solutionHandlers } from '@/mocks/solution-handlers'

export const handlers = [
  ...solutionHandlers,
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
]
