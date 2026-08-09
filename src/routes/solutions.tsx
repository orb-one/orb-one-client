import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { List, ListItem } from '@astryxdesign/core/List'
import { MultiSelector } from '@astryxdesign/core/MultiSelector'
import { Section } from '@astryxdesign/core/Section'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { VStack } from '@astryxdesign/core/VStack'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Code2, FilterX, SearchX } from 'lucide-react'
import { useState } from 'react'

import { SolutionStatus } from '@/components/solutions/solution-status'
import { AuthSessionExpiredError } from '@/lib/api/client'
import type { Locale } from '@/lib/i18n/messages'
import { useI18n } from '@/lib/i18n/use-translations'
import { formatSolutionDate } from '@/lib/solutions/solution-format'
import type { SolutionSummary } from '@/lib/solutions/solution-model'
import { solutionsQueryOptions } from '@/lib/solutions/solution-queries'
import {
  filterSolutions,
  type SolutionState,
} from '@/lib/solutions/solution-state'

export const Route = createFileRoute('/solutions')({
  validateSearch: normalizeSolutionsSearch,
  component: SolutionsRoute,
})

const solutionStates: SolutionState[] = [
  'draft',
  'solved',
  'unsolved',
  'unknown',
]

export function normalizeSolutionsSearch(search: Record<string, unknown>) {
  const problemId =
    typeof search.problemId === 'string' ? search.problemId.trim() : ''

  return problemId ? { problemId } : {}
}

function SolutionsRoute() {
  const { problemId } = Route.useSearch()

  return problemId ? (
    <SolutionsPage key={problemId} problemId={problemId} />
  ) : (
    <SolutionsPage key="all" />
  )
}

export function SolutionsPage({ problemId }: SolutionsPageProps = {}) {
  const { locale, t } = useI18n()
  const copy = t.solutions.list
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [selectedStates, setSelectedStates] = useState<SolutionState[]>([])
  const solutionsQuery = useQuery(
    solutionsQueryOptions(problemId ? { problemId } : {}),
  )
  const isAuthRequired = solutionsQuery.error instanceof AuthSessionExpiredError
  const solutions = solutionsQuery.data ?? []
  const languages = Array.from(
    new Set(
      solutions.flatMap((solution) =>
        solution.language === null ? [] : [solution.language],
      ),
    ),
  ).sort((left, right) => left.localeCompare(right))
  const filteredSolutions = filterSolutions(solutions, {
    languages: selectedLanguages,
    states: selectedStates,
  })
  const hasActiveFilters =
    selectedLanguages.length > 0 || selectedStates.length > 0

  function clearFilters() {
    setSelectedLanguages([])
    setSelectedStates([])
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
        <VStack gap={2} maxWidth={672}>
          <Heading level={1}>{copy.title}</Heading>
          <Text type="body" color="secondary">
            {copy.description}
          </Text>
        </VStack>

        {problemId &&
        (solutionsQuery.isPending ||
          solutionsQuery.isError ||
          solutions.length > 0) ? (
          <Banner
            status="info"
            title={copy.problemFilterTitle}
            endContent={
              <Button
                label={copy.viewAll}
                href="/solutions"
                size="sm"
                variant="secondary"
              />
            }
          />
        ) : null}

        {solutionsQuery.isPending ? (
          <SolutionListSkeleton label={copy.loading} />
        ) : solutionsQuery.isError ? (
          <Banner
            status={isAuthRequired ? 'info' : 'error'}
            title={isAuthRequired ? t.solutions.authRequired : copy.loadError}
            endContent={
              isAuthRequired ? (
                <Button
                  label={t.solutions.login}
                  href="/login"
                  size="sm"
                  variant="secondary"
                />
              ) : (
                <Button
                  label={copy.retry}
                  size="sm"
                  variant="secondary"
                  onClick={() => void solutionsQuery.refetch()}
                />
              )
            }
          />
        ) : solutions.length === 0 ? (
          <EmptyState
            title={problemId ? copy.problemEmptyTitle : copy.emptyTitle}
            description={
              problemId ? copy.problemEmptyDescription : copy.emptyDescription
            }
            icon={<Icon icon={Code2} size="lg" color="secondary" />}
            actions={
              problemId ? (
                <Button
                  label={copy.viewAll}
                  href="/solutions"
                  size="sm"
                  variant="secondary"
                />
              ) : undefined
            }
            headingLevel={2}
          />
        ) : (
          <VStack gap={4} width="100%">
            <HStack gap={3} wrap="wrap" vAlign="end">
              <MultiSelector
                label={copy.languageFilter}
                options={languages.map((language) => ({
                  value: language,
                  label: language,
                }))}
                value={selectedLanguages}
                onChange={setSelectedLanguages}
                placeholder={copy.languagePlaceholder}
                triggerDisplay="labels"
                size="sm"
              />
              <MultiSelector
                label={copy.statusFilter}
                options={solutionStates.map((state) => ({
                  value: state,
                  label: t.solutions.status[state],
                }))}
                value={selectedStates}
                onChange={(states) => {
                  setSelectedStates(states.filter(isSolutionState))
                }}
                placeholder={copy.statusPlaceholder}
                triggerDisplay="labels"
                size="sm"
              />
              {hasActiveFilters ? (
                <Button
                  label={copy.clearFilters}
                  size="sm"
                  variant="ghost"
                  icon={<Icon icon={FilterX} color="inherit" />}
                  onClick={clearFilters}
                />
              ) : null}
            </HStack>

            {filteredSolutions.length === 0 ? (
              <EmptyState
                title={copy.noResultsTitle}
                description={copy.noResultsDescription}
                icon={<Icon icon={SearchX} size="lg" color="secondary" />}
                actions={
                  <Button
                    label={copy.clearFilters}
                    size="sm"
                    variant="secondary"
                    onClick={clearFilters}
                  />
                }
                headingLevel={2}
              />
            ) : (
              <Section width="100%" padding={0} dividers={['top', 'bottom']}>
                <List density="balanced" hasDividers>
                  {filteredSolutions.map((solution) => (
                    <ListItem
                      key={solution.id}
                      label={solution.problemId}
                      href={`/solutions/${solution.id}`}
                      startContent={
                        <Icon icon={Code2} size="sm" color="accent" />
                      }
                      description={
                        <SolutionListMetadata
                          solution={solution}
                          locale={locale}
                        />
                      }
                      endContent={<SolutionStatus solution={solution} />}
                    />
                  ))}
                </List>
              </Section>
            )}
          </VStack>
        )}
      </VStack>
    </Center>
  )
}

function SolutionListMetadata({ solution, locale }: SolutionListMetadataProps) {
  const copy = useI18n().t.solutions.list
  const createdAt = formatSolutionDate(solution.createdAt, locale)

  return (
    <VStack gap={1.5}>
      <HStack gap={2} wrap="wrap" vAlign="center">
        <Text type="supporting" color="secondary">
          {solution.language ?? copy.unknownLanguage}
        </Text>
        <Text type="supporting" color="secondary">
          {copy.author} {solution.userId}
        </Text>
      </HStack>
      {createdAt ? (
        <Text type="supporting" color="secondary">
          {copy.createdAt} {createdAt}
        </Text>
      ) : null}
    </VStack>
  )
}

function SolutionListSkeleton({ label }: { label: string }) {
  return (
    <VStack role="status" aria-live="polite" gap={3} width="100%">
      <VisuallyHidden>{label}</VisuallyHidden>
      {[0, 1, 2].map((index) => (
        <Section key={index} width="100%" padding={4} dividers={['bottom']}>
          <VStack gap={2}>
            <Skeleton width="35%" height={20} radius={2} index={index} />
            <Skeleton width="65%" height={16} radius={2} index={index} />
          </VStack>
        </Section>
      ))}
    </VStack>
  )
}

function isSolutionState(value: string): value is SolutionState {
  return solutionStates.some((state) => state === value)
}

interface SolutionListMetadataProps {
  solution: SolutionSummary
  locale: Locale
}

interface SolutionsPageProps {
  problemId?: string
}
