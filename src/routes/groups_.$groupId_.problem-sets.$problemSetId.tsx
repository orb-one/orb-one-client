import { Badge } from '@astryxdesign/core/Badge'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { Dialog } from '@astryxdesign/core/Dialog'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Pagination } from '@astryxdesign/core/Pagination'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Code2,
  ExternalLink,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'

import {
  addProblemsToProblemSet,
  deleteProblemFromProblemSet,
  getProblemSetDetail,
  toAddProblemsRequest,
  type AddProblemsRequest,
  type AddProblemsResponse,
  type ProblemFormItem,
} from '@/lib/api/problem-sets'

export const Route = createFileRoute(
  '/groups_/$groupId_/problem-sets/$problemSetId',
)({
  component: ProblemSetDetailPage,
})

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

export function ProblemSetDetailPage() {
  const { groupId, problemSetId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // 1. 페이지네이션 상태 관리
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const [expandedProblemId, setExpandedProblemId] = useState<string | null>(
    null,
  )

  // 문제 추가 모달 상태 관리
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [problemsToAdd, setProblemsToAdd] = useState<ProblemFormItem[]>([
    { ...INITIAL_PROBLEM },
  ])

  // 2. 문제집 상세 및 문제 목록 조회 Query
  const {
    data: problemSet,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      'problemSetDetail',
      groupId,
      problemSetId,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      getProblemSetDetail(groupId, problemSetId, {
        page: currentPage - 1,
        size: pageSize,
      }),
    placeholderData: (previousData) => previousData,
    enabled: Boolean(groupId && problemSetId),
  })

  const problems = problemSet?.problems ?? []
  const totalPages = problemSet?.totalPages ?? 1
  const totalCount = problemSet?.totalCount ?? 0

  // 3. 문제 추가 Mutation
  const addProblemsMutation = useMutation<
    AddProblemsResponse,
    ApiErrorResponse,
    AddProblemsRequest
  >({
    mutationFn: (requestDto) =>
      addProblemsToProblemSet(groupId, problemSetId, requestDto),
    onSuccess: () => {
      alert('문제가 성공적으로 추가되었습니다.')
      handleCloseAddModal()
      void queryClient.invalidateQueries({
        queryKey: ['problemSetDetail', groupId, problemSetId],
      })
    },
    onError: (err) => {
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
              : '문제 추가 중 오류가 발생했습니다.'),
        )
      }
    },
  })

  // 4. 문제 삭제 Mutation
  const deleteProblemMutation = useMutation({
    mutationFn: ({ problemId }: { problemId: string; name: string }) =>
      deleteProblemFromProblemSet(groupId, problemSetId, problemId),
    onSuccess: (_, variables) => {
      alert(`'${variables.name}' 문제가 성공적으로 삭제되었습니다.`)

      if (problems.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1)
      }

      void queryClient.invalidateQueries({
        queryKey: ['problemSetDetail', groupId, problemSetId],
      })
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
              : '문제 삭제 중 오류가 발생했습니다.'),
        )
      }
    },
  })

  // 문제 추가 폼 유효성 검증
  const isAddFormValid =
    problemsToAdd.length > 0 &&
    problemsToAdd.every(
      (p) =>
        Boolean(p.provider.trim()) &&
        Boolean(p.externalProblemId.trim()) &&
        Boolean(p.name.trim()) &&
        Boolean(p.url.trim()),
    )

  function handleOpenAddModal() {
    setProblemsToAdd([{ ...INITIAL_PROBLEM }])
    setIsAddModalOpen(true)
  }

  function handleCloseAddModal() {
    setProblemsToAdd([{ ...INITIAL_PROBLEM }])
    setIsAddModalOpen(false)
  }

  function handleProblemChange(
    index: number,
    field: keyof ProblemFormItem,
    value: string,
  ) {
    setProblemsToAdd((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item,
      ),
    )
  }

  function handleAddProblemField() {
    setProblemsToAdd((prev) => [...prev, { ...INITIAL_PROBLEM }])
  }

  function handleRemoveProblemField(index: number) {
    if (problemsToAdd.length === 1) {
      alert('최소 1개 이상의 문제가 포함되어야 합니다.')
      return
    }
    setProblemsToAdd((prev) => prev.filter((_, idx) => idx !== index))
  }

  function handleSubmitAddProblems() {
    for (let i = 0; i < problemsToAdd.length; i++) {
      const p = problemsToAdd[i]
      if (!p) continue

      if (
        !p.provider.trim() ||
        !p.externalProblemId.trim() ||
        !p.name.trim() ||
        !p.url.trim()
      ) {
        alert(
          `${String(i + 1)}번째 문제의 모든 필수 항목(플랫폼, 번호, 이름, 링크)을 입력해 주세요.`,
        )
        return
      }
    }

    const requestDto = toAddProblemsRequest(problemsToAdd)
    addProblemsMutation.mutate(requestDto)
  }

  function handleToggleExpand(problemId: string) {
    setExpandedProblemId((prev) => (prev === problemId ? null : problemId))
  }

  function handleGoToSolution(problemId: string) {
    void navigate({
      to: '/solutions',
      search: { problemId },
    })
  }

  function handleDeleteProblem(problemId: string, problemName: string) {
    if (confirm(`'${problemName}' 문제를 문제집에서 삭제하시겠습니까?`)) {
      deleteProblemMutation.mutate({
        problemId,
        name: problemName,
      })
    }
  }

  const createdDate = problemSet?.createdAt
    ? new Date(problemSet.createdAt).toLocaleDateString()
    : '-'

  return (
    <Center width="100%">
      <VStack
        width="100%"
        maxWidth={960}
        gap={6}
        paddingInline={4}
        paddingBlock={10}
      >
        {/* 상단 네비게이션 & 헤더 */}
        <VStack width="100%" gap={4}>
          <HStack width="100%" vAlign="center">
            <Button
              label="문제집 목록으로"
              size="sm"
              variant="ghost"
              icon={<Icon icon={ArrowLeft} size="sm" />}
              onClick={() => {
                void navigate({
                  to: '/groups/$groupId',
                  params: { groupId },
                })
              }}
            />
          </HStack>

          {isLoading ? (
            <VStack gap={2} width="100%">
              <Skeleton width="320px" height="40px" radius={2} />
              <Skeleton width="180px" height="24px" radius={2} />
            </VStack>
          ) : (
            <VStack gap={2} width="100%">
              <HStack vAlign="center" gap={3} wrap="wrap">
                <Heading level={1}>{problemSet?.name ?? '문제집 상세'}</Heading>
                <Badge
                  label={`총 ${String(totalCount)}문제`}
                  variant="neutral"
                />
              </HStack>

              {/* 생성일 + 문제 추가 버튼 */}
              <HStack
                width="100%"
                hAlign="between"
                vAlign="center"
                wrap="wrap"
                gap={2}
              >
                <HStack gap={1} vAlign="center">
                  <Icon icon={Calendar} size="sm" color="secondary" />
                  <Text type="supporting" color="secondary">
                    생성일: {createdDate}
                  </Text>
                </HStack>

                <Button
                  label="문제 추가"
                  size="sm"
                  variant="primary"
                  icon={<Icon icon={Plus} size="sm" />}
                  onClick={() => {
                    handleOpenAddModal()
                  }}
                />
              </HStack>
            </VStack>
          )}
        </VStack>

        {isLoading ? (
          <VStack gap={3} width="100%">
            <Skeleton width="100%" height={80} radius={3} />
            <Skeleton width="100%" height={80} radius={3} />
            <Skeleton width="100%" height={80} radius={3} />
          </VStack>
        ) : isError ? (
          <Banner
            status="error"
            title="문제 목록을 불러오지 못했습니다."
            endContent={
              <Button
                label="다시 시도"
                size="sm"
                variant="secondary"
                onClick={() => {
                  void refetch()
                }}
              />
            }
          />
        ) : problems.length === 0 ? (
          <EmptyState
            title="등록된 문제가 없습니다."
            description="우측 상단의 '문제 추가' 버튼을 눌러 새 문제를 추가해 보세요."
            icon={<Icon icon={Code2} size="lg" color="secondary" />}
            headingLevel={2}
          />
        ) : (
          /* 개별 문제 카드 목록 및 페이지네이션 */
          <VStack gap={4} width="100%">
            <VStack gap={3} width="100%">
              {problems.map((problem, index) => {
                const problemIndex = (currentPage - 1) * pageSize + index + 1
                const isExpanded = expandedProblemId === problem.problemId
                const isDeletingThis =
                  deleteProblemMutation.isPending &&
                  deleteProblemMutation.variables.problemId ===
                    problem.problemId

                return (
                  <div
                    key={problem.problemId}
                    style={{
                      backgroundColor: 'var(--color-bg-surface, #ffffff)',
                      border: isExpanded
                        ? '1px solid var(--color-border-accent, #3b82f6)'
                        : '1px solid var(--color-border-subtle, #e2e8f0)',
                      borderRadius: '12px',
                      boxShadow: isExpanded
                        ? '0 4px 12px rgba(0, 0, 0, 0.05)'
                        : '0 1px 3px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.2s ease-in-out',
                      overflow: 'hidden',
                    }}
                  >
                    {/* 카드 헤더 */}
                    <div
                      onClick={() => {
                        handleToggleExpand(problem.problemId)
                      }}
                      style={{
                        padding: '16px 20px',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <HStack
                        width="100%"
                        vAlign="center"
                        hAlign="between"
                        gap={3}
                        wrap="wrap"
                      >
                        {/* 번호 + 플랫폼 + 문제명 + 번호 */}
                        <HStack vAlign="center" gap={3} style={{ minWidth: 0 }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: 'var(--color-text-secondary, #64748b)',
                              fontSize: '14px',
                              minWidth: '24px',
                            }}
                          >
                            {String(problemIndex).padStart(2, '0')}
                          </span>
                          <Badge label={problem.provider} variant="neutral" />
                          <Text type="body">
                            <strong>{problem.name}</strong>
                          </Text>
                          <span
                            style={{
                              color: 'var(--color-text-tertiary, #94a3b8)',
                              fontSize: '13px',
                            }}
                          >
                            #{problem.externalProblemId}
                          </span>
                        </HStack>

                        {/* 풀이 + 삭제 */}
                        <HStack vAlign="center" gap={2}>
                          <Button
                            label="풀이"
                            size="sm"
                            variant="secondary"
                            icon={<Icon icon={Code2} size="sm" />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGoToSolution(problem.problemId)
                            }}
                          />
                          <Button
                            label={isDeletingThis ? '삭제 중...' : '삭제'}
                            size="sm"
                            variant="destructive"
                            isDisabled={deleteProblemMutation.isPending}
                            icon={<Icon icon={Trash2} size="sm" />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteProblem(
                                problem.problemId,
                                problem.name,
                              )
                            }}
                          />
                          <div
                            style={{
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              color: 'var(--color-text-secondary, #64748b)',
                            }}
                          >
                            <Icon
                              icon={isExpanded ? ChevronUp : ChevronDown}
                              size="sm"
                              color="inherit"
                            />
                          </div>
                        </HStack>
                      </HStack>
                    </div>

                    {/* 상세 패널 */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: '16px 20px',
                          backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                          borderTop:
                            '1px solid var(--color-border-subtle, #e2e8f0)',
                        }}
                      >
                        <VStack gap={3} width="100%">
                          <HStack
                            width="100%"
                            gap={6}
                            wrap="wrap"
                            vAlign="center"
                          >
                            <VStack gap={0.5}>
                              <Text type="supporting" color="secondary">
                                플랫폼
                              </Text>
                              <Text type="body">
                                <code
                                  style={{
                                    fontSize: '12px',
                                    padding: '2px 6px',
                                    backgroundColor: '#e2e8f0',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {problem.provider}
                                </code>
                              </Text>
                            </VStack>

                            <VStack gap={0.5}>
                              <Text type="supporting" color="secondary">
                                문제 번호
                              </Text>
                              <Text type="body">
                                <code
                                  style={{
                                    fontSize: '12px',
                                    padding: '2px 6px',
                                    backgroundColor: '#e2e8f0',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {problem.externalProblemId}
                                </code>
                              </Text>
                            </VStack>

                            <VStack gap={0.5}>
                              <Text type="supporting" color="secondary">
                                난이도 수준
                              </Text>
                              <HStack vAlign="center" gap={1}>
                                <Icon
                                  icon={Sparkles}
                                  size="sm"
                                  color="accent"
                                />
                                <Text type="body">
                                  <strong>
                                    {problem.difficulty ?? '미지정'}
                                  </strong>
                                </Text>
                              </HStack>
                            </VStack>
                          </HStack>

                          {/* 외부 링크 바로가기 바 */}
                          {problem.url ? (
                            <div
                              style={{
                                marginTop: '4px',
                                padding: '10px 14px',
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                border:
                                  '1px solid var(--color-border-subtle, #e2e8f0)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <HStack
                                gap={2}
                                vAlign="center"
                                style={{ minWidth: 0 }}
                              >
                                <Icon
                                  icon={ExternalLink}
                                  size="sm"
                                  color="accent"
                                />
                                <Text type="body" color="secondary">
                                  <span
                                    style={{
                                      maxWidth: '500px',
                                      display: 'inline-block',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      verticalAlign: 'bottom',
                                    }}
                                  >
                                    {problem.url}
                                  </span>
                                </Text>
                              </HStack>
                              <a
                                href={problem.url}
                                target="_blank"
                                rel="noreferrer noopener"
                                style={{
                                  color: '#2563eb',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                }}
                              >
                                문제 원문 열기 ↗
                              </a>
                            </div>
                          ) : null}
                        </VStack>
                      </div>
                    )}
                  </div>
                )
              })}
            </VStack>

            {/* Pagination 컴포넌트 */}
            <HStack hAlign="center" width="100%">
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                isDisabled={isFetching}
                onChange={(page: number) => {
                  setCurrentPage(page)
                }}
              />
            </HStack>
          </VStack>
        )}

        {/* 문제 추가 전용 모달 */}
        <Dialog
          isOpen={isAddModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseAddModal()
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
            <h2 style={{ fontWeight: 'bold', margin: 0 }}>문제 추가</h2>
            <Text type="body">
              현재 문제집에 추가할 문제들을 입력해 주세요.
            </Text>

            <VStack gap={3} width="100%" style={{ boxSizing: 'border-box' }}>
              <HStack width="100%" vAlign="center">
                <Text type="body">
                  {`포함할 문제 목록 (${String(problemsToAdd.length)}개)`}
                  <strong>
                    <span style={{ color: '#ef4444', marginLeft: '2px' }}>
                      *
                    </span>
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

              {problemsToAdd.map((problem, index) => (
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
                    {problemsToAdd.length > 1 && (
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
                            handleProblemChange(
                              index,
                              'provider',
                              e.target.value,
                            )
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
                              ? (v as React.ChangeEvent<HTMLInputElement>)
                                  .target.value
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
                isDisabled={addProblemsMutation.isPending}
                onClick={() => {
                  handleCloseAddModal()
                }}
              />
              <Button
                label={
                  addProblemsMutation.isPending ? '추가 중...' : '추가하기'
                }
                variant="primary"
                isDisabled={!isAddFormValid || addProblemsMutation.isPending}
                onClick={() => {
                  handleSubmitAddProblems()
                }}
              />
            </HStack>
          </VStack>
        </Dialog>
      </VStack>
    </Center>
  )
}
