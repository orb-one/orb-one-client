import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Link } from '@astryxdesign/core/Link'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Section } from '@astryxdesign/core/Section'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { VStack } from '@astryxdesign/core/VStack'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { PageBackLink } from '@/components/navigation/page-back-link'
import { SolutionDeleteAction } from '@/components/solutions/solution-delete-action'
import { SolutionStatus } from '@/components/solutions/solution-status'
import type { CurrentUserResponse } from '@/lib/api/auth'
import { ApiError, AuthSessionExpiredError } from '@/lib/api/client'
import { currentUserQueryOptions } from '@/lib/auth/auth-queries'
import { useI18n } from '@/lib/i18n/use-translations'
import type { Problem } from '@/lib/problems/problem-model'
import { problemQueryOptions } from '@/lib/problems/problem-queries'
import {
  formatSolutionDate,
  formatSolutionElapsedTime,
  formatSolutionMemoryUsage,
} from '@/lib/solutions/solution-format'
import type { SolutionDetail } from '@/lib/solutions/solution-model'
import {
  solutionQueryKeys,
  solutionQueryOptions,
} from '@/lib/solutions/solution-queries'

const SolutionCodeBlock = lazy(() =>
  import('@/components/solutions/solution-code-block').then(
    ({ SolutionCodeBlock }) => ({
      default: SolutionCodeBlock,
    }),
  ),
)

const SolutionMarkdown = lazy(() =>
  import('@/components/solutions/solution-markdown').then(
    ({ SolutionMarkdown }) => ({
      default: SolutionMarkdown,
    }),
  ),
)

export const Route = createFileRoute('/solutions_/$solutionId')({
  component: SolutionDetailRoute,
})

function SolutionDetailRoute() {
  const { solutionId } = Route.useParams()

  return <SolutionDetailPage solutionId={solutionId} />
}

export function SolutionDetailPage({ solutionId }: SolutionDetailPageProps) {
  const { t } = useI18n()
  const copy = t.solutions.detail
  const solutionQuery = useQuery(solutionQueryOptions(solutionId))
  const currentUserQuery = useQuery(currentUserQueryOptions())
  const problemQuery = useQuery({
    ...problemQueryOptions(solutionQuery.data?.problemId ?? ''),
    enabled: solutionQuery.data !== undefined,
  })
  const isAuthRequired = solutionQuery.error instanceof AuthSessionExpiredError
  const isNotFound =
    solutionQuery.error instanceof ApiError &&
    solutionQuery.error.status === 404

  return (
    <Center width="100%">
      <VStack
        width="100%"
        maxWidth={1024}
        gap={2}
        paddingInline={4}
        paddingBlock={10}
      >
        {!solutionQuery.isPending && !solutionQuery.isError ? (
          <Text type="supporting" color="secondary">
            {copy.eyebrow}
          </Text>
        ) : null}
        <PageBackLink href="/solutions" label={copy.backToList} />

        {solutionQuery.isPending ? (
          <SolutionDetailSkeleton label={copy.loading} />
        ) : solutionQuery.isError ? (
          <Banner
            status={isAuthRequired ? 'info' : 'error'}
            title={
              isAuthRequired
                ? t.solutions.authRequired
                : isNotFound
                  ? copy.notFound
                  : copy.loadError
            }
            {...(isAuthRequired
              ? {
                  endContent: (
                    <Button
                      label={t.solutions.login}
                      href="/login"
                      size="sm"
                      variant="secondary"
                    />
                  ),
                }
              : !isNotFound
                ? {
                    endContent: (
                      <Button
                        label={copy.retry}
                        size="sm"
                        variant="secondary"
                        onClick={() => void solutionQuery.refetch()}
                      />
                    ),
                  }
                : {})}
          />
        ) : (
          <SolutionDetailContent
            solution={solutionQuery.data}
            problem={problemQuery.data ?? null}
            currentUser={currentUserQuery.data ?? null}
          />
        )}
      </VStack>
    </Center>
  )
}

function SolutionDetailContent({
  solution,
  problem,
  currentUser,
}: {
  solution: SolutionDetail
  problem: Problem | null
  currentUser: CurrentUserResponse | null
}) {
  const { locale, t } = useI18n()
  const copy = t.solutions.detail
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const createdAt = formatSolutionDate(solution.createdAt, locale)
  const updatedAt = formatSolutionDate(solution.updatedAt, locale)
  const isCurrentUser = currentUser?.id === solution.userId
  const currentUserNickname = currentUser?.nickname.trim()
  const responseAuthorNickname = solution.authorNickname?.trim()
  const fallbackAuthor =
    responseAuthorNickname && responseAuthorNickname.length > 0
      ? responseAuthorNickname
      : solution.userId
  const author = isCurrentUser
    ? currentUserNickname && currentUserNickname.length > 0
      ? `${currentUserNickname} (${copy.currentUserAuthor})`
      : fallbackAuthor
    : fallbackAuthor

  /** 삭제 완료 후 목록으로 이동하고 더 이상 유효하지 않은 상세 cache를 제거한다. */
  async function handleDeleted() {
    try {
      await navigate({ to: '/solutions' })
    } finally {
      queryClient.removeQueries({
        queryKey: solutionQueryKeys.detail(solution.id),
        exact: true,
      })
    }
  }

  return (
    <VStack gap={6} width="100%">
      <VStack gap={2} maxWidth={672}>
        <Heading level={1}>{problem?.name ?? solution.problemId}</Heading>
        {problem ? (
          <Text type="supporting" color="secondary">
            {problem.provider} {problem.externalId}
          </Text>
        ) : null}
        <SolutionStatus solution={solution} />
        {problem?.url ? (
          <Link
            href={problem.url}
            isExternalLink
            isStandalone
            newTabLabel={copy.openNewTab}
          >
            {copy.openProblem}
          </Link>
        ) : null}
        {isCurrentUser ? (
          <HStack gap={2} wrap="wrap">
            <Button
              label={copy.edit}
              href={`/solutions/${solution.id}/edit`}
              size="sm"
              variant="secondary"
            />
            <SolutionDeleteAction
              solutionId={solution.id}
              onDeleted={handleDeleted}
            />
          </HStack>
        ) : null}
      </VStack>

      <Section width="100%" padding={0} variant="transparent">
        <MetadataList
          title={<Heading level={2}>{copy.summaryTitle}</Heading>}
          orientation="horizontal"
        >
          {problem ? (
            <>
              <MetadataListItem label={copy.problemProvider}>
                {problem.provider}
              </MetadataListItem>
              <MetadataListItem label={copy.problemNumber}>
                {problem.externalId}
              </MetadataListItem>
              {problem.difficulty ? (
                <MetadataListItem label={copy.difficulty}>
                  {problem.difficulty}
                </MetadataListItem>
              ) : null}
            </>
          ) : null}
          <MetadataListItem label={copy.author}>{author}</MetadataListItem>
          <MetadataListItem label={copy.language}>
            {solution.language ?? copy.unavailable}
          </MetadataListItem>
          {solution.memoryUsage !== null ? (
            <MetadataListItem label={copy.memoryUsage}>
              {formatSolutionMemoryUsage(solution.memoryUsage, locale)}
            </MetadataListItem>
          ) : null}
          {solution.timeElapsed !== null ? (
            <MetadataListItem label={copy.timeElapsed}>
              {formatSolutionElapsedTime(solution.timeElapsed, locale)}
            </MetadataListItem>
          ) : null}
          <MetadataListItem label={copy.createdAt}>
            {createdAt ?? copy.unavailable}
          </MetadataListItem>
          <MetadataListItem label={copy.updatedAt}>
            {updatedAt ?? copy.unavailable}
          </MetadataListItem>
        </MetadataList>
      </Section>

      <VStack gap={3} width="100%">
        <Heading level={2}>{copy.codeTitle}</Heading>
        <Suspense fallback={<Skeleton width="100%" height={320} radius={3} />}>
          <SolutionCodeBlock
            data-testid="solution-code"
            code={solution.code}
            language={solution.language}
            ariaLabel={copy.codeTitle}
            hasLineNumbers
            size="viewer-lg"
          />
        </Suspense>
      </VStack>

      <Section width="100%" padding={0} variant="transparent">
        <VStack gap={2}>
          <Heading level={2}>{copy.descriptionTitle}</Heading>
          {solution.description.trim() ? (
            <Suspense
              fallback={<Skeleton width="100%" height={160} radius={3} />}
            >
              <SolutionMarkdown>{solution.description}</SolutionMarkdown>
            </Suspense>
          ) : (
            <Text type="supporting" color="secondary">
              {copy.emptyDescription}
            </Text>
          )}
        </VStack>
      </Section>
    </VStack>
  )
}

function SolutionDetailSkeleton({ label }: { label: string }) {
  return (
    <VStack role="status" aria-live="polite" gap={4} width="100%">
      <VisuallyHidden>{label}</VisuallyHidden>
      <Skeleton width="45%" height={36} radius={2} />
      <Skeleton width="100%" height={220} radius={3} index={1} />
      <Skeleton width="100%" height={320} radius={3} index={2} />
    </VStack>
  )
}

interface SolutionDetailPageProps {
  solutionId: string
}
