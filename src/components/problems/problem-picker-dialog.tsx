import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Icon } from '@astryxdesign/core/Icon'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { List, ListItem } from '@astryxdesign/core/List'
import { Pagination } from '@astryxdesign/core/Pagination'
import { Section } from '@astryxdesign/core/Section'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { VStack } from '@astryxdesign/core/VStack'
import { useQuery } from '@tanstack/react-query'
import { Check, ListChecks } from 'lucide-react'
import { useState } from 'react'

import { AuthSessionExpiredError } from '@/lib/api/client'
import { useI18n } from '@/lib/i18n/use-translations'
import type { Problem } from '@/lib/problems/problem-model'
import { problemListQueryOptions } from '@/lib/problems/problem-queries'

const PAGE_SIZE = 10

export function ProblemPickerDialog({
  isOpen,
  onOpenChange,
  selectedProblem,
  onSelect,
}: ProblemPickerDialogProps) {
  const { t } = useI18n()
  const copy = t.solutions.create
  const [page, setPage] = useState(0)
  const problemsQuery = useQuery({
    ...problemListQueryOptions({ page, size: PAGE_SIZE }),
    enabled: isOpen,
  })
  const isAuthRequired = problemsQuery.error instanceof AuthSessionExpiredError

  function handleOpenChange(nextIsOpen: boolean) {
    if (!nextIsOpen) {
      setPage(0)
    }

    onOpenChange(nextIsOpen)
  }

  function selectProblem(problem: Problem) {
    onSelect(problem)
    handleOpenChange(false)
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      width={640}
      maxHeight="80vh"
      purpose="info"
    >
      <Layout
        height="auto"
        defaultHasDividers
        header={
          <DialogHeader
            title={copy.problemPickerTitle}
            onOpenChange={handleOpenChange}
          />
        }
        content={
          <LayoutContent isScrollable={false}>
            <VStack gap={3} width="100%">
              <Text type="body" size="sm" color="secondary">
                {copy.problemPickerDescription}
              </Text>
              {problemsQuery.isPending ? (
                <ProblemPickerSkeleton label={copy.problemPickerLoading} />
              ) : problemsQuery.isError ? (
                <Banner
                  status={isAuthRequired ? 'info' : 'error'}
                  title={
                    isAuthRequired ? copy.authRequired : copy.problemPickerError
                  }
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
                        label={copy.problemPickerRetry}
                        size="sm"
                        variant="secondary"
                        onClick={() => void problemsQuery.refetch()}
                      />
                    )
                  }
                />
              ) : problemsQuery.data.problems.length === 0 ? (
                <EmptyState
                  title={copy.problemPickerEmptyTitle}
                  description={copy.problemPickerEmptyDescription}
                  icon={<Icon icon={ListChecks} size="lg" color="secondary" />}
                  headingLevel={2}
                />
              ) : (
                <VStack
                  width="100%"
                  isScrollable
                  className="max-h-[calc(80dvh-11rem)] overscroll-contain"
                  data-testid="problem-picker-list-scroll-area"
                >
                  <List density="balanced" hasDividers>
                    {problemsQuery.data.problems.map((problem) => {
                      const isSelected = selectedProblem?.id === problem.id

                      return (
                        <ListItem
                          key={problem.id}
                          label={problem.name}
                          description={formatProblemMetadata(problem)}
                          isSelected={isSelected}
                          onClick={() => {
                            selectProblem(problem)
                          }}
                          endContent={
                            isSelected ? (
                              <>
                                <Icon icon={Check} size="sm" color="accent" />
                                <VisuallyHidden>
                                  {copy.problemSelected}
                                </VisuallyHidden>
                              </>
                            ) : undefined
                          }
                        />
                      )
                    })}
                  </List>
                </VStack>
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          problemsQuery.data && problemsQuery.data.totalPages > 1 ? (
            <LayoutFooter>
              <Pagination
                page={problemsQuery.data.page + 1}
                totalPages={problemsQuery.data.totalPages}
                onChange={(nextPage) => {
                  setPage(nextPage - 1)
                }}
                variant="compact"
                size="sm"
                label={copy.problemPickerPagination}
              />
            </LayoutFooter>
          ) : undefined
        }
      />
    </Dialog>
  )
}

function formatProblemMetadata(problem: Problem) {
  const source = `${problem.provider} ${problem.externalId}`

  return problem.difficulty ? `${source} · ${problem.difficulty}` : source
}

function ProblemPickerSkeleton({ label }: { label: string }) {
  return (
    <VStack role="status" aria-live="polite" gap={3} width="100%">
      <VisuallyHidden>{label}</VisuallyHidden>
      {[0, 1, 2, 3].map((index) => (
        <Section key={index} width="100%" padding={3} dividers={['bottom']}>
          <VStack gap={2}>
            <Skeleton width="45%" height={20} radius={2} index={index} />
            <Skeleton width="30%" height={16} radius={2} index={index} />
          </VStack>
        </Section>
      ))}
    </VStack>
  )
}

interface ProblemPickerDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  selectedProblem: Problem | null
  onSelect: (problem: Problem) => void
}
