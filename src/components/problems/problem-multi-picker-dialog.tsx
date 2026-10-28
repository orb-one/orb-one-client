import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { List, ListItem } from '@astryxdesign/core/List'
import { Pagination } from '@astryxdesign/core/Pagination'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { VStack } from '@astryxdesign/core/VStack'
import { useQuery } from '@tanstack/react-query'
import { Check, Search } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

import { AuthSessionExpiredError } from '@/lib/api/client'
import type { Problem } from '@/lib/problems/problem-model'
import { problemListQueryOptions } from '@/lib/problems/problem-queries'

const EMPTY_PROBLEM_IDS: readonly string[] = []
const EMPTY_PROBLEMS: readonly Problem[] = []
const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

interface ProblemMultiPickerDialogProps {
  existingProblemIds?: readonly string[]
  initialSelectedProblems?: readonly Problem[]
  submitLabel?: string
  allowEmptySelection?: boolean
  title?: string
  description?: string
  onSelectionChange?: () => void
  isSubmitting: boolean
  errorMessage?: string | null
  onClose: () => void
  onSubmit: (problemIds: string[], problems: Problem[]) => void
}

interface FormState {
  page: number
  searchQuery: string
  keyword: string
  selectedProblems: Problem[]
  showSelectedOnly: boolean
}

export function ProblemMultiPickerDialog({
  existingProblemIds = EMPTY_PROBLEM_IDS,
  initialSelectedProblems = EMPTY_PROBLEMS,
  submitLabel = '선택한 문제 추가',
  allowEmptySelection = false,
  title = '문제 추가',
  description = '추가할 문제를 선택해 주세요. 여러 문제를 선택할 수 있습니다.',
  onSelectionChange,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: ProblemMultiPickerDialogProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const viewToggleRef = useRef<HTMLButtonElement>(null)
  const rowRefs = useRef(new Map<string, HTMLLIElement>())
  const pendingFocusIdRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])
  useEffect(() => {
    if (errorMessage && scrollAreaRef.current)
      scrollAreaRef.current.scrollTop = 0
  }, [errorMessage])
  // 모달 인스턴스별로 선택 상태를 관리합니다.
  const [store] = useState(() =>
    createStore<FormState>(() => ({
      page: 0,
      searchQuery: '',
      keyword: '',
      selectedProblems: [...initialSelectedProblems],
      showSelectedOnly: false,
    })),
  )

  const {
    page,
    searchQuery,
    keyword,
    selectedProblems: storedSelections,
    showSelectedOnly,
  } = useStore(store)

  useLayoutEffect(() => {
    if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0
  }, [page, keyword, showSelectedOnly])

  useLayoutEffect(() => {
    const nextId = pendingFocusIdRef.current
    if (nextId === undefined) return
    pendingFocusIdRef.current = undefined
    const nextButton = nextId
      ? rowRefs.current.get(nextId)?.querySelector('button')
      : null
    const focusTarget = nextButton ?? viewToggleRef.current
    focusTarget?.focus()
  }, [storedSelections])
  const existingIds = new Set(existingProblemIds)
  const selectedProblems = storedSelections.filter(
    (problem) => !existingIds.has(problem.id),
  )

  // 열린 동안 다른 경로에서 추가된 문제도 선택 목록에서 제외합니다.
  useEffect(() => {
    const ids = new Set(existingProblemIds)
    const current = store.getState().selectedProblems
    const remaining = current.filter((problem) => !ids.has(problem.id))
    if (remaining.length !== current.length)
      store.setState({ selectedProblems: remaining })
  }, [existingProblemIds, store])

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
  const canSubmit =
    (allowEmptySelection || selectedProblems.length > 0) && !isSubmitting

  // 검색어 변경 후 첫 페이지부터 조회합니다.
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
    if (isSubmitting || existingIds.has(problem.id)) return

    const index = selectedProblems.findIndex((item) => item.id === problem.id)
    if (
      showSelectedOnly &&
      index !== -1 &&
      rowRefs.current.get(problem.id)?.contains(document.activeElement)
    ) {
      pendingFocusIdRef.current =
        selectedProblems[index + 1]?.id ??
        selectedProblems[index - 1]?.id ??
        null
    }

    // 페이지가 바뀌어도 선택한 문제는 유지합니다.
    store.setState((state) => ({
      selectedProblems: state.selectedProblems.some(
        (selected) => selected.id === problem.id,
      )
        ? state.selectedProblems.filter(
            (selected) => selected.id !== problem.id,
          )
        : [...state.selectedProblems, problem],
    }))
    onSelectionChange?.()
  }

  function handleSubmit() {
    if (!canSubmit) return

    // 선택 확정과 저장 여부는 부모에서 처리합니다.
    onSubmit(
      selectedProblems.map((problem) => problem.id),
      selectedProblems,
    )
  }

  const emptyTitle = showSelectedOnly
    ? '선택한 문제가 없습니다.'
    : keyword
      ? '검색 결과가 없습니다.'
      : '등록된 문제가 없습니다.'

  const emptyDescription = showSelectedOnly
    ? '전체 목록에서 추가할 문제를 선택해 주세요.'
    : keyword
      ? '다른 문제 이름이나 번호로 검색해 주세요.'
      : undefined

  return (
    <Dialog
      isOpen
      onOpenChange={handleOpenChange}
      width={640}
      maxHeight="calc(100dvh - 1rem)"
      purpose="form"
    >
      <Layout
        height="fill"
        defaultHasDividers
        header={<DialogHeader title={title} onOpenChange={handleOpenChange} />}
        content={
          <LayoutContent
            ref={scrollAreaRef}
            isScrollable
            data-testid="problem-multi-picker-scroll-area"
          >
            <VStack gap={3} width="100%">
              {errorMessage && (
                <Banner role="alert" status="error" title={errorMessage} />
              )}
              <Text type="body" size="sm" color="secondary">
                {description}
              </Text>

              {!showSelectedOnly && (
                <TextInput
                  ref={searchInputRef}
                  label="문제 검색"
                  placeholder="문제 이름 또는 번호로 검색"
                  value={searchQuery}
                  startIcon={Search}
                  hasClear
                  hasAutoFocus
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
                  선택한 문제를 다시 누르면 선택이 해제됩니다.
                </Text>

                <Button
                  ref={viewToggleRef}
                  label={
                    showSelectedOnly ? '전체 목록 보기' : '선택한 문제만 보기'
                  }
                  variant="secondary"
                  size="sm"
                  isDisabled={isSubmitting}
                  onClick={() => {
                    store.setState((state) => ({
                      showSelectedOnly: !state.showSelectedOnly,
                    }))
                  }}
                />
              </HStack>

              {!showSelectedOnly && problemsQuery.isPending ? (
                <ProblemListSkeleton />
              ) : !showSelectedOnly && problemsQuery.isError ? (
                <Banner
                  role={isAuthRequired ? 'status' : 'alert'}
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
                        isDisabled={isSubmitting}
                      />
                    ) : (
                      <Button
                        label="다시 시도"
                        variant="secondary"
                        size="sm"
                        isDisabled={isSubmitting}
                        onClick={() => {
                          void problemsQuery.refetch()
                        }}
                      />
                    )
                  }
                />
              ) : visibleProblems.length === 0 ? (
                <EmptyState
                  title={emptyTitle}
                  {...(emptyDescription
                    ? { description: emptyDescription }
                    : {})}
                  headingLevel={2}
                />
              ) : (
                <List density="balanced" hasDividers>
                  {visibleProblems.map((problem) => {
                    const isSelected = selectedIds.has(problem.id)
                    const isExisting = existingIds.has(problem.id)

                    return (
                      <ListItem
                        key={problem.id}
                        ref={(element) => {
                          if (element) rowRefs.current.set(problem.id, element)
                          else rowRefs.current.delete(problem.id)
                        }}
                        label={problem.name}
                        description={formatProblemMetadata(problem)}
                        isSelected={isSelected}
                        isDisabled={isSubmitting || isExisting}
                        onClick={() => {
                          toggleProblem(problem)
                        }}
                        endContent={
                          isExisting ? (
                            <Text type="supporting" color="secondary">
                              이미 추가됨
                            </Text>
                          ) : isSelected ? (
                            <>
                              <Icon icon={Check} size="sm" color="accent" />
                              <VisuallyHidden>선택됨</VisuallyHidden>
                            </>
                          ) : null
                        }
                      />
                    )
                  })}
                </List>
              )}
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
                    label={isSubmitting ? '추가 중...' : submitLabel}
                    variant="primary"
                    isDisabled={!canSubmit}
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
        <VStack key={index} gap={2} padding={3} width="100%">
          <Skeleton width="45%" height={20} radius={2} index={index} />
          <Skeleton width="30%" height={16} radius={2} index={index} />
        </VStack>
      ))}
    </VStack>
  )
}
