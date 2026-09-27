import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog } from '@astryxdesign/core/Dialog'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { List, ListItem } from '@astryxdesign/core/List'
import { Pagination } from '@astryxdesign/core/Pagination'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { BookOpen, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  createProblemSet,
  deleteProblemSet,
  getProblemSets,
  toProblemSetCreateRequest,
  type ProblemFormItem,
  type ProblemSetCreateRequest,
  type ProblemSetCreateResponse,
} from '@/lib/api/problem-sets'

interface ProblemSetTabProps {
  groupId: string
}

interface ApiErrorResponse extends Error {
  response?: {
    status?: number
    data?: { message?: string }
  }
}

const PROVIDER_OPTIONS = [
  { value: 'BOJ', label: 'BOJ' },
  { value: 'JUNGOL', label: 'JUNGOL' },
  { value: 'SWEA', label: 'SWEA' },
  { value: 'PROGRAMMERS', label: 'PROGRAMMERS' },
  { value: 'LEETCODE', label: 'LEETCODE' },
]

const INITIAL_PROBLEM: ProblemFormItem = {
  provider: 'BOJ',
  externalProblemId: '',
  name: '',
  difficulty: '',
  url: '',
}

export function ProblemSetTab({ groupId }: ProblemSetTabProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // 1. 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newProblemSetName, setNewProblemSetName] = useState('')
  const [problems, setProblems] = useState<ProblemFormItem[]>([
    { ...INITIAL_PROBLEM },
  ])

  // 2. 문제집 목록 조회 Query
  const problemSetsQuery = useQuery({
    queryKey: ['problemSets', groupId, currentPage, pageSize],
    queryFn: () =>
      getProblemSets(groupId, { page: currentPage - 1, size: pageSize }),
    placeholderData: (previousData) => previousData,
    enabled: Boolean(groupId),
  })

  const problemSets = problemSetsQuery.data?.items ?? []
  const totalPages = problemSetsQuery.data?.totalPages ?? 1

  // 3. 문제집 생성 Mutation
  const createProblemSetMutation = useMutation<
    ProblemSetCreateResponse,
    Error,
    ProblemSetCreateRequest
  >({
    mutationFn: (requestDto) => createProblemSet(groupId, requestDto),
    onSuccess: (res) => {
      alert(`'${res.name}' 문제집이 성공적으로 생성되었습니다.`)
      handleCloseCreateModal()
      setCurrentPage(1)
      void queryClient.invalidateQueries({ queryKey: ['problemSets', groupId] })
    },
    onError: (err) => {
      alert(err.message || '문제집 생성 중 오류가 발생했습니다.')
    },
  })

  // 4. 문제집 삭제 Mutation
  const deleteProblemSetMutation = useMutation({
    mutationFn: ({ problemSetId }: { problemSetId: string; name: string }) =>
      deleteProblemSet(groupId, problemSetId),
    onSuccess: (_, variables) => {
      alert(`'${variables.name}' 문제집이 성공적으로 삭제되었습니다.`)
      void queryClient.invalidateQueries({ queryKey: ['problemSets', groupId] })
    },
    onError: (err: ApiErrorResponse) => {
      const status = err.response?.status
      const serverMessage = err.response?.data?.message

      if (status !== undefined) {
        // 서버 응답 에러
        alert(
          serverMessage ??
            `오류가 발생했습니다. (상태 코드: ${String(status)})`,
        )
      } else {
        alert(
          serverMessage ??
            (err.message !== ''
              ? err.message
              : '문제집 삭제 중 오류가 발생했습니다.'),
        )
      }
    },
  })

  // 필수 필드 입력 여부 검증
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
    value: string,
  ) {
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

    const requestDto = toProblemSetCreateRequest(trimmedName, problems)
    createProblemSetMutation.mutate(requestDto)
  }

  function handleDeleteProblemSet(
    problemSetId: string,
    problemSetName: string,
  ) {
    if (confirm(`'${problemSetName}' 문제집을 정말 삭제하시겠습니까?`)) {
      deleteProblemSetMutation.mutate({
        problemSetId,
        name: problemSetName,
      })
    }
  }

  function handleNavigateToProblemSetDetail(problemSetId: string) {
    void navigate({
      to: '/groups/$groupId/problem-sets/$problemSetId',
      params: { groupId, problemSetId },
    })
  }

  return (
    <VStack width="100%" gap={6}>
      {/* 상단 액션 버튼 */}
      <HStack width="100%" hAlign="end">
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
        <VStack width="100%" gap={6}>
          <List density="balanced" hasDividers>
            {problemSets.map((ps) => {
              const isDeletingThis =
                deleteProblemSetMutation.isPending &&
                deleteProblemSetMutation.variables.problemSetId ===
                  ps.problemSetId

              return (
                <div
                  key={ps.problemSetId}
                  onClick={() => {
                    handleNavigateToProblemSetDetail(ps.problemSetId)
                  }}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="클릭하여 문제 목록으로 이동"
                >
                  <ListItem
                    label={ps.name}
                    description={`문제 수: ${String(ps.problemCount)}개 · 생성일: ${new Date(ps.createdAt).toLocaleDateString()}`}
                    startContent={
                      <Icon icon={BookOpen} size="sm" color="secondary" />
                    }
                    endContent={
                      <Button
                        label={isDeletingThis ? '삭제 중...' : '삭제'}
                        size="sm"
                        variant="destructive"
                        isDisabled={deleteProblemSetMutation.isPending}
                        icon={<Icon icon={Trash2} size="sm" />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteProblemSet(ps.problemSetId, ps.name)
                        }}
                      />
                    }
                  />
                </div>
              )
            })}
          </List>

          {/* Pagination 컴포넌트 */}
          <HStack hAlign="center" width="100%">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              isDisabled={problemSetsQuery.isFetching}
              onChange={(page: number) => {
                setCurrentPage(page)
              }}
            />
          </HStack>
        </VStack>
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
            새로 생성할 문제집의 이름과 포함할 문제들을 입력해 주세요.
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
                gap={3}
                padding={4}
                style={{
                  border: '1px solid var(--color-border-subtle, #e2e8f0)',
                  borderRadius: '10px',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
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

                {/* 플랫폼 + 문제 번호 */}
                <HStack width="100%" gap={3}>
                  <VStack gap={1} style={{ flex: 1, minWidth: 0 }}>
                    <label
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--color-text-secondary, #6b7280)',
                        lineHeight: 1.4,
                      }}
                    >
                      플랫폼
                    </label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <select
                        value={problem.provider}
                        onChange={(e) => {
                          handleProblemChange(index, 'provider', e.target.value)
                        }}
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 32px 0 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          backgroundColor: '#ffffff',
                          color: '#111827',
                          fontSize: '13px',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          outline: 'none',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                        }}
                      >
                        {PROVIDER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          right: '10px',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#6b7280',
                        }}
                      >
                        <Icon icon={ChevronDown} size="sm" />
                      </div>
                    </div>
                  </VStack>

                  <div style={{ flex: 1, minWidth: 0, fontSize: '13px' }}>
                    <TextInput
                      label="문제 번호"
                      placeholder="예: 1204"
                      value={problem.externalProblemId}
                      onChange={(v: unknown) => {
                        const val =
                          typeof v === 'string'
                            ? v
                            : v && typeof v === 'object' && 'target' in v
                              ? (v as React.ChangeEvent<HTMLInputElement>)
                                  .target.value
                              : ''
                        handleProblemChange(index, 'externalProblemId', val)
                      }}
                    />
                  </div>
                </HStack>

                {/* 문제 이름 + 난이도 */}
                <HStack width="100%" gap={3}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: '13px' }}>
                    <TextInput
                      label="문제 이름"
                      placeholder="예: 최빈수 구하기"
                      value={problem.name}
                      onChange={(v: unknown) => {
                        const val =
                          typeof v === 'string'
                            ? v
                            : v && typeof v === 'object' && 'target' in v
                              ? (v as React.ChangeEvent<HTMLInputElement>)
                                  .target.value
                              : ''
                        handleProblemChange(index, 'name', val)
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: '13px' }}>
                    <TextInput
                      label="난이도"
                      placeholder="예: GOLD_3"
                      value={problem.difficulty}
                      onChange={(v: unknown) => {
                        const val =
                          typeof v === 'string'
                            ? v
                            : v && typeof v === 'object' && 'target' in v
                              ? (v as React.ChangeEvent<HTMLInputElement>)
                                  .target.value
                              : ''
                        handleProblemChange(index, 'difficulty', val)
                      }}
                    />
                  </div>
                </HStack>

                {/* 문제 URL */}
                <div style={{ width: '100%', fontSize: '13px' }}>
                  <TextInput
                    label="문제 URL"
                    placeholder="https://..."
                    value={problem.url}
                    onChange={(v: unknown) => {
                      const val =
                        typeof v === 'string'
                          ? v
                          : v && typeof v === 'object' && 'target' in v
                            ? (v as React.ChangeEvent<HTMLInputElement>).target
                                .value
                            : ''
                      handleProblemChange(index, 'url', val)
                    }}
                  />
                </div>
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
