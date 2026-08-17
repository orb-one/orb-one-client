// src/routes/groups_.$groupId_.problem-sets.$problemSetId.tsx
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
import { VStack } from '@astryxdesign/core/VStack'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ChevronRight, Code2 } from 'lucide-react'
import { useState } from 'react'

import { getProblemSetDetail } from '@/lib/api/problem-sets'
import { getSolution } from '@/lib/api/solutions'

export const Route = createFileRoute(
  '/groups_/$groupId_/problem-sets/$problemSetId',
)({
  component: ProblemSetDetailPage,
})

export function ProblemSetDetailPage() {
  const { groupId, problemSetId } = Route.useParams()
  const navigate = useNavigate()
  const [navigatingProblemId, setNavigatingProblemId] = useState<string | null>(
    null,
  )

  // 문제집 상세 및 문제 목록 조회
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

  // 풀이 이동 핸들러: GET /solutions/{solutionId} 호출 및 결과 분기
  async function handleGoToSolution(solutionId: string) {
    try {
      setNavigatingProblemId(solutionId)
      const solution = await getSolution(solutionId)

      // 200 OK -> 풀이 상세 페이지로 이동
      void navigate({
        to: '/solutions/$solutionId',
        params: { solutionId: solution.id },
      })
    } catch {
      // 404 Not Found 또는 기타 에러 -> alert 메시지 노출
      alert('풀이를 찾을 수 없습니다.')
    } finally {
      setNavigatingProblemId(null)
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
        {/* < 문제집 목록으로 돌아가기 */}
        <HStack width="100%">
          <Button
            label="문제집 목록으로 돌아가기"
            size="sm"
            variant="secondary"
            icon={<Icon icon={ArrowLeft} size="sm" />}
            onClick={() =>
              void navigate({
                to: '/groups/$groupId',
                params: { groupId },
              })
            }
          />
        </HStack>

        {/* 문제집 이름 헤더 */}
        <VStack width="100%" gap={2} paddingBlock={2}>
          {isLoading ? (
            <Skeleton width="260px" height="36px" />
          ) : (
            <Heading level={1}>{problemSet?.name ?? '문제집 상세'}</Heading>
          )}
        </VStack>

        {/* 메인 섹션 */}
        <Section
          width="100%"
          padding={6}
          style={{
            border:
              '1px solid var(--astryxdesign-color-border-subtle, #e2e8f0)',
            borderRadius: '12px',
          }}
        >
          {isLoading ? (
            <VStack gap={3} width="100%">
              <Skeleton width="100%" height={56} radius={2} />
              <Skeleton width="100%" height={56} radius={2} />
              <Skeleton width="100%" height={56} radius={2} />
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
                  onClick={() => void refetch()}
                />
              }
            />
          ) : !problemSet || problemSet.problems.length === 0 ? (
            <EmptyState
              title="등록된 문제가 없습니다."
              description="이 문제집에 등록된 문제가 아직 없습니다."
              icon={<Icon icon={Code2} size="lg" color="secondary" />}
              headingLevel={2}
            />
          ) : (
            <List density="balanced" hasDividers>
              {problemSet.problems.map((problem) => {
                const isNavigating = navigatingProblemId === problem.problemId

                return (
                  <ListItem
                    key={problem.problemId}
                    label={`[${problem.provider} ${problem.externalProblemId}] ${problem.name}`}
                    description={`난이도: ${problem.difficulty}`}
                    startContent={
                      <Icon icon={Code2} size="sm" color="secondary" />
                    }
                    endContent={
                      <HStack vAlign="center" gap={3}>
                        <Badge label={problem.difficulty} variant="neutral" />
                        <Button
                          label={isNavigating ? '조회 중...' : '풀이로 이동'}
                          size="sm"
                          variant="secondary"
                          isDisabled={isNavigating}
                          icon={<Icon icon={ChevronRight} size="sm" />}
                          onClick={() => {
                            void handleGoToSolution(problem.problemId)
                          }}
                        />
                      </HStack>
                    }
                  />
                )
              })}
            </List>
          )}
        </Section>
      </VStack>
    </Center>
  )
}
