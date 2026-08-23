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
import { useQuery } from '@tanstack/react-query'
import {
  Crown,
  LogOut,
  ShieldAlert,
  User,
  UserMinus,
  Users,
} from 'lucide-react'

import { AuthSessionExpiredError } from '@/lib/api/client'
import { getGroup } from '@/lib/api/groups'
import { currentUserQueryOptions } from '@/lib/auth/auth-queries'

interface MemberTabProps {
  groupId: string
}

export function MemberTab({ groupId }: MemberTabProps) {
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

  // 버튼 액션 핸들러
  function handleCloseGroup() {
    if (
      confirm(
        '정말로 이 그룹을 폐쇄하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      )
    ) {
      alert('그룹이 폐쇄되었습니다.')
    }
  }

  function handleKickMember() {
    alert('강퇴할 멤버를 목록에서 선택해 주세요.')
  }

  function handleLeaveGroup() {
    if (confirm('이 그룹에서 탈퇴하시겠습니까?')) {
      alert('그룹에서 탈퇴 처리되었습니다.')
    }
  }

  return (
    <VStack width="100%" gap={6}>
      {/* 1. 상단 액션 버튼 영역 (OWNER는 폐쇄/강퇴, MEMBER는 탈퇴) */}
      <HStack width="100%" hAlign="end" gap={2}>
        {isOwner ? (
          <>
            <Button
              label="그룹 폐쇄"
              size="sm"
              variant="secondary"
              icon={<Icon icon={ShieldAlert} size="sm" />}
              onClick={handleCloseGroup}
            />
            <Button
              label="그룹 멤버 강퇴"
              size="sm"
              variant="secondary"
              icon={<Icon icon={UserMinus} size="sm" />}
              onClick={handleKickMember}
            />
          </>
        ) : (
          <Button
            label="그룹 탈퇴"
            size="sm"
            variant="secondary"
            icon={<Icon icon={LogOut} size="sm" />}
            onClick={handleLeaveGroup}
          />
        )}
      </HStack>

      {/* 2. 상태별 화면 렌더링 및 멤버 목록 */}
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
          description="아직 이 그룹에 참여한 멤버가 없습니다."
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

            return (
              <ListItem
                key={member.userId}
                label={member.nickname}
                description={`User ID: ${member.userId}`}
                startContent={
                  <Icon
                    icon={isMemberOwner ? Crown : User}
                    size="sm"
                    color={isMemberOwner ? 'accent' : 'secondary'}
                  />
                }
                endContent={
                  <Badge
                    label={isMemberOwner ? '소유자 (OWNER)' : '멤버 (MEMBER)'}
                    variant={isMemberOwner ? 'blue' : 'neutral'}
                  />
                }
              />
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
