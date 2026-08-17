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
import { useNavigate } from '@tanstack/react-router'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { getProblemSets } from '@/lib/api/problem-sets'

interface ProblemSetTabProps {
  groupId: string
}

export function ProblemSetTab({ groupId }: ProblemSetTabProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newProblemSetName, setNewProblemSetName] = useState('')

  const problemSetsQuery = useQuery({
    queryKey: ['problemSets', groupId],
    queryFn: () => getProblemSets(groupId),
    enabled: Boolean(groupId),
  })

  function handleOpenCreateModal() {
    setNewProblemSetName('')
    setIsCreateModalOpen(true)
  }

  function handleCloseCreateModal() {
    setNewProblemSetName('')
    setIsCreateModalOpen(false)
  }

  function handleSubmitCreateProblemSet() {
    const trimmedName = newProblemSetName.trim()
    if (!trimmedName) {
      alert('문제집 이름을 입력해 주세요.')
      return
    }

    alert(`'${trimmedName}' 문제집이 생성되었습니다.`)
    handleCloseCreateModal()
    void queryClient.invalidateQueries({ queryKey: ['problemSets', groupId] })
  }

  function handleDeleteProblemSet() {
    alert('삭제할 문제집을 선택해 주세요.')
  }

  // 더블 클릭 시 문제집 상세 페이지로 이동
  function handleNavigateToProblemSetDetail(problemSetId: string) {
    void navigate({
      to: '/groups/$groupId/problem-sets/$problemSetId',
      params: { groupId, problemSetId },
    })
  }

  const problemSets = problemSetsQuery.data ?? []

  return (
    <VStack width="100%" gap={6}>
      {/* 상단 액션 버튼 */}
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

      {/* 상태별 화면 및 문제집 목록 */}
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
            <div
              key={ps.problemSetId}
              onDoubleClick={() => {
                handleNavigateToProblemSetDetail(ps.problemSetId)
              }}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              title="더블 클릭하여 문제 목록으로 이동"
            >
              <ListItem
                label={ps.name}
                description={`문제 수: ${String(ps.problemCount)}개 · 생성일: ${new Date(ps.createdAt).toLocaleDateString()}`}
                startContent={
                  <Icon icon={BookOpen} size="sm" color="secondary" />
                }
                endContent={
                  <Badge
                    label={`${String(ps.problemCount)}문제`}
                    variant="neutral"
                  />
                }
              />
            </div>
          ))}
        </List>
      )}

      {/* 문제집 생성 모달 */}
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
