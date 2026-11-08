import { LayerProvider } from '@astryxdesign/core/Layer'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { getCurrentUser } from '@/lib/api/auth'
import {
  getGroup,
  kickGroupMember,
  transferGroupOwnership,
  type GroupDetail,
} from '@/lib/api/groups'

import { MemberTab } from './MemberTab'

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/lib/api/auth', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/api/groups', () => ({
  getGroup: vi.fn(),
  kickGroupMember: vi.fn(),
  transferGroupOwnership: vi.fn(),
  updateGroupName: vi.fn(),
  deleteGroup: vi.fn(),
  leaveGroup: vi.fn(),
}))

function createGroup(): GroupDetail {
  return {
    groupId: 'group-1',
    name: '알고리즘 스터디',
    members: [
      { userId: 'member-first', nickname: '같은 닉네임', role: 'MEMBER' },
      { userId: 'owner-id', nickname: '기존 오너', role: 'OWNER' },
      { userId: 'member-second', nickname: '같은 닉네임', role: 'MEMBER' },
    ],
  }
}

beforeEach(() => {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: 'owner-id',
    nickname: '기존 오너',
    email: 'owner@example.com',
  })
  vi.mocked(getGroup).mockResolvedValue(createGroup())
  vi.spyOn(window, 'alert').mockImplementation(() => undefined)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

function renderMembers() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <Theme theme={neutralTheme} mode="light">
      <LayerProvider>
        <QueryClientProvider client={queryClient}>
          <MemberTab groupId="group-1" />
        </QueryClientProvider>
      </LayerProvider>
    </Theme>,
  )
  return queryClient
}

async function selectDuplicateNamedMember(index: number) {
  const member = (await screen.findAllByText('같은 닉네임'))[index]
  if (!member) throw new Error('선택할 멤버를 찾지 못했습니다.')
  await userEvent.click(member)
}

it('shows the owner first without exposing IDs or changing the cached member order', async () => {
  const group = createGroup()
  Object.freeze(group.members)
  vi.mocked(getGroup).mockResolvedValue(group)
  const queryClient = renderMembers()

  const rows = await screen.findAllByRole('listitem')
  expect(rows).toHaveLength(3)
  expect(rows[0]).toHaveTextContent('기존 오너')
  expect(rows.slice(1).map((row) => row.textContent)).toEqual([
    expect.stringContaining('같은 닉네임'),
    expect.stringContaining('같은 닉네임'),
  ])
  expect(screen.queryByText(/User ID:/)).not.toBeInTheDocument()
  for (const member of group.members) {
    expect(
      screen.queryByText(member.userId, { exact: false }),
    ).not.toBeInTheDocument()
  }
  expect(queryClient.getQueryData(['group', 'group-1'])).toBe(group)
  expect(group.members.map((member) => member.userId)).toEqual([
    'member-first',
    'owner-id',
    'member-second',
  ])
})

it.each([
  [0, 'member-first'],
  [1, 'member-second'],
] as const)(
  'kicks duplicate-named member %i using the selected ID',
  async (index, id) => {
    vi.mocked(kickGroupMember).mockResolvedValue(undefined)
    renderMembers()
    await screen.findByRole('button', { name: '그룹 이름 수정' })
    await selectDuplicateNamedMember(index)
    await userEvent.click(
      screen.getByRole('button', { name: "'같은 닉네임' 강퇴하기" }),
    )

    await waitFor(() => {
      expect(kickGroupMember).toHaveBeenCalledWith('group-1', id)
    })
    expect(transferGroupOwnership).not.toHaveBeenCalled()
  },
)

it('moves the new owner to the top after transfer and updates the current user actions', async () => {
  const group = createGroup()
  group.members = group.members.map((member) => ({
    ...member,
    nickname: member.userId === 'member-second' ? '새 오너' : member.nickname,
  }))
  const updatedGroup = {
    ...group,
    members: group.members.map((member) => ({
      ...member,
      role: member.userId === 'member-second' ? 'OWNER' : 'MEMBER',
    })),
  }
  vi.mocked(getGroup)
    .mockResolvedValueOnce(group)
    .mockResolvedValue(updatedGroup)
  vi.mocked(transferGroupOwnership).mockResolvedValue({
    groupId: 'group-1',
    previousOwnerId: 'owner-id',
    newOwnerId: 'member-second',
    message: '소유권이 이전되었습니다.',
  })
  renderMembers()
  await userEvent.click(await screen.findByText('새 오너'))
  await userEvent.click(
    screen.getByRole('button', { name: "'새 오너'에게 소유권 이전" }),
  )

  await screen.findByRole('button', { name: '그룹 탈퇴' })
  expect(transferGroupOwnership).toHaveBeenCalledWith('group-1', {
    newOwnerId: 'member-second',
  })
  const rows = screen.getAllByRole('listitem')
  expect(rows[0]).toHaveTextContent('새 오너')
  expect(rows.slice(1).map((row) => row.textContent)).toEqual([
    expect.stringContaining('같은 닉네임'),
    expect.stringContaining('기존 오너'),
  ])
  expect(
    screen.queryByRole('button', { name: '그룹 소유권 이전' }),
  ).not.toBeInTheDocument()
  expect(screen.queryByText('선택됨')).not.toBeInTheDocument()
})

it('transfers ownership to the selected ID when member nicknames match', async () => {
  vi.mocked(transferGroupOwnership).mockResolvedValue({
    groupId: 'group-1',
    previousOwnerId: 'owner-id',
    newOwnerId: 'member-second',
    message: '소유권이 이전되었습니다.',
  })
  renderMembers()
  await screen.findByRole('button', { name: '그룹 이름 수정' })
  await selectDuplicateNamedMember(1)
  await userEvent.click(
    screen.getByRole('button', { name: "'같은 닉네임'에게 소유권 이전" }),
  )

  await waitFor(() => {
    expect(transferGroupOwnership).toHaveBeenCalledWith('group-1', {
      newOwnerId: 'member-second',
    })
  })
  expect(kickGroupMember).not.toHaveBeenCalled()
})
