import { Badge } from '@astryxdesign/core/Badge'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { List, ListItem } from '@astryxdesign/core/List'
import { Section } from '@astryxdesign/core/Section'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { VStack } from '@astryxdesign/core/VStack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Layers, Plus, UserCheck, Users } from 'lucide-react'
import { useState } from 'react'

import { AuthSessionExpiredError } from '@/lib/api/client'
import { getGroups, joinGroup } from '@/lib/api/groups'
import type { GroupSummary } from '@/lib/api/groups'
import { useI18n } from '@/lib/i18n/use-translations'

export const Route = createFileRoute('/groups')({
  component: GroupListPage,
})

export function GroupListPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // 1. 클릭하여 선택된 그룹 ID 관리 상태
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  // i18n 다국어 및 폴백 문구
  const copy = t?.groups?.list ?? {
    title: '그룹 목록',
    description: '가입하려는 그룹을 클릭하여 선택한 후 [그룹 가입] 버튼을 눌러주세요.',
    loading: '그룹 목록을 불러오는 중입니다.',
    loadError: '그룹 목록을 가져오는 데 실패했습니다.',
    authRequired: '로그인이 필요한 서비스입니다.',
    emptyTitle: '개설된 그룹이 없습니다.',
    emptyDescription: '새로운 그룹을 생성하거나 다른 그룹에 참여해보세요.',
    retry: '다시 시도',
    joinGroup: '그룹 가입',
    joining: '가입 진행 중...',
    createGroup: '그룹 만들기',
    unknownOwner: '소유자 정보 없음',
    selectGroupAlert: '가입할 그룹을 먼저 목록에서 선택해주세요.',
  }

  // 2. 그룹 목록 조회 Query
  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: () => getGroups(),
  })

  // 3. 그룹 가입 POST /groups/{groupId}/members
  const joinGroupMutation = useMutation({
    mutationFn: (groupId: string) => joinGroup(groupId),
    onSuccess: (data) => {
      alert(data.message ?? '그룹 가입이 완료되었습니다.')
      setSelectedGroupId(null)
      void queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (error) => {
      alert(`그룹 가입 실패: ${error.message}`)
    },
  })

  const isAuthRequired = groupsQuery.error instanceof AuthSessionExpiredError
  const groups = groupsQuery.data ?? []

  // 그룹 가입 버튼
  function handleJoinGroup() {
    if (!selectedGroupId) {
      alert(copy.selectGroupAlert)
      return
    }
    joinGroupMutation.mutate(selectedGroupId)
  }

  // 행(Row) 클릭 (단일 선택)
  function handleSelectRow(groupId: string) {
    setSelectedGroupId((prev) => (prev === groupId ? null : groupId))
  }

  // 행 더블클릭 (상세 페이지 이동 - 독립 경로 /groups_/$groupId 연동)
  function handleDoubleClickRow(groupId: string) {
    void navigate({
      to: '/groups/$groupId',
      params: { groupId },
    })
  }

  return (
    <Center width="100%">
      <VStack
        width="100%"
        maxWidth={1024}
        gap={6}
        paddingInline={4}
        paddingBlock={10}
      >
        {/* 1. 헤더 & 액션 버튼 영역 */}
        <HStack width="100%" hAlign="space-between" vAlign="end" wrap="wrap" gap={4}>
          <VStack gap={2} maxWidth={672}>
            <Text type="supporting" color="secondary">
              GROUPS
            </Text>
            <Heading level={1}>{copy.title}</Heading>
            <Text type="body" color="secondary">
              {copy.description}
            </Text>
          </VStack>

          <HStack gap={3}>
            <Button
              label={
                joinGroupMutation.isPending
                  ? copy.joining
                  : copy.joinGroup
              }
              size="sm"
              variant="primary"
              disabled={!selectedGroupId || joinGroupMutation.isPending}
              icon={<Icon icon={UserCheck} size="sm" />}
              onClick={handleJoinGroup}
            />
            <Button
              label={copy.createGroup}
              size="sm"
              variant="secondary"
              icon={<Icon icon={Plus} size="sm" />}
            />
          </HStack>
        </HStack>

        {/* 2. 조건부 상태 렌더링 */}
        {groupsQuery.isPending ? (
          <GroupListSkeleton label={copy.loading} />
        ) : groupsQuery.isError ? (
          <Banner
            status={isAuthRequired ? 'info' : 'error'}
            title={isAuthRequired ? copy.authRequired : copy.loadError}
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
                  label={copy.retry}
                  size="sm"
                  variant="secondary"
                  onClick={() => void groupsQuery.refetch()}
                />
              )
            }
          />
        ) : groups.length === 0 ? (
          <EmptyState
            title={copy.emptyTitle}
            description={copy.emptyDescription}
            icon={<Icon icon={Layers} size="lg" color="secondary" />}
            headingLevel={2}
          />
        ) : (
          /*  3. 데이터 목록 영역 */
          <Section width="100%" padding={0} dividers={['bottom']}>
            <List density="balanced" hasDividers>
              {groups.map((group) => {
                const isSelected = selectedGroupId === group.id

                return (
                  <div
                    key={group.id}
                    onClick={() => handleSelectRow(group.id)}
                    onDoubleClick={() => handleDoubleClickRow(group.id)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected
                        ? 'var(--astryxdesign-color-bg-selected, rgba(59, 130, 246, 0.08))'
                        : 'transparent',
                      borderRadius: '8px',
                      transition: 'background-color 0.15s ease',
                      userSelect: 'none',
                    }}
                  >
                    <ListItem
                      label={group.name}
                      startContent={
                        <Icon
                          icon={Layers}
                          size="sm"
                          color={isSelected ? 'accent' : 'secondary'}
                        />
                      }
                      description={<GroupListMetadata group={group} copy={copy} />}
                      endContent={
                        <Badge
                          label={isSelected ? '선택됨' : group.ownerId ? '소유자 지정됨' : '공용'}
                          variant={isSelected ? 'blue' : 'neutral'}
                        />
                      }
                    />
                  </div>
                )
              })}
            </List>
          </Section>
        )}
      </VStack>
    </Center>
  )
}

interface GroupListMetadataProps {
  group: GroupSummary
  copy: Record<string, string>
}

function GroupListMetadata({ group, copy }: GroupListMetadataProps) {
  const createdAtFormatted = group.createdAt
    ? new Date(group.createdAt).toLocaleDateString()
    : null

  return (
    <VStack gap={1.5}>
      <HStack gap={3} wrap="wrap" vAlign="center">
        <HStack gap={1} vAlign="center">
          <Icon icon={Users} size="xs" color="secondary" />
          <Text type="supporting" color="secondary">
            소유자 ID: {group.ownerId ?? copy.unknownOwner}
          </Text>
        </HStack>
        {createdAtFormatted ? (
          <Text type="supporting" color="secondary">
            생성일: {createdAtFormatted}
          </Text>
        ) : null}
      </HStack>
    </VStack>
  )
}

function GroupListSkeleton({ label }: { label: string }) {
  return (
    <VStack role="status" aria-live="polite" gap={3} width="100%">
      <VisuallyHidden>{label}</VisuallyHidden>
      {[0, 1, 2, 3].map((index) => (
        <Section key={index} width="100%" padding={4} dividers={['bottom']}>
          <VStack gap={2}>
            <Skeleton width="40%" height={20} radius={2} index={index} />
            <Skeleton width="60%" height={16} radius={2} index={index} />
          </VStack>
        </Section>
      ))}
    </VStack>
  )
}