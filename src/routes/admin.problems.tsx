import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { List, ListItem } from '@astryxdesign/core/List'
import { Pagination } from '@astryxdesign/core/Pagination'
import { Section } from '@astryxdesign/core/Section'
import { Selector } from '@astryxdesign/core/Selector'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useToast } from '@astryxdesign/core/Toast'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { VStack } from '@astryxdesign/core/VStack'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

import { AdminProblemDeleteDialog } from '@/components/problems/admin-problem-delete-dialog'
import { AdminProblemFormDialog } from '@/components/problems/admin-problem-form-dialog'
import { ProblemDifficultyChip } from '@/components/problems/problem-difficulty-chip'
import { ApiError } from '@/lib/api/client'
import { getReadableErrorMessage } from '@/lib/api/error-message'
import {
  createCatalogProblem,
  deleteCatalogProblem,
  updateCatalogProblem,
  type AdminProblemRequest,
} from '@/lib/api/problems'
import { currentUserQueryOptions } from '@/lib/auth/auth-queries'
import { useTranslations } from '@/lib/i18n/use-translations'
import { problemProviders, type Problem } from '@/lib/problems/problem-model'
import {
  problemListQueryOptions,
  problemQueryKeys,
} from '@/lib/problems/problem-queries'

const PAGE_SIZE = 20

export const Route = createFileRoute('/admin/problems')({
  component: AdminProblemsPage,
})

export function AdminProblemsPage() {
  const copy = useTranslations().adminProblems
  const userQuery = useQuery(currentUserQueryOptions())
  const isAccessDenied =
    userQuery.error instanceof ApiError &&
    (userQuery.error.status === 401 || userQuery.error.status === 403)

  if (userQuery.isPending)
    return (
      <Section className="mx-auto max-w-6xl" width="100%">
        <Skeleton height={96} />
        <VisuallyHidden>{copy.loading}</VisuallyHidden>
      </Section>
    )
  // 일시적인 재조회 실패로 기존 폼을 제거하지 않되, 명시적인 접근 거부는 차단한다.
  if (userQuery.isError && (!userQuery.data || isAccessDenied))
    return (
      <Section>
        <Banner
          status="error"
          title={copy.userError}
          endContent={
            <Button
              label={copy.retry}
              onClick={() => void userQuery.refetch()}
            />
          }
        />
      </Section>
    )
  if (!userQuery.data)
    return (
      <Section>
        <EmptyState
          title={copy.signInRequired}
          actions={
            <Button label={copy.signIn} href="/login" variant="primary" />
          }
          headingLevel={1}
        />
      </Section>
    )
  if (userQuery.data.role !== 'ADMIN')
    return (
      <Section>
        <EmptyState
          title={copy.forbidden}
          description={copy.forbiddenDescription}
          headingLevel={1}
        />
      </Section>
    )

  return <AdminProblemCatalog key={userQuery.data.id} />
}

interface CatalogState {
  search: string
  keyword: string
  provider: string
  page: number
  editor: { problem: Problem | null } | null
  deleting: Problem | null
}

function AdminProblemCatalog() {
  const copy = useTranslations().adminProblems
  const queryClient = useQueryClient()
  const showToast = useToast()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [store] = useState(() =>
    createStore<CatalogState>(() => ({
      search: '',
      keyword: '',
      provider: '',
      page: 0,
      editor: null,
      deleting: null,
    })),
  )
  const { search, keyword, provider, page, editor, deleting } = useStore(store)
  const requestInFlight = useRef(false)
  const selectedProvider = problemProviders.find((item) => item === provider)
  const listQuery = useQuery(
    problemListQueryOptions({
      keyword,
      ...(selectedProvider ? { provider: selectedProvider } : {}),
      page,
      size: PAGE_SIZE,
    }),
  )
  const saveMutation = useMutation({
    mutationFn: ({
      problem,
      request,
    }: {
      problem: Problem | null
      request: AdminProblemRequest
    }) =>
      problem
        ? updateCatalogProblem(problem.id, request)
        : createCatalogProblem(request),
    onSuccess: async (problem) => {
      queryClient.setQueryData(problemQueryKeys.detail(problem.id), problem)
      await refreshProblemViews()
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteCatalogProblem,
    onSuccess: async (_, problemId) => {
      queryClient.removeQueries({
        queryKey: problemQueryKeys.detail(problemId),
        exact: true,
      })
      await refreshProblemViews()
    },
  })
  const busy = saveMutation.isPending || deleteMutation.isPending
  const problems = listQuery.data?.problems ?? []

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (store.getState().keyword !== search.trim())
        store.setState({ keyword: search.trim(), page: 0 })
    }, 300)
    return () => {
      window.clearTimeout(timeout)
    }
  }, [search, store])

  useEffect(() => {
    if (listQuery.data && page > 0 && page >= listQuery.data.totalPages)
      store.setState({ page: Math.max(0, listQuery.data.totalPages - 1) })
  }, [listQuery.data, page, store])

  function openEditor(problem: Problem | null) {
    saveMutation.reset()
    store.setState({ editor: { problem } })
  }

  function openDelete(problem: Problem) {
    deleteMutation.reset()
    store.setState({ deleting: problem })
  }

  async function refreshProblemViews() {
    // 전역 문제 정보가 포함된 기존 화면도 다음 조회에서 갱신한다.
    await queryClient.invalidateQueries({
      predicate: (query) =>
        [
          'problems',
          'solutions',
          'group',
          'groups',
          'problemSetDetail',
        ].includes(String(query.queryKey[0])),
    })
  }

  async function handleSave(request: AdminProblemRequest) {
    if (!editor || requestInFlight.current) return
    requestInFlight.current = true
    try {
      await saveMutation.mutateAsync({ problem: editor.problem, request })
      store.setState({ editor: null })
      showToast({
        body: editor.problem ? copy.editSuccess : copy.createSuccess,
        type: 'info',
        isAutoHide: true,
        autoHideDuration: 4000,
      })
    } catch {
      // Mutation 오류는 팝업 안에 표시하고 입력한 값은 유지한다.
    } finally {
      requestInFlight.current = false
    }
  }

  async function handleDelete() {
    if (!deleting || requestInFlight.current) return
    requestInFlight.current = true
    try {
      await deleteMutation.mutateAsync(deleting.id)
      store.setState({
        deleting: null,
        ...(problems.length === 1 && page > 0 ? { page: page - 1 } : {}),
      })
      showToast({
        body: copy.deleteSuccess,
        type: 'info',
        isAutoHide: true,
        autoHideDuration: 4000,
      })
    } catch {
      // 삭제 실패 시 대상과 목록을 유지해 오류 확인과 재시도를 허용한다.
    } finally {
      requestInFlight.current = false
    }
  }

  function actions(problem: Problem) {
    return (
      <HStack gap={1}>
        <Button
          label={copy.edit}
          aria-label={`${problem.name} ${copy.edit}`}
          variant="ghost"
          size="sm"
          isDisabled={busy}
          onClick={() => {
            openEditor(problem)
          }}
        />
        <Button
          label={copy.remove}
          aria-label={`${problem.name} ${copy.remove}`}
          variant="ghost"
          size="sm"
          isDisabled={busy}
          onClick={() => {
            openDelete(problem)
          }}
        />
      </HStack>
    )
  }

  function problemLink(problem: Problem) {
    return /^https?:\/\//i.test(problem.url) ? (
      <Link
        href={problem.url}
        target="_blank"
        rel="noopener noreferrer"
        isStandalone
      >
        {problem.name}
      </Link>
    ) : (
      <Text>{problem.name}</Text>
    )
  }

  function errorMessage(error: Error | null, fallback: string) {
    if (!error) return null
    return error instanceof ApiError
      ? getReadableErrorMessage(error, fallback)
      : fallback
  }

  return (
    <Section
      width="100%"
      maxWidth={1200}
      padding={4}
      paddingBlock={8}
      className="mx-auto"
    >
      <VStack gap={6} width="100%">
        <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap">
          <VStack gap={2}>
            <Heading level={1}>{copy.title}</Heading>
            <Text color="secondary">{copy.description}</Text>
          </VStack>
          <Button
            label={copy.create}
            icon={<Icon icon={Plus} />}
            variant="primary"
            isDisabled={busy}
            onClick={() => {
              openEditor(null)
            }}
          />
        </HStack>
        <HStack gap={3} wrap="wrap" vAlign="end" width="100%">
          <VStack className="min-w-0 flex-1 basis-64">
            <TextInput
              label={copy.search}
              value={search}
              onChange={(value) => {
                store.setState({ search: value })
              }}
              placeholder={copy.searchPlaceholder}
              startIcon={Search}
              hasClear
              width="100%"
            />
          </VStack>
          <VStack className="w-full sm:w-48">
            <Selector
              label={copy.provider}
              options={[
                { value: '', label: copy.allProviders },
                ...problemProviders.map((value) => ({ value, label: value })),
              ]}
              value={provider}
              onChange={(value) => {
                store.setState({ provider: value, page: 0 })
              }}
            />
          </VStack>
        </HStack>
        {listQuery.isPending ? (
          <VStack role="status" gap={3} width="100%">
            <VisuallyHidden>{copy.loading}</VisuallyHidden>
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </VStack>
        ) : listQuery.isError ? (
          <Banner
            status="error"
            title={errorMessage(listQuery.error, copy.loadError)}
            endContent={
              <Button
                label={copy.retry}
                onClick={() => void listQuery.refetch()}
              />
            }
          />
        ) : problems.length === 0 ? (
          <EmptyState
            title={keyword || provider ? copy.noResults : copy.empty}
            description={
              keyword || provider
                ? copy.noResultsDescription
                : copy.emptyDescription
            }
            headingLevel={2}
          />
        ) : (
          <VStack gap={3} width="100%" aria-busy={listQuery.isFetching}>
            <Text color="secondary" type="supporting">
              {copy.count}: {listQuery.data.totalElements}
            </Text>
            {isDesktop ? (
              <Table<Problem & Record<string, unknown>>
                data={problems as (Problem & Record<string, unknown>)[]}
                idKey="id"
                density="balanced"
                columns={[
                  {
                    key: 'provider',
                    header: copy.provider,
                    width: pixel(152),
                    renderCell: (problem) => (
                      <Text maxLines={1}>{problem.provider}</Text>
                    ),
                  },
                  {
                    key: 'externalId',
                    header: copy.externalId,
                    width: proportional(1, { minWidth: 96 }),
                  },
                  {
                    key: 'name',
                    header: copy.name,
                    width: proportional(2, { minWidth: 160 }),
                    renderCell: problemLink,
                  },
                  {
                    key: 'difficulty',
                    header: copy.difficulty,
                    width: pixel(144),
                    renderCell: (problem) => (
                      <ProblemDifficultyChip
                        provider={problem.provider}
                        difficulty={problem.difficulty}
                      />
                    ),
                  },
                  {
                    key: 'actions',
                    header: copy.actions,
                    width: pixel(152),
                    renderCell: actions,
                  },
                ]}
              />
            ) : (
              <Section padding={0} width="100%" dividers={['top', 'bottom']}>
                <List hasDividers density="balanced">
                  {problems.map((problem) => (
                    <ListItem
                      key={problem.id}
                      label={problem.name}
                      {...(/^https?:\/\//i.test(problem.url)
                        ? { href: problem.url, target: '_blank' }
                        : {})}
                      description={
                        <VStack gap={1}>
                          <Text
                            type="supporting"
                            color="secondary"
                            wordBreak="break-all"
                          >
                            {problem.provider} · {problem.externalId}
                          </Text>
                          <ProblemDifficultyChip
                            provider={problem.provider}
                            difficulty={problem.difficulty}
                          />
                        </VStack>
                      }
                      endContent={actions(problem)}
                    />
                  ))}
                </List>
              </Section>
            )}
            {listQuery.data.totalPages > 1 ? (
              <Pagination
                label={copy.pagination}
                page={page + 1}
                onChange={(nextPage) => {
                  store.setState({ page: nextPage - 1 })
                }}
                totalPages={listQuery.data.totalPages}
                variant="compact"
                size="sm"
              />
            ) : null}
          </VStack>
        )}
      </VStack>
      {editor ? (
        <AdminProblemFormDialog
          key={editor.problem?.id ?? 'new'}
          problem={editor.problem}
          isSubmitting={saveMutation.isPending}
          errorMessage={errorMessage(saveMutation.error, copy.saveError)}
          onClose={() => {
            store.setState({ editor: null })
          }}
          onSubmit={(request) => void handleSave(request)}
        />
      ) : null}
      {deleting ? (
        <AdminProblemDeleteDialog
          problem={deleting}
          isDeleting={deleteMutation.isPending}
          errorMessage={errorMessage(deleteMutation.error, copy.deleteError)}
          onClose={() => {
            store.setState({ deleting: null })
          }}
          onDelete={() => void handleDelete()}
        />
      ) : null}
    </Section>
  )
}
