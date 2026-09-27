import { LayerProvider } from '@astryxdesign/core/Layer'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import { getGroup } from '@/lib/api/groups'

const { navigate, routeSearch } = vi.hoisted(() => ({
  navigate: vi.fn(),
  routeSearch: { current: {} },
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    <TOptions extends object>(options: TOptions) => ({
      ...options,
      useParams: () => ({ groupId: 'group-1' }),
      useSearch: () => routeSearch.current,
    }),
  useNavigate: () => navigate,
}))

vi.mock('@/lib/api/groups', () => ({
  getGroup: vi.fn(),
}))

vi.mock('@/routes/-components/ProblemSetTab', () => ({
  ProblemSetTab: () => <span>문제집 탭 내용</span>,
}))

vi.mock('@/routes/-components/PracticeTab', () => ({
  PracticeTab: () => <span>연습 탭 내용</span>,
}))

vi.mock('@/routes/-components/MemberTab', () => ({
  MemberTab: () => <span>멤버 탭 내용</span>,
}))

import {
  GroupDetailPage,
  normalizeGroupDetailSearch,
} from '@/routes/groups_.$groupId'

afterEach(() => {
  cleanup()
  routeSearch.current = {}
  vi.resetAllMocks()
})

it('opens the tab specified by the URL and updates the URL when another tab is selected', async () => {
  routeSearch.current = normalizeGroupDetailSearch({ tab: 'practice' })
  vi.mocked(getGroup).mockResolvedValue({
    groupId: 'group-1',
    name: '알고리즘 스터디',
    members: [],
  })

  render(
    <Theme theme={neutralTheme} mode="light">
      <LayerProvider>
        <QueryClientProvider
          client={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
        >
          <GroupDetailPage />
        </QueryClientProvider>
      </LayerProvider>
    </Theme>,
  )

  expect(screen.getByText('연습 탭 내용')).toBeVisible()
  expect(screen.queryByText('문제집 탭 내용')).not.toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: '그룹 목록으로 돌아가기' }),
  ).toHaveAttribute('href', '/groups')

  await userEvent.click(screen.getByRole('button', { name: '문제집' }))

  expect(navigate).toHaveBeenCalledWith({
    to: '/groups/$groupId',
    params: { groupId: 'group-1' },
    search: { tab: 'problem-sets' },
  })
})

it('defaults invalid and missing tab values to the problem set tab', () => {
  expect(normalizeGroupDetailSearch({})).toEqual({})
  expect(normalizeGroupDetailSearch({ tab: 'unknown' })).toEqual({})
  expect(normalizeGroupDetailSearch({ tab: ['practice'] })).toEqual({})
  expect(normalizeGroupDetailSearch({ tab: 'members' })).toEqual({
    tab: 'members',
  })
})
