import { Badge } from '@astryxdesign/core/Badge'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Pagination } from '@astryxdesign/core/Pagination'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
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

import { PageBackLink } from '@/components/navigation/page-back-link'
import { ProblemSetAddProblemsDialog } from '@/components/problems/problem-set-add-problems-dialog'
import {
  addProblemsToProblemSet,
  deleteProblemFromProblemSet,
  getProblemSetDetail,
  type AddProblemsRequest,
  type AddProblemsResponse,
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

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

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
  })

  // 추가 실패 시 모달에 표시
  const addProblemsErrorMessage = addProblemsMutation.isError
    ? (addProblemsMutation.error.response?.data?.message ??
      (addProblemsMutation.error.message.trim() !== ''
        ? addProblemsMutation.error.message
        : '문제 추가 중 오류가 발생했습니다.'))
    : null

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

  function handleOpenAddModal() {
    if (addProblemsMutation.isPending) return

    // 이전 요청의 오류를 초기화
    addProblemsMutation.reset()
    setIsAddModalOpen(true)
  }

  function handleCloseAddModal() {
    setIsAddModalOpen(false)
  }

  function handleSubmitAddProblems(problemIds: string[]) {
    if (addProblemsMutation.isPending || problemIds.length === 0) {
      return
    }

    addProblemsMutation.mutate({
      problemIds: [...new Set(problemIds)],
    })
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
        <VStack width="100%" gap={2}>
          <PageBackLink
            href={`/groups/${encodeURIComponent(groupId)}?tab=problem-sets`}
            label="문제집 목록으로 돌아가기"
          />

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
                  label={
                    addProblemsMutation.isPending ? '추가 중...' : '문제 추가'
                  }
                  size="sm"
                  variant="primary"
                  icon={<Icon icon={Plus} size="sm" />}
                  isDisabled={addProblemsMutation.isPending}
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
            description="우측 상단의 '문제 추가' 버튼을 눌러 문제를 선택해 보세요."
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

                    {/* 문제 상세 */}
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

                          {/* 외부 문제 링크 */}
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

        {/* 성공 시에만 닫고, 실패하면 선택 상태 유지 */}
        {isAddModalOpen && (
          <ProblemSetAddProblemsDialog
            isSubmitting={addProblemsMutation.isPending}
            errorMessage={addProblemsErrorMessage}
            onClose={handleCloseAddModal}
            onSubmit={handleSubmitAddProblems}
          />
        )}
      </VStack>
    </Center>
  )
}
