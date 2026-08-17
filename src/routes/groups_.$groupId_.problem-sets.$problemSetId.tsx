import { Badge } from '@astryxdesign/core/Badge'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Code2,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'

import { getProblemSetDetail } from '@/lib/api/problem-sets'

export const Route = createFileRoute(
  '/groups_/$groupId_/problem-sets/$problemSetId',
)({
  component: ProblemSetDetailPage,
})

export function ProblemSetDetailPage() {
  const { groupId, problemSetId } = Route.useParams()
  const navigate = useNavigate()

  const [expandedProblemId, setExpandedProblemId] = useState<string | null>(
    null,
  )

  const {
    data: problemSet,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['problemSetDetail', groupId, problemSetId],
    queryFn: () => getProblemSetDetail(groupId, problemSetId),
    enabled: Boolean(groupId && problemSetId),
  })

  function handleToggleExpand(problemId: string) {
    setExpandedProblemId((prev) => (prev === problemId ? null : problemId))
  }

  function handleGoToSolution(problemId: string) {
    void navigate({
      to: '/solutions',
      search: { problemId },
    })
  }

  const problems = problemSet?.problems ?? []
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
                  label={`총 ${String(problems.length)}문제`}
                  variant="neutral"
                />
              </HStack>

              {/* 메타 요약 칩 */}
              <HStack gap={4} wrap="wrap" vAlign="center">
                <HStack gap={1} vAlign="center">
                  <Icon icon={Calendar} size="sm" color="secondary" />
                  <Text type="supporting" color="secondary">
                    생성일: {createdDate}
                  </Text>
                </HStack>
              </HStack>
            </VStack>
          )}
        </VStack>

        {/* 상태별 콘텐츠 렌더링 */}
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
            description="이 문제집에 포함된 문제가 아직 없습니다."
            icon={<Icon icon={Code2} size="lg" color="secondary" />}
            headingLevel={2}
          />
        ) : (
          /* 개별 모던 카드 목록 */
          <VStack gap={3} width="100%">
            {problems.map((problem, index) => {
              const isExpanded = expandedProblemId === problem.problemId

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
                      {/* 좌측: 번호 인덱스 + 플랫폼 뱃지 + 문제명 */}
                      <HStack vAlign="center" gap={3} style={{ minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: 'var(--color-text-secondary, #64748b)',
                            fontSize: '14px',
                            minWidth: '24px',
                          }}
                        >
                          {String(index + 1).padStart(2, '0')}
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

                      {/* 우측: 난이도 + 풀이 버튼 + 토글 아이콘 */}
                      <HStack vAlign="center" gap={2}>
                        <Badge label={problem.difficulty} variant="neutral" />
                        <Button
                          label="풀이 보기"
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleGoToSolution(problem.problemId)
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

                  {/* 펼쳐지는 상세 패널 */}
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
                              <Icon icon={Sparkles} size="sm" color="accent" />
                              <Text type="body">
                                <strong>{problem.difficulty}</strong>
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
        )}
      </VStack>
    </Center>
  )
}
