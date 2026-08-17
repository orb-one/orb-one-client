import { Badge } from '@astryxdesign/core/Badge'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { Dialog } from '@astryxdesign/core/Dialog'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { TextInput } from '@astryxdesign/core/TextInput'
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
import { createGroup, getGroups, getGroup, joinGroup } from '@/lib/api/groups'
import type { GroupSummary } from '@/lib/api/groups'
import { useI18n } from '@/lib/i18n/use-translations'

export const Route = createFileRoute('/groups')({
  component: GroupListPage,
})

export function GroupListPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // 1. 상태 관리 (선택된 그룹 ID / 모달 열림 여부 / 신규 그룹명)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [isCheckingGroupId, setIsCheckingGroupId] = useState<string | null>(
    null,
  )

  // i18n 다국어 및 폴백 문구
  const copy = t.groups

  // 2. 그룹 목록 조회 Query
  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: () => getGroups(),
  })

  // 3. 그룹 가입 POST /groups/{groupId}/members
  const joinGroupMutation = useMutation({
    mutationFn: (groupId: string) => joinGroup(groupId),
    onSuccess: (data) => {
      alert(data.message)
      setSelectedGroupId(null)
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
      void queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (error) => {
      alert(`그룹 생성 실패: ${error.message}`)
    },
  })

  const isAuthRequired = groupsQuery.error instanceof AuthSessionExpiredError
  const groups = groupsQuery.data ?? []

  // 그룹 가입 버튼 핸들러
  function handleJoinGroup() {
    if (!selectedGroupId) {
      alert(copy.selectGroupAlert)
      return
    }
    joinGroupMutation.mutate(selectedGroupId)
  }

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

  // 행(Row) 클릭 (단일 선택)
  function handleSelectRow(groupId: string) {
    if (!groupId) return
    setSelectedGroupId((prev) => (prev === groupId ? null : groupId))
  }

  // 행 더블클릭 (상세 페이지 이동)
  async function handleDoubleClickRow(groupId: string) {
    try {
      setIsCheckingGroupId(groupId)
      // 그룹 상세 정보 및 멤버 권한 사전 검증
      await getGroup(groupId)

      // 성공(200) 시 상세 페이지로 이동
      void navigate({
        to: '/groups/$groupId',
        params: { groupId },
      })
    } catch {
      // 400, 401, 404 등 오류 응답 시 에러 메시지 알림 후 이동 차단
      alert('그룹에 가입되어 있지 않거나 접근 권한이 없습니다.')
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
              {copy.description}
            </Text>
          </VStack>

          <HStack gap={3}>
            <Button
              label={
                joinGroupMutation.isPending ? copy.joining : copy.joinGroup
              }
              size="sm"
              variant="primary"
              isDisabled={!selectedGroupId || joinGroupMutation.isPending}
              icon={<Icon icon={UserCheck} size="sm" />}
              onClick={handleJoinGroup}
            />
            <Button
              label={copy.createGroup}
              size="sm"
              variant="secondary"
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
          /* 3. 데이터 목록 영역 */
          <Section width="100%" padding={0} dividers={['bottom']}>
            <List density="balanced" hasDividers>
              {groups.map((group) => {
                const isSelected =
                  Boolean(selectedGroupId) && selectedGroupId === group.groupId
                const isChecking = isCheckingGroupId === group.groupId

                return (
                  <div
                    key={group.groupId}
                    onClick={() => {
                      handleSelectRow(group.groupId)
                    }}
                    onDoubleClick={() => {
                      void handleDoubleClickRow(group.groupId)
                    }}
                    style={{
                      cursor: isChecking ? 'wait' : 'pointer',
                      opacity: isChecking ? 0.6 : 1,
                      backgroundColor: isSelected
                        ? 'var(--astryxdesign-color-bg-selected, rgba(59, 130, 246, 0.08))'
                        : 'transparent',
                      borderRadius: '8px',
                      transition: 'background-color 0.15s ease',
                      userSelect: 'none',
                    }}
                    title="더블 클릭하여 그룹으로 이동"
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
                      description={<GroupListMetadata group={group} />}
                      endContent={
                        <Badge
                          label={
                            isSelected ? '선택됨' : group.nickname || '공용'
                          }
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

        {/* 4. 그룹 생성 모달 / 팝업 */}
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
              // 값 또는 이벤트 객체 모두에 대응 가능한 안전한 onChange
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
    <HStack gap={3} wrap="wrap" vAlign="center">
      <HStack gap={1} vAlign="center">
        <Icon icon={Users} size="xsm" color="secondary" />
        <Text type="supporting" color="secondary">
          소유자: {group.nickname}
        </Text>
      </HStack>
      {createdAtFormatted ? (
        <Text type="supporting" color="secondary">
          생성일: {createdAtFormatted}
        </Text>
      ) : null}
    </HStack>
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
