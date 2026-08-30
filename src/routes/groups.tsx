import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { Dialog } from '@astryxdesign/core/Dialog'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { List, ListItem } from '@astryxdesign/core/List'
import { Pagination } from '@astryxdesign/core/Pagination'
import { Section } from '@astryxdesign/core/Section'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { VStack } from '@astryxdesign/core/VStack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Calendar, Layers, Plus, UserCheck, Users } from 'lucide-react'
import { useState } from 'react'

import { AuthSessionExpiredError } from '@/lib/api/client'
import { createGroup, getGroup, getGroups, joinGroup } from '@/lib/api/groups'
import type { GroupSummary } from '@/lib/api/groups'
import { useI18n } from '@/lib/i18n/use-translations'

export const Route = createFileRoute('/groups')({
  component: GroupListPage,
})

export function GroupListPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // 1. 상태 관리
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [isCheckingGroupId, setIsCheckingGroupId] = useState<string | null>(
    null,
  )

  // i18n 다국어 문구
  const copy = t.groups

  // 2. 그룹 목록 조회 Query -> GET /groups?page=0&size=20
  const groupsQuery = useQuery({
    queryKey: ['groups', currentPage, pageSize],
    queryFn: () => getGroups({ page: currentPage - 1, size: pageSize }),
    placeholderData: (previousData) => previousData,
  })

  const groups = groupsQuery.data?.items ?? []
  const totalPages = groupsQuery.data?.totalPages ?? 1

  // 3. 그룹 가입 POST /groups/{groupId}/members
  const joinGroupMutation = useMutation({
    mutationFn: (groupId: string) => joinGroup(groupId),
    onSuccess: (data) => {
      alert(data.message)
      void queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (error) => {
      alert(`그룹 가입 실패: ${error.message}`)
    },
  })

  // 4. 그룹 생성 POST /groups
  const createGroupMutation = useMutation({
    mutationFn: (name: string) => createGroup({ name }),
    onSuccess: () => {
      alert('새로운 그룹이 성공적으로 생성되었습니다.')
      handleCloseCreateModal()
      setCurrentPage(1)
      void queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (error) => {
      alert(`그룹 생성 실패: ${error.message}`)
    },
  })

  const isAuthRequired = groupsQuery.error instanceof AuthSessionExpiredError

  // 그룹 생성 팝업 열기/닫기
  function handleOpenCreateModal() {
    setNewGroupName('')
    setIsCreateModalOpen(true)
  }

  function handleCloseCreateModal() {
    setNewGroupName('')
    setIsCreateModalOpen(false)
  }

  // 그룹 생성 제출
  function handleSubmitCreateGroup() {
    const trimmedName = newGroupName.trim()
    if (!trimmedName) {
      alert('그룹명을 입력해 주세요.')
      return
    }
    createGroupMutation.mutate(trimmedName)
  }

  // 행(Row) 클릭 시 상세 페이지 이동
  async function handleRowClick(group: GroupSummary) {
    if (!group.isMember) {
      alert(
        '그룹에 가입되어 있지 않습니다. [그룹 가입] 버튼을 눌러 먼저 가입해 주세요.',
      )
      return
    }

    try {
      setIsCheckingGroupId(group.groupId)

      // 그룹 상세 정보 및 접근 권한 사전 검증
      await getGroup(group.groupId)

      // 성공 시 상세 페이지로 이동
      void navigate({
        to: '/groups/$groupId',
        params: { groupId: group.groupId },
      })
    } catch {
      alert('그룹에 접근할 수 있는 권한이 없습니다.')
    } finally {
      setIsCheckingGroupId(null)
    }
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
        <HStack width="100%" hAlign="between" vAlign="end" wrap="wrap" gap={4}>
          <VStack gap={2} maxWidth={672}>
            <Text type="supporting" color="secondary">
              GROUPS
            </Text>
            <Heading level={1}>{copy.title}</Heading>
            <Text type="body" color="secondary">
              {copy.emptyDescription}
            </Text>
          </VStack>

          <HStack gap={3}>
            <Button
              label={copy.createGroup}
              size="sm"
              variant="primary"
              icon={<Icon icon={Plus} size="sm" />}
              onClick={handleOpenCreateModal}
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
                  label={copy.login}
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
          /* 3. 데이터 목록 및 Pagination 컴포넌트 */
          <VStack width="100%" gap={6}>
            <Section width="100%" padding={0} dividers={['bottom']}>
              <List density="balanced" hasDividers>
                {groups.map((group) => {
                  const isHovered = hoveredGroupId === group.groupId
                  const isChecking = isCheckingGroupId === group.groupId
                  const isJoiningThis =
                    joinGroupMutation.isPending &&
                    joinGroupMutation.variables === group.groupId

                  return (
                    <div
                      key={group.groupId}
                      onClick={() => {
                        void handleRowClick(group)
                      }}
                      onMouseEnter={() => {
                        setHoveredGroupId(group.groupId)
                      }}
                      onMouseLeave={() => {
                        setHoveredGroupId(null)
                      }}
                      style={{
                        cursor: isChecking ? 'wait' : 'pointer',
                        opacity: isChecking ? 0.6 : 1,
                        backgroundColor: isHovered
                          ? 'var(--astryxdesign-color-bg-selected, rgba(59, 130, 246, 0.12))'
                          : 'transparent',
                        borderRadius: '8px',
                        transition: 'background-color 0.15s ease',
                        userSelect: 'none',
                      }}
                      title={
                        group.isMember
                          ? '클릭하여 그룹으로 이동'
                          : '미가입 그룹입니다. [그룹 가입] 버튼을 눌러 입장하세요.'
                      }
                    >
                      <ListItem
                        label={group.name}
                        startContent={
                          <Icon
                            icon={Layers}
                            size="sm"
                            color={isHovered ? 'accent' : 'secondary'}
                          />
                        }
                        description={<GroupListMetadata group={group} />}
                        endContent={
                          group.isMember ? null : (
                            <Button
                              label={isJoiningThis ? '가입 중...' : '그룹 가입'}
                              size="sm"
                              variant="secondary"
                              isDisabled={joinGroupMutation.isPending}
                              icon={<Icon icon={UserCheck} size="sm" />}
                              onClick={(e) => {
                                e.stopPropagation()
                                joinGroupMutation.mutate(group.groupId)
                              }}
                            />
                          )
                        }
                      />
                    </div>
                  )
                })}
              </List>
            </Section>

            {/* 4. Pagination 컴포넌트 */}
            <HStack hAlign="center" width="100%">
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                isDisabled={groupsQuery.isFetching}
                onChange={(page: number) => {
                  setCurrentPage(page)
                }}
              />
            </HStack>
          </VStack>
        )}

        {/* 5. 그룹 생성 모달 */}
        <Dialog
          isOpen={isCreateModalOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseCreateModal()
          }}
        >
          <VStack gap={4} padding={4}>
            <h2>그룹 생성</h2>
            <Text type="body">생성할 그룹의 이름을 입력해 주세요.</Text>

            <TextInput
              label="그룹 이름"
              placeholder="예: 알고리즘 스터디 2반"
              value={newGroupName}
              onChange={(valOrEvent: unknown) => {
                if (typeof valOrEvent === 'string') {
                  setNewGroupName(valOrEvent)
                } else if (
                  valOrEvent &&
                  typeof valOrEvent === 'object' &&
                  'target' in valOrEvent
                ) {
                  const target = (
                    valOrEvent as React.ChangeEvent<HTMLInputElement>
                  ).target
                  setNewGroupName(target.value)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitCreateGroup()
              }}
            />

            <HStack gap={2} hAlign="end" width="100%">
              <Button
                label="취소"
                variant="secondary"
                onClick={handleCloseCreateModal}
              />
              <Button
                label={
                  createGroupMutation.isPending ? copy.creating : '생성하기'
                }
                variant="primary"
                isDisabled={
                  !newGroupName.trim() || createGroupMutation.isPending
                }
                onClick={handleSubmitCreateGroup}
              />
            </HStack>
          </VStack>
        </Dialog>
      </VStack>
    </Center>
  )
}

interface GroupListMetadataProps {
  group: GroupSummary
}

function GroupListMetadata({ group }: GroupListMetadataProps) {
  const createdAtFormatted = group.createdAt
    ? new Date(group.createdAt).toLocaleDateString()
    : null

  return (
    <VStack gap={0.5} width="100%">
      <HStack gap={1} vAlign="center">
        <Icon icon={Users} size="xsm" color="secondary" />
        <Text type="supporting" color="secondary">
          소유자: {group.nickname}
        </Text>
      </HStack>
      {createdAtFormatted ? (
        <HStack gap={1} vAlign="center">
          <Icon icon={Calendar} size="xsm" color="secondary" />
          <Text type="supporting" color="secondary">
            생성일: {createdAtFormatted}
          </Text>
        </HStack>
      ) : null}
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
