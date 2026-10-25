import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { List, ListItem } from '@astryxdesign/core/List'
import { Pagination } from '@astryxdesign/core/Pagination'
import { Section } from '@astryxdesign/core/Section'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { VStack } from '@astryxdesign/core/VStack'
import { useQuery } from '@tanstack/react-query'
import { Check, ListChecks, Search, SearchX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

import { AuthSessionExpiredError } from '@/lib/api/client'
import type { Problem } from '@/lib/problems/problem-model'
import { problemListQueryOptions } from '@/lib/problems/problem-queries'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

interface CreateProblemSetValues {
  name: string
  problemIds: string[]
}

interface ProblemSetCreateDialogProps {
  isSubmitting: boolean
  errorMessage: string | null
  onClose: () => void
  onSubmit: (values: CreateProblemSetValues) => void
}

interface FormState {
  name: string
  page: number
  searchQuery: string
  keyword: string
  selectedProblems: Problem[]
  showSelectedOnly: boolean
}

export function ProblemSetCreateDialog({
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: ProblemSetCreateDialogProps) {
  // 팝업 인스턴스마다 store를 한 번 생성해 리렌더링 중에도 유지
  const [store] = useState(() =>
    createStore<FormState>(() => ({
      name: '',
      page: 0,
      searchQuery: '',
      keyword: '',
      selectedProblems: [],
      showSelectedOnly: false,
    })),
  )

  const {
    name,
    page,
    searchQuery,
    keyword,
    selectedProblems,
    showSelectedOnly,
  } = useStore(store)

  // 전체 목록은 API로 조회하고, 선택 목록은 store의 데이터를 사용
  const problemsQuery = useQuery({
    ...problemListQueryOptions({
      keyword,
      page,
      size: PAGE_SIZE,
    }),
    enabled: !showSelectedOnly,
  })

  const isAuthRequired = problemsQuery.error instanceof AuthSessionExpiredError

  const selectedIds = new Set(selectedProblems.map((problem) => problem.id))

  const visibleProblems = showSelectedOnly
    ? selectedProblems
    : (problemsQuery.data?.problems ?? [])

  const isSearching = searchQuery.trim() !== keyword
  const isValid = name.trim().length > 0 && selectedProblems.length > 0

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextKeyword = searchQuery.trim()

      if (nextKeyword !== store.getState().keyword) {
        store.setState({
          keyword: nextKeyword,
          page: 0,
        })
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchQuery, store])

  function handleOpenChange(open: boolean) {
    if (!open && !isSubmitting) {
      onClose()
    }
  }

  function toggleProblem(problem: Problem) {
    if (isSubmitting) return

    store.setState((state) => ({
      selectedProblems: state.selectedProblems.some(
        (selected) => selected.id === problem.id,
      )
        ? state.selectedProblems.filter(
            (selected) => selected.id !== problem.id,
          )
        : [...state.selectedProblems, problem],
    }))
  }

  function handleSubmit() {
    if (!isValid || isSubmitting) return

    // 문제집 이름과 선택한 문제 ID를 전달
    onSubmit({
      name: name.trim(),
      problemIds: selectedProblems.map((problem) => problem.id),
    })
  }

  const emptyTitle = showSelectedOnly
    ? '선택한 문제가 없습니다.'
    : keyword
      ? '검색 결과가 없습니다.'
      : '등록된 문제가 없습니다.'

  const emptyDescription = showSelectedOnly
    ? '전체 목록에서 문제를 선택해 주세요.'
    : keyword
      ? '다른 문제 이름이나 번호로 검색해 주세요.'
      : '등록된 문제가 있어야 문제집에 추가할 수 있습니다.'

  return (
    <Dialog
      isOpen
      onOpenChange={handleOpenChange}
      width={640}
      maxHeight="calc(100dvh - 1rem)"
      purpose="form"
    >
      <Layout
        height="auto"
        defaultHasDividers
        header={
          <DialogHeader title="문제집 생성" onOpenChange={handleOpenChange} />
        }
        content={
          <LayoutContent>
            <VStack gap={3} width="100%">
              <Text type="body" size="sm" color="secondary">
                문제집 이름을 입력하고 등록된 문제를 선택해 주세요.
              </Text>

              <TextInput
                label="문제집 이름"
                placeholder="예: 그리디 알고리즘 모음"
                value={name}
                isRequired
                hasAutoFocus
                isDisabled={isSubmitting}
                onChange={(value) => {
                  store.setState({ name: value })
                }}
              />

              {!showSelectedOnly && (
                <TextInput
                  label="문제 검색"
                  placeholder="문제 이름 또는 번호로 검색"
                  value={searchQuery}
                  startIcon={Search}
                  hasClear
                  isDisabled={isSubmitting}
                  isLoading={isSearching || problemsQuery.isFetching}
                  onChange={(value) => {
                    store.setState({ searchQuery: value })
                  }}
                />
              )}

              <HStack
                width="100%"
                hAlign="between"
                vAlign="center"
                gap={2}
                wrap="wrap"
              >
                <Text type="body" size="sm" color="secondary">
                  {showSelectedOnly
                    ? '선택한 문제를 다시 누르면 선택이 해제됩니다.'
                    : '여러 문제를 선택할 수 있습니다.'}
                </Text>

                <Button
                  label={
                    showSelectedOnly ? '전체 목록 보기' : '선택한 문제만 보기'
                  }
                  variant="secondary"
                  size="sm"
                  isDisabled={isSubmitting}
                  onClick={() => {
                    store.setState({
                      showSelectedOnly: !showSelectedOnly,
                    })
                  }}
                />
              </HStack>

              {!showSelectedOnly && problemsQuery.isPending ? (
                <ProblemListSkeleton />
              ) : !showSelectedOnly && problemsQuery.isError ? (
                <Banner
                  status={isAuthRequired ? 'info' : 'error'}
                  title={
                    isAuthRequired
                      ? '로그인이 필요합니다.'
                      : '문제 목록을 불러오지 못했습니다.'
                  }
                  endContent={
                    isAuthRequired ? (
                      <Button
                        label="로그인"
                        href="/login"
                        variant="secondary"
                        size="sm"
                      />
                    ) : (
                      <Button
                        label="다시 시도"
                        variant="secondary"
                        size="sm"
                        onClick={() => void problemsQuery.refetch()}
                      />
                    )
                  }
                />
              ) : visibleProblems.length === 0 ? (
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  icon={
                    <Icon
                      icon={!showSelectedOnly && keyword ? SearchX : ListChecks}
                      size="lg"
                      color="secondary"
                    />
                  }
                  headingLevel={2}
                />
              ) : (
                <VStack
                  width="100%"
                  isScrollable
                  className="max-h-[max(8rem,calc(80dvh-24rem))] overscroll-contain"
                >
                  <List density="balanced" hasDividers>
                    {visibleProblems.map((problem) => {
                      const isSelected = selectedIds.has(problem.id)

                      return (
                        <ListItem
                          key={problem.id}
                          label={problem.name}
                          description={formatProblemMetadata(problem)}
                          isSelected={isSelected}
                          onClick={() => {
                            toggleProblem(problem)
                          }}
                          endContent={
                            isSelected ? (
                              <>
                                <Icon icon={Check} size="sm" color="accent" />
                                <VisuallyHidden>선택됨</VisuallyHidden>
                              </>
                            ) : undefined
                          }
                        />
                      )
                    })}
                  </List>
                </VStack>
              )}

              {errorMessage && <Banner status="error" title={errorMessage} />}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <VStack gap={3} width="100%">
              {!showSelectedOnly &&
                problemsQuery.data &&
                problemsQuery.data.totalPages > 1 && (
                  <Pagination
                    page={page + 1}
                    totalPages={problemsQuery.data.totalPages}
                    isDisabled={
                      isSubmitting || isSearching || problemsQuery.isFetching
                    }
                    onChange={(nextPage) => {
                      store.setState({ page: nextPage - 1 })
                    }}
                    variant="compact"
                    size="sm"
                    label="문제 목록 페이지"
                  />
                )}

              <HStack
                width="100%"
                hAlign="between"
                vAlign="center"
                gap={3}
                wrap="wrap"
              >
                <Text type="body" size="sm" color="secondary">
                  {`${String(selectedProblems.length)}개 선택됨`}
                </Text>

                <HStack gap={2}>
                  <Button
                    label="취소"
                    variant="secondary"
                    isDisabled={isSubmitting}
                    onClick={() => {
                      handleOpenChange(false)
                    }}
                  />
                  <Button
                    label={isSubmitting ? '생성 중...' : '생성하기'}
                    variant="primary"
                    isDisabled={!isValid || isSubmitting}
                    onClick={handleSubmit}
                  />
                </HStack>
              </HStack>
            </VStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}

function formatProblemMetadata(problem: Problem) {
  const source = `${problem.provider} ${problem.externalId}`

  return problem.difficulty ? `${source} · ${problem.difficulty}` : source
}

function ProblemListSkeleton() {
  return (
    <VStack role="status" aria-live="polite" gap={3} width="100%">
      <VisuallyHidden>문제 목록을 불러오는 중입니다.</VisuallyHidden>

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
