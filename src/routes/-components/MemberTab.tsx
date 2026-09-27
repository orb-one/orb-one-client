import { Badge } from '@astryxdesign/core/Badge'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog } from '@astryxdesign/core/Dialog'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { List, ListItem } from '@astryxdesign/core/List'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowRightLeft,
  Check,
  Crown,
  LogOut,
  Pencil,
  ShieldAlert,
  User,
  UserMinus,
  Users,
} from 'lucide-react'
import { useState } from 'react'

import { AuthSessionExpiredError } from '@/lib/api/client'
import {
  deleteGroup,
  getGroup,
  kickGroupMember,
  leaveGroup,
  transferGroupOwnership,
  updateGroupName,
} from '@/lib/api/groups'
import { currentUserQueryOptions } from '@/lib/auth/auth-queries'

interface MemberTabProps {
  groupId: string
}

interface ApiErrorResponse extends Error {
  response?: {
    status?: number
    data?: { message?: string }
  }
}

interface SelectedMember {
  userId: string
  nickname: string
}

export function MemberTab({ groupId }: MemberTabProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // 1. 선택 대상 및 모달 상태 관리
  const [selectedMember, setSelectedMember] = useState<SelectedMember | null>(
    null,
  )
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null)
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false)
  const [editGroupName, setEditGroupName] = useState('')

  // 2. 현재 로그인 사용자 정보 및 그룹 정보 조회
  const currentUserQuery = useQuery(currentUserQueryOptions())
  const groupQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: Boolean(groupId),
  })

  const isAuthRequired = groupQuery.error instanceof AuthSessionExpiredError
  const groupDetail = groupQuery.data
  const currentUserId = currentUserQuery.data?.id

  // 3. OWNER 권한 판별
  const currentUserMember = groupDetail?.members.find(
    (m) => m.userId === currentUserId,
  )
  const isOwner = currentUserMember?.role === 'OWNER'

  // 4. 그룹 이름 수정 (PATCH /groups/{groupId})
  const updateGroupNameMutation = useMutation({
    mutationFn: (name: string) => updateGroupName(groupId, { name }),
    onSuccess: (data) => {
      alert(`그룹 이름이 '${data.name}'(으)로 성공적으로 수정되었습니다.`)
      setIsEditNameModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      void queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (err: ApiErrorResponse) => {
      const status = err.response?.status
      const serverMessage = err.response?.data?.message

      if (status !== undefined) {
        alert(
          serverMessage ??
            `오류가 발생했습니다. (상태 코드: ${String(status)})`,
        )
      } else {
        alert(
          serverMessage ??
            (err.message !== ''
              ? err.message
              : '그룹 이름 수정 중 오류가 발생했습니다.'),
        )
      }
    },
  })

  // 5. 그룹 소유권 이전 (PATCH /groups/{groupId}/owner)
  const transferOwnershipMutation = useMutation({
    mutationFn: (newOwnerId: string) =>
      transferGroupOwnership(groupId, { newOwnerId }),
    onSuccess: (data) => {
      alert(data.message || '그룹 소유권이 성공적으로 이전되었습니다.')
      setSelectedMember(null)
      void queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      void queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (err: ApiErrorResponse) => {
      const status = err.response?.status
      const serverMessage = err.response?.data?.message

      if (status !== undefined) {
        alert(
          serverMessage ??
            `오류가 발생했습니다. (상태 코드: ${String(status)})`,
        )
      } else {
        alert(
          serverMessage ??
            (err.message !== ''
              ? err.message
              : '소유권 이전 중 오류가 발생했습니다.'),
        )
      }
    },
  })

  // 6. 그룹 폐쇄 (DELETE /groups/{groupId}) -> /groups 이동
  const deleteGroupMutation = useMutation({
    mutationFn: () => deleteGroup(groupId),
    onSuccess: () => {
      alert('그룹이 성공적으로 폐쇄되었습니다.')
      void queryClient.invalidateQueries({ queryKey: ['groups'] })
      void navigate({ to: '/groups' })
    },
    onError: (err: ApiErrorResponse) => {
      const status = err.response?.status
      const serverMessage = err.response?.data?.message

      if (status !== undefined) {
        alert(
          serverMessage ??
            `오류가 발생했습니다. (상태 코드: ${String(status)})`,
        )
      } else {
        alert(
          serverMessage ??
            (err.message !== ''
              ? err.message
              : '그룹 폐쇄 중 오류가 발생했습니다.'),
        )
      }
    },
  })

  // 7. 그룹 멤버 강퇴 (DELETE /groups/{groupId}/members/{memberId})
  const kickMemberMutation = useMutation({
    mutationFn: (target: SelectedMember) =>
      kickGroupMember(groupId, target.userId),
    onSuccess: (_, variables) => {
      alert(`'${variables.nickname}' 멤버를 성공적으로 강퇴했습니다.`)
      setSelectedMember(null)
      void queryClient.invalidateQueries({ queryKey: ['group', groupId] })
    },
    onError: (err: ApiErrorResponse) => {
      const status = err.response?.status
      const serverMessage = err.response?.data?.message

      if (status !== undefined) {
        alert(
          serverMessage ??
            `오류가 발생했습니다. (상태 코드: ${String(status)})`,
        )
      } else {
        alert(
          serverMessage ??
            (err.message !== ''
              ? err.message
              : '그룹 폐쇄 중 오류가 발생했습니다.'),
        )
      }
    },
  })

  // 8. 그룹 탈퇴 (DELETE /groups/{groupId}/members/me)
  const leaveGroupMutation = useMutation({
    mutationFn: () => leaveGroup(groupId),
    onSuccess: () => {
      alert('그룹에서 성공적으로 탈퇴했습니다.')
      void queryClient.invalidateQueries({ queryKey: ['groups'] })
      void navigate({ to: '/groups' })
    },
    onError: (err: ApiErrorResponse) => {
      const status = err.response?.status
      const serverMessage = err.response?.data?.message

      if (status !== undefined) {
        alert(
          serverMessage ??
            `오류가 발생했습니다. (상태 코드: ${String(status)})`,
        )
      } else {
        alert(
          serverMessage ??
            (err.message !== ''
              ? err.message
              : '그룹 탈퇴 중 오류가 발생했습니다.'),
        )
      }
    },
  })

  // 이름 수정 모달 열기/닫기
  function handleOpenEditNameModal() {
    setEditGroupName(groupDetail?.name ?? '')
    setIsEditNameModalOpen(true)
  }

  function handleCloseEditNameModal() {
    setEditGroupName('')
    setIsEditNameModalOpen(false)
  }

  function handleSubmitEditName() {
    const trimmed = editGroupName.trim()
    if (!trimmed) {
      alert('변경할 그룹 이름을 입력해 주세요.')
      return
    }
    updateGroupNameMutation.mutate(trimmed)
  }

  // 소유권 이전 핸들러
  function handleTransferOwnership() {
    if (!selectedMember) {
      alert('소유권을 이전할 멤버를 목록에서 먼저 선택해 주세요.')
      return
    }

    if (
      confirm(
        `'${selectedMember.nickname}' 멤버에게 그룹 소유권을 이전하시겠습니까?\n이전 후에는 관리자 권한이 MEMBER로 변경됩니다.`,
      )
    ) {
      transferOwnershipMutation.mutate(selectedMember.userId)
    }
  }

  // 강퇴 핸들러
  function handleKickMember() {
    if (!selectedMember) {
      alert('강퇴할 멤버를 목록에서 클릭하여 선택해 주세요.')
      return
    }

    if (
      confirm(`'${selectedMember.nickname}' 멤버를 그룹에서 강퇴하시겠습니까?`)
    ) {
      kickMemberMutation.mutate(selectedMember)
    }
  }

  // 폐쇄 핸들러
  function handleCloseGroup() {
    if (
      confirm('정말로 그룹을 폐쇄하시겠습니까? 이 작업은 되돌릴 수 없습니다.')
    ) {
      deleteGroupMutation.mutate()
    }
  }

  // 탈퇴 핸들러
  function handleLeaveGroup() {
    if (confirm('그룹에서 정말 탈퇴하시겠습니까?')) {
      leaveGroupMutation.mutate()
    }
  }

  const isActionPending =
    updateGroupNameMutation.isPending ||
    transferOwnershipMutation.isPending ||
    deleteGroupMutation.isPending ||
    kickMemberMutation.isPending ||
    leaveGroupMutation.isPending

  return (
    <VStack width="100%" gap={6}>
      {/* 1. 상단 액션 버튼 영역 */}
      <HStack width="100%" hAlign="end" gap={2} wrap="wrap" vAlign="center">
        {isOwner ? (
          <>
            <Button
              label="그룹 이름 수정"
              size="sm"
              variant="secondary"
              isDisabled={isActionPending}
              icon={<Icon icon={Pencil} size="sm" />}
              onClick={handleOpenEditNameModal}
            />
            <Button
              label={
                transferOwnershipMutation.isPending
                  ? '이전 처리 중...'
                  : selectedMember
                    ? `'${selectedMember.nickname}'에게 소유권 이전`
                    : '그룹 소유권 이전'
              }
              size="sm"
              variant="secondary"
              isDisabled={isActionPending || !selectedMember}
              icon={<Icon icon={ArrowRightLeft} size="sm" />}
              onClick={handleTransferOwnership}
            />
            <Button
              label={
                kickMemberMutation.isPending
                  ? '강퇴 처리 중...'
                  : selectedMember
                    ? `'${selectedMember.nickname}' 강퇴하기`
                    : '그룹 멤버 강퇴'
              }
              size="sm"
              variant="destructive"
              isDisabled={isActionPending || !selectedMember}
              icon={<Icon icon={UserMinus} size="sm" />}
              onClick={handleKickMember}
            />
            <Button
              label={
                deleteGroupMutation.isPending ? '폐쇄 처리 중...' : '그룹 폐쇄'
              }
              size="sm"
              variant="secondary"
              isDisabled={isActionPending}
              icon={<Icon icon={ShieldAlert} size="sm" />}
              onClick={handleCloseGroup}
            />
          </>
        ) : (
          <Button
            label={
              leaveGroupMutation.isPending ? '탈퇴 처리 중...' : '그룹 탈퇴'
            }
            size="sm"
            variant="secondary"
            isDisabled={isActionPending}
            icon={<Icon icon={LogOut} size="sm" />}
            onClick={handleLeaveGroup}
          />
        )}
      </HStack>

      {/* 2. 상태별 멤버 목록 */}
      {groupQuery.isPending ? (
        <MemberListSkeleton />
      ) : groupQuery.isError ? (
        <Banner
          status={isAuthRequired ? 'info' : 'error'}
          title={
            isAuthRequired
              ? '로그인이 필요한 서비스입니다.'
              : '멤버 정보를 불러오는 데 실패했습니다.'
          }
          endContent={
            isAuthRequired ? (
              <Button
                label="로그인"
                href="/login"
                size="sm"
                variant="secondary"
              />
            ) : (
              <Button
                label="다시 시도"
                size="sm"
                variant="secondary"
                onClick={() => {
                  void groupQuery.refetch()
                }}
              />
            )
          }
        />
      ) : !groupDetail || groupDetail.members.length === 0 ? (
        <EmptyState
          title="등록된 멤버가 없습니다."
          description="아직 그룹에 참여한 멤버가 없습니다."
          icon={<Icon icon={Users} size="lg" color="secondary" />}
          headingLevel={2}
        />
      ) : (
        <List
          header={
            <HStack vAlign="center" gap={2}>
              <Heading level={2}>참여 멤버 목록</Heading>
              <Badge
                label={`${String(groupDetail.members.length)}명`}
                variant="neutral"
              />
            </HStack>
          }
          density="balanced"
          hasDividers
        >
          {groupDetail.members.map((member) => {
            const isMemberOwner = member.role === 'OWNER'
            const isSelected = selectedMember?.userId === member.userId
            const isHovered = hoveredUserId === member.userId

            return (
              <div
                key={member.userId}
                onClick={() => {
                  if (isOwner && !isMemberOwner) {
                    if (isSelected) {
                      setSelectedMember(null)
                    } else {
                      setSelectedMember({
                        userId: member.userId,
                        nickname: member.nickname,
                      })
                    }
                  }
                }}
                onMouseEnter={() => {
                  setHoveredUserId(member.userId)
                }}
                onMouseLeave={() => {
                  setHoveredUserId(null)
                }}
                style={{
                  cursor: isOwner && !isMemberOwner ? 'pointer' : 'default',
                  userSelect: 'none',
                  backgroundColor: isSelected
                    ? 'var(--astryxdesign-color-bg-selected, rgba(59, 130, 246, 0.18))'
                    : isHovered
                      ? 'var(--astryxdesign-color-bg-selected, rgba(59, 130, 246, 0.12))'
                      : 'transparent',
                  borderRadius: '8px',
                  transition: 'background-color 0.15s ease',
                }}
                title={
                  isOwner && !isMemberOwner
                    ? isSelected
                      ? '클릭하여 선택 해제'
                      : '클릭하여 강퇴/소유권 이전 대상으로 선택'
                    : undefined
                }
              >
                <ListItem
                  label={member.nickname}
                  description={`User ID: ${member.userId}`}
                  startContent={
                    <Icon
                      icon={isMemberOwner ? Crown : User}
                      size="sm"
                      color={
                        isMemberOwner
                          ? 'accent'
                          : isHovered || isSelected
                            ? 'accent'
                            : 'secondary'
                      }
                    />
                  }
                  endContent={
                    <HStack vAlign="center" gap={2}>
                      {isSelected && (
                        <HStack vAlign="center" gap={1}>
                          <Icon icon={Check} size="xsm" color="accent" />
                          <Badge label="선택됨" variant="neutral" />
                        </HStack>
                      )}
                      <Badge
                        label={isMemberOwner ? 'OWNER' : 'MEMBER'}
                        variant={isMemberOwner ? 'blue' : 'neutral'}
                      />
                    </HStack>
                  }
                />
              </div>
            )
          })}
        </List>
      )}

      {/* 3. 그룹 이름 수정 다이얼로그 */}
      <Dialog
        isOpen={isEditNameModalOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseEditNameModal()
        }}
      >
        <VStack gap={4} padding={4}>
          <h2>그룹 이름 수정</h2>
          <Text type="body">변경할 새로운 그룹 이름을 입력해 주세요.</Text>

          <TextInput
            label="그룹 이름"
            placeholder="예: 알고리즘 마스터"
            value={editGroupName}
            onChange={(valOrEvent: unknown) => {
              if (typeof valOrEvent === 'string') {
                setEditGroupName(valOrEvent)
              } else if (
                valOrEvent &&
                typeof valOrEvent === 'object' &&
                'target' in valOrEvent
              ) {
                const target = (
                  valOrEvent as React.ChangeEvent<HTMLInputElement>
                ).target
                setEditGroupName(target.value)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmitEditName()
            }}
          />

          <HStack gap={2} hAlign="end" width="100%">
            <Button
              label="취소"
              variant="secondary"
              onClick={handleCloseEditNameModal}
            />
            <Button
              label={
                updateGroupNameMutation.isPending ? '수정 중...' : '수정하기'
              }
              variant="primary"
              isDisabled={
                !editGroupName.trim() || updateGroupNameMutation.isPending
              }
              onClick={handleSubmitEditName}
            />
          </HStack>
        </VStack>
      </Dialog>
    </VStack>
  )
}

function MemberListSkeleton() {
  return (
    <VStack role="status" aria-live="polite" gap={3} width="100%">
      <Skeleton width="30%" height={24} radius={2} />
      <Skeleton width="100%" height={48} radius={2} />
      <Skeleton width="100%" height={48} radius={2} />
    </VStack>
  )
}
