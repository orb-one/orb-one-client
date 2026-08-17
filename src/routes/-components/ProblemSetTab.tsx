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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  createProblemSet,
  getProblemSets,
  toProblemSetCreateRequest,
  type ProblemFormItem,
  type ProblemSetCreateRequest,
  type ProblemSetCreateResponse,
} from '@/lib/api/problem-sets'

interface ProblemSetTabProps {
  groupId: string
}

const INITIAL_PROBLEM: ProblemFormItem = {
  provider: '',
  externalProblemId: '',
  name: '',
  url: '',
}

export function ProblemSetTab({ groupId }: ProblemSetTabProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newProblemSetName, setNewProblemSetName] = useState('')
  const [problems, setProblems] = useState<ProblemFormItem[]>([
    { ...INITIAL_PROBLEM },
  ])

  // 문제집 목록 조회 Query
  const problemSetsQuery = useQuery({
    queryKey: ['problemSets', groupId],
    queryFn: () => getProblemSets(groupId),
    enabled: Boolean(groupId),
  })

  // 문제집 생성 Mutation
  const createProblemSetMutation = useMutation<
    ProblemSetCreateResponse,
    Error,
    ProblemSetCreateRequest
  >({
    mutationFn: (requestDto) => createProblemSet(groupId, requestDto),
    onSuccess: (res) => {
      alert(`'${res.name}' 문제집이 성공적으로 생성되었습니다.`)
      handleCloseCreateModal()
      void queryClient.invalidateQueries({ queryKey: ['problemSets', groupId] })
    },
    onError: (err) => {
      alert(err.message || '문제집 생성 중 오류가 발생했습니다.')
    },
  })

  // 모든 필드 필수 입력 여부 검증
  const isFormValid =
    Boolean(newProblemSetName.trim()) &&
    problems.length > 0 &&
    problems.every(
      (p) =>
        Boolean(p.provider.trim()) &&
        Boolean(p.externalProblemId.trim()) &&
        Boolean(p.name.trim()) &&
        Boolean(p.url.trim()),
    )

  function handleOpenCreateModal() {
    setNewProblemSetName('')
    setProblems([{ ...INITIAL_PROBLEM }])
    setIsCreateModalOpen(true)
  }

  function handleCloseCreateModal() {
    setNewProblemSetName('')
    setProblems([{ ...INITIAL_PROBLEM }])
    setIsCreateModalOpen(false)
  }

  function handleProblemChange(
    index: number,
    field: keyof ProblemFormItem,
    valOrEvent: unknown,
  ) {
    const value =
      typeof valOrEvent === 'string'
        ? valOrEvent
        : valOrEvent && typeof valOrEvent === 'object' && 'target' in valOrEvent
          ? (valOrEvent as React.ChangeEvent<HTMLInputElement>).target.value
          : ''

    setProblems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item,
      ),
    )
  }

  function handleAddProblemField() {
    setProblems((prev) => [...prev, { ...INITIAL_PROBLEM }])
  }

  function handleRemoveProblemField(index: number) {
    if (problems.length === 1) {
      alert('최소 1개 이상의 문제가 포함되어야 합니다.')
      return
    }
    setProblems((prev) => prev.filter((_, idx) => idx !== index))
  }

  function handleSubmitCreateProblemSet() {
    const trimmedName = newProblemSetName.trim()
    if (!trimmedName) {
      alert('문제집 이름을 입력해 주세요.')
      return
    }

    for (let i = 0; i < problems.length; i++) {
      const p = problems[i]
      if (!p) {
        continue
      }

      if (
        !p.provider.trim() ||
        !p.externalProblemId.trim() ||
        !p.name.trim() ||
        !p.url.trim()
      ) {
        alert(
          `${String(i + 1)}번째 문제의 모든 필수 필드(플랫폼, 번호, 이름, 링크)를 입력해 주세요.`,
        )
        return
      }
    }

    // Domain Model -> DTO 변환 후 API 호출
    const requestDto = toProblemSetCreateRequest(trimmedName, problems)
    createProblemSetMutation.mutate(requestDto)
  }

  function handleDeleteProblemSet() {
    alert('삭제할 문제집을 선택해 주세요.')
  }

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
          onClick={() => {
            handleDeleteProblemSet()
          }}
        />
        <Button
          label="문제집 생성"
          size="sm"
          variant="primary"
          icon={<Icon icon={Plus} size="sm" />}
          onClick={() => {
            handleOpenCreateModal()
          }}
        />
      </HStack>

      {/* 문제집 목록 상태별 렌더링 */}
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
              onClick={() => {
                void problemSetsQuery.refetch()
              }}
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
          if (!open) {
            handleCloseCreateModal()
          }
        }}
      >
        <VStack
          width="100%"
          gap={4}
          padding={4}
          style={{
            maxHeight: '80vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <h2 style={{ fontWeight: 'bold', margin: 0 }}>문제집 생성</h2>
          <Text type="body">
            새로 생성할 문제집의 이름과 포함할 문제들을 입력해 주세요. (모든
            항목 필수)
          </Text>

          <TextInput
            label="문제집 이름"
            placeholder="예: 그리디 알고리즘 모음"
            value={newProblemSetName}
            onChange={(val: unknown) => {
              if (typeof val === 'string') {
                setNewProblemSetName(val)
              } else if (val && typeof val === 'object' && 'target' in val) {
                setNewProblemSetName(
                  (val as React.ChangeEvent<HTMLInputElement>).target.value,
                )
              }
            }}
          />

          <VStack gap={3} width="100%" style={{ boxSizing: 'border-box' }}>
            <HStack width="100%" vAlign="center">
              <Text type="body">
                {`포함할 문제 목록 (${String(problems.length)}개)`}
                <strong>
                  <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                </strong>
              </Text>
              <div style={{ flex: 1 }} />
              <Button
                label="문제 추가"
                size="sm"
                variant="secondary"
                icon={<Icon icon={Plus} size="sm" />}
                onClick={() => {
                  handleAddProblemField()
                }}
              />
            </HStack>

            {problems.map((problem, index) => (
              <VStack
                key={index}
                width="100%"
                gap={2}
                padding={3}
                style={{
                  border: '1px solid var(--color-border-subtle, #e2e8f0)',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                }}
              >
                <HStack width="100%" vAlign="center">
                  <Text type="body">
                    <strong>{`문제 #${String(index + 1)}`}</strong>
                  </Text>
                  <div style={{ flex: 1 }} />
                  {problems.length > 1 && (
                    <Button
                      label="삭제"
                      size="sm"
                      variant="destructive"
                      icon={<Icon icon={Trash2} size="sm" />}
                      onClick={() => {
                        handleRemoveProblemField(index)
                      }}
                    />
                  )}
                </HStack>

                <HStack width="100%" gap={2}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TextInput
                      label="플랫폼 (Provider)"
                      placeholder="예: SWEA"
                      value={problem.provider}
                      onChange={(v) => {
                        handleProblemChange(index, 'provider', v)
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TextInput
                      label="문제 번호 (ID)"
                      placeholder="예: 1204"
                      value={problem.externalProblemId}
                      onChange={(v) => {
                        handleProblemChange(index, 'externalProblemId', v)
                      }}
                    />
                  </div>
                </HStack>

                <TextInput
                  label="문제 이름"
                  placeholder="예: 최빈수 구하기"
                  value={problem.name}
                  onChange={(v) => {
                    handleProblemChange(index, 'name', v)
                  }}
                />

                <TextInput
                  label="문제 링크 (URL)"
                  placeholder="https://..."
                  value={problem.url}
                  onChange={(v) => {
                    handleProblemChange(index, 'url', v)
                  }}
                />
              </VStack>
            ))}
          </VStack>

          <HStack width="100%" hAlign="end" gap={2}>
            <Button
              label="취소"
              variant="secondary"
              isDisabled={createProblemSetMutation.isPending}
              onClick={() => {
                handleCloseCreateModal()
              }}
            />
            <Button
              label={
                createProblemSetMutation.isPending ? '생성 중...' : '생성하기'
              }
              variant="primary"
              isDisabled={!isFormValid || createProblemSetMutation.isPending}
              onClick={() => {
                handleSubmitCreateProblemSet()
              }}
            />
          </HStack>
        </VStack>
      </Dialog>
    </VStack>
  )
}
