import { Badge } from '@astryxdesign/core/Badge'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog } from '@astryxdesign/core/Dialog'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { List, ListItem } from '@astryxdesign/core/List'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { getProblemSets } from '@/lib/api/problem-sets'

interface ProblemSetTabProps {
  groupId: string
}

export function ProblemSetTab({ groupId }: ProblemSetTabProps) {
  const queryClient = useQueryClient()

  // 1. 모달 및 입력 상태 관리
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newProblemSetName, setNewProblemSetName] = useState('')

  // 2. 문제집 목록 Query
  const problemSetsQuery = useQuery({
    queryKey: ['problemSets', groupId],
    queryFn: () => getProblemSets(groupId),
    enabled: Boolean(groupId),
  })

  // 모달 제어 핸들러
  function handleOpenCreateModal() {
    setNewProblemSetName('')
    setIsCreateModalOpen(true)
  }

  function handleCloseCreateModal() {
    setNewProblemSetName('')
    setIsCreateModalOpen(false)
  }

  // 문제집 생성 제출 핸들러 (추후 createProblemSet Mutation 적용)
  function handleSubmitCreateProblemSet() {
    const trimmedName = newProblemSetName.trim()
    if (!trimmedName) {
      alert('문제집 이름을 입력해 주세요.')
      return
    }

    // TODO: createProblemSetMutation.mutate({ groupId, name: trimmedName })
    alert(`'${trimmedName}' 문제집이 생성되었습니다.`)
    handleCloseCreateModal()
    void queryClient.invalidateQueries({ queryKey: ['problemSets', groupId] })
  }

  // 문제집 삭제 핸들러 (추후 deleteProblemSet Mutation 적용)
  function handleDeleteProblemSet() {
    alert('삭제할 문제집을 선택해 주세요.')
  }

  const problemSets = problemSetsQuery.data ?? []

  return (
    <VStack width="100%" gap={6}>
      {/* 1. 상단 액션 버튼 영역 */}
      <HStack width="100%" hAlign="end" gap={2}>
        <Button
          label="문제집 삭제"
          size="sm"
          variant="secondary"
          icon={<Icon icon={Trash2} size="sm" />}
          onClick={handleDeleteProblemSet}
        />
        <Button
          label="문제집 생성"
          size="sm"
          variant="primary"
          icon={<Icon icon={Plus} size="sm" />}
          onClick={handleOpenCreateModal}
        />
      </HStack>

      {/* 2. 조건부 상태 렌더링 */}
      {problemSetsQuery.isPending ? (
        <Skeleton width="100%" height={48} radius={2} />
      ) : problemSetsQuery.isError ? (
        <Banner
          status="error"
          title="문제집 목록을 불러오는 데 실패했습니다."
          endContent={
            <Button
              label="다시 시도"
              size="sm"
              variant="secondary"
              onClick={() => void problemSetsQuery.refetch()}
            />
          }
        />
      ) : problemSets.length === 0 ? (
        <EmptyState
          title="등록된 문제집이 없습니다."
          description="우측 상단의 '문제집 생성' 버튼을 눌러 새 문제집을 만들어 보세요."
          icon={<Icon icon={BookOpen} size="lg" color="secondary" />}
          headingLevel={2}
        />
      ) : (
        <List density="balanced" hasDividers>
          {problemSets.map((ps) => (
            <ListItem
              key={ps.id}
              label={ps.name}
              description={`생성일: ${new Date(ps.createdAt).toLocaleDateString()}`}
              startContent={
                <Icon icon={BookOpen} size="sm" color="secondary" />
              }
              endContent={
                <Badge
                  label={ps.isPublic ? '공개' : '비공개'}
                  variant={ps.isPublic ? 'blue' : 'neutral'}
                />
              }
            />
          ))}
        </List>
      )}

      {/* 3. 문제집 생성 모달 (Dialog) */}
      <Dialog
        isOpen={isCreateModalOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseCreateModal()
        }}
      >
        <VStack gap={4} padding={4}>
          <h2>문제집 생성</h2>
          <Text type="body">새로 생성할 문제집의 이름을 입력해 주세요.</Text>

          <TextInput
            label="문제집 이름"
            placeholder="예: 백준 DFS/BFS 기본 문제집"
            value={newProblemSetName}
            onChange={(valOrEvent: unknown) => {
              if (typeof valOrEvent === 'string') {
                setNewProblemSetName(valOrEvent)
              } else if (
                valOrEvent &&
                typeof valOrEvent === 'object' &&
                'target' in valOrEvent
              ) {
                const target = (
                  valOrEvent as React.ChangeEvent<HTMLInputElement>
                ).target
                setNewProblemSetName(target.value)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmitCreateProblemSet()
            }}
          />

          <HStack gap={2} hAlign="end" width="100%">
            <Button
              label="취소"
              variant="secondary"
              onClick={handleCloseCreateModal}
            />
            <Button
              label="생성하기"
              variant="primary"
              isDisabled={!newProblemSetName.trim()}
              onClick={handleSubmitCreateProblemSet}
            />
          </HStack>
        </VStack>
      </Dialog>
    </VStack>
  )
}
