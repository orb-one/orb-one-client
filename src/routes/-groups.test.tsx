import { LayerProvider } from '@astryxdesign/core/Layer'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { createAppQueryClient } from '@/app/query-client'
import { ApiError } from '@/lib/api/client'
import { getGroup, getGroups } from '@/lib/api/groups'
import { messages } from '@/lib/i18n/messages'

const { navigate, showToast } = vi.hoisted(() => ({
  navigate: vi.fn(),
  showToast: vi.fn(() => vi.fn()),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    <TOptions extends object>(options: TOptions) => ({
      ...options,
    }),
  useNavigate: () => navigate,
}))

vi.mock('@/lib/api/groups', () => ({
  createGroup: vi.fn(),
  getGroup: vi.fn(),
  getGroups: vi.fn(),
  joinGroup: vi.fn(),
}))

import { GroupListPage } from '@/routes/groups'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getGroups).mockResolvedValue({
    items: [
      {
        groupId: 'group-1',
        name: '알고리즘 스터디',
        nickname: 'orb-user',
        createdAt: '2026-09-12T00:00:00Z',
        isMember: true,
      },
    ],
    page: 0,
    size: 20,
    totalCount: 1,
    totalPages: 1,
    hasNext: false,
  })
  vi.spyOn(window, 'alert').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('refreshes cached group access through the query cache before navigating', async () => {
  const groupDetail = {
    groupId: 'group-1',
    name: '알고리즘 스터디',
    members: [],
  }
  vi.mocked(getGroup).mockResolvedValue(groupDetail)
  const queryClient = renderPage()
  queryClient.setQueryData(['group', 'group-1'], {
    ...groupDetail,
    name: '이전 그룹 이름',
  })

  await userEvent.click(await screen.findByTitle('클릭하여 그룹으로 이동'))

  await waitFor(() => {
    expect(getGroup).toHaveBeenCalledWith('group-1')
    expect(navigate).toHaveBeenCalledWith({
      to: '/groups/$groupId',
      params: { groupId: 'group-1' },
    })
  })
  expect(queryClient.getQueryData(['group', 'group-1'])).toEqual(groupDetail)
})

it('shows the global rate limit toast when the access check returns 429', async () => {
  vi.mocked(getGroup).mockRejectedValue(
    new ApiError(
      'Too Many Requests',
      429,
      new Response(null, { status: 429 }),
      undefined,
    ),
  )
  renderPage()

  await userEvent.click(await screen.findByTitle('클릭하여 그룹으로 이동'))

  await waitFor(() => {
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ body: messages.ko.common.rateLimitError }),
    )
    expect(window.alert).toHaveBeenCalledWith(
      '그룹 정보를 확인하지 못했습니다.',
    )
  })
  expect(navigate).not.toHaveBeenCalled()
})

function renderPage() {
  const queryClient = createAppQueryClient(showToast)

  render(
    <Theme theme={neutralTheme} mode="light">
      <LayerProvider>
        <QueryClientProvider client={queryClient}>
          <GroupListPage />
        </QueryClientProvider>
      </LayerProvider>
    </Theme>,
  )

  return queryClient
}
