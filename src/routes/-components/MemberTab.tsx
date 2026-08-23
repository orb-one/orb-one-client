import { Badge } from '@astryxdesign/core/Badge'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { List, ListItem } from '@astryxdesign/core/List'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { VStack } from '@astryxdesign/core/VStack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Check,
  Crown,
  LogOut,
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

  // 상태 관리
  const [selectedMember, setSelectedMember] = useState<SelectedMember | null>(
    null,
  )
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null)

  // 1. 현재 로그인 사용자 정보 조회
  const currentUserQuery = useQuery(currentUserQueryOptions())

  // 2. 그룹 상세 정보 조회 (GET /groups/{groupId})
  const groupQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: Boolean(groupId),
  })

  const isAuthRequired = groupQuery.error instanceof AuthSessionExpiredError
  const groupDetail = groupQuery.data
  const currentUserId = currentUserQuery.data?.id

  // 3. 현재 사용자가 그룹의 OWNER인지 판별
  const currentUserMember = groupDetail?.members.find(
    (m) => m.userId === currentUserId,
  )
  const isOwner = currentUserMember?.role === 'OWNER'

  // 그룹 폐쇄 (DELETE /groups/{groupId}) -> /groups 이동
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

  // 그룹 멤버 강퇴 (DELETE /groups/{groupId}/members/{memberId})
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

  // 그룹 탈퇴 (DELETE /groups/{groupId}/members/me) -> /groups 이동
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
              : '그룹 폐쇄 중 오류가 발생했습니다.'),
        )
      }
    },
  })

  // 버튼 액션 핸들러
  function handleCloseGroup() {
    if (confirm('정말로 그룹을 폐쇄하시겠습니까? 작업은 되돌릴 수 없습니다.')) {
      deleteGroupMutation.mutate()
    }
  }

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

  function handleLeaveGroup() {
    if (confirm('그룹에서 정말 탈퇴하시겠습니까?')) {
      leaveGroupMutation.mutate()
    }
  }

  const isActionPending =
    deleteGroupMutation.isPending ||
    kickMemberMutation.isPending ||
    leaveGroupMutation.isPending

  return (
    <VStack width="100%" gap={6}>
      {/* 1. OWNER는 폐쇄/강퇴, MEMBER는 탈퇴 */}
      <HStack width="100%" hAlign="end" gap={2} wrap="wrap" vAlign="center">
        {isOwner ? (
          <>
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
              isDisabled={isActionPending}
              icon={<Icon icon={UserMinus} size="sm" />}
              onClick={handleKickMember}
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
                      : '클릭하여 강퇴 대상으로 선택'
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
                          <Badge label="강퇴 대상 선택됨" variant="neutral" />
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
