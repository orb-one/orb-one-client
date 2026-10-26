import { getProblemReferenceErrorMessage } from '@/lib/problems/problem-reference-errors'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { List, ListItem } from '@astryxdesign/core/List'
import { Pagination } from '@astryxdesign/core/Pagination'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { VStack } from '@astryxdesign/core/VStack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ProblemSetCreateDialog } from '@/components/problems/problem-set-create-dialog'
import {
  createProblemSet,
  deleteProblemSet,
  getProblemSets,
  type ProblemSetCreateRequest,
  type ProblemSetCreateResponse,
} from '@/lib/api/problem-sets'

interface ProblemSetTabProps {
  groupId: string
}

export function ProblemSetTab({ groupId }: ProblemSetTabProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [currentPage, setCurrentPage] = useState(1)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const pageSize = 20

  // 문제집 목록 조회
  const problemSetsQuery = useQuery({
    queryKey: ['problemSets', groupId, currentPage, pageSize],
    queryFn: () =>
      getProblemSets(groupId, {
        page: currentPage - 1,
        size: pageSize,
      }),
    placeholderData: (previousData) => previousData,
    enabled: Boolean(groupId),
  })

  const problemSets = problemSetsQuery.data?.items ?? []
  const totalPages = problemSetsQuery.data?.totalPages ?? 1

  // 문제집 생성
  const createProblemSetMutation = useMutation<
    ProblemSetCreateResponse,
    Error,
    ProblemSetCreateRequest
  >({
    mutationFn: (requestDto) => createProblemSet(groupId, requestDto),
    onSuccess: (response) => {
      alert(`'${response.name}' 문제집이 성공적으로 생성되었습니다.`)
      handleCloseCreateModal()
      setCurrentPage(1)

      void queryClient.invalidateQueries({
        queryKey: ['problemSets', groupId],
      })
    },
    onError: (err) => {
      alert(
        getProblemReferenceErrorMessage(
          err,
          '문제집 생성 중 오류가 발생했습니다.',
        ),
      )
    },
  })

  // 문제집 삭제
  const deleteProblemSetMutation = useMutation({
    mutationFn: ({ problemSetId }: { problemSetId: string; name: string }) =>
      deleteProblemSet(groupId, problemSetId),
    onSuccess: (_, variables) => {
      alert(`'${variables.name}' 문제집이 성공적으로 삭제되었습니다.`)

      void queryClient.invalidateQueries({
        queryKey: ['problemSets', groupId],
      })
    },
    onError: (error: Error) => {
      alert(error.message || '문제집 삭제 중 오류가 발생했습니다.')
    },
  })

  function handleOpenCreateModal() {
    createProblemSetMutation.reset()
    setIsCreateModalOpen(true)
  }

  function handleCloseCreateModal() {
    setIsCreateModalOpen(false)
  }

  function handleSubmitCreateProblemSet(values: ProblemSetCreateRequest) {
    if (createProblemSetMutation.isPending) {
      return
    }

    createProblemSetMutation.mutate(values)
  }

  function handleDeleteProblemSet(
    problemSetId: string,
    problemSetName: string,
  ) {
    if (confirm(`'${problemSetName}' 문제집을 정말 삭제하시겠습니까?`)) {
      deleteProblemSetMutation.mutate({
        problemSetId,
        name: problemSetName,
      })
    }
  }

  function handleNavigateToProblemSetDetail(problemSetId: string) {
    void navigate({
      to: '/groups/$groupId/problem-sets/$problemSetId',
      params: {
        groupId,
        problemSetId,
      },
    })
  }

  return (
    <VStack width="100%" gap={6}>
      <HStack width="100%" hAlign="end">
        <Button
          label="문제집 생성"
          size="sm"
          variant="primary"
          icon={<Icon icon={Plus} size="sm" />}
          onClick={handleOpenCreateModal}
        />
      </HStack>

      {problemSetsQuery.isPending ? (
        <Skeleton width="100%" height={48} radius={2} />
      ) : problemSetsQuery.isError ? (
        <Banner
          status="error"
          title="문제집 목록을 불러오는 데 실패했습니다."
          endContent={
            <Button
              label="다시 시도"
              size="sm"
              variant="secondary"
              onClick={() => {
                void problemSetsQuery.refetch()
              }}
            />
          }
        />
      ) : problemSets.length === 0 ? (
        <EmptyState
          title="등록된 문제집이 없습니다."
          description="우측 상단의 '문제집 생성' 버튼을 눌러 새 문제집을 만들어 보세요."
          icon={<Icon icon={BookOpen} size="lg" color="secondary" />}
          headingLevel={2}
        />
      ) : (
        <VStack width="100%" gap={6}>
          <List density="balanced" hasDividers>
            {problemSets.map((problemSet) => {
              const isDeletingThis =
                deleteProblemSetMutation.isPending &&
                deleteProblemSetMutation.variables.problemSetId ===
                  problemSet.problemSetId

              return (
                <ListItem
                  key={problemSet.problemSetId}
                  label={problemSet.name}
                  description={`문제 수: ${String(problemSet.problemCount)}개 · 생성일: ${new Date(problemSet.createdAt).toLocaleDateString()}`}
                  onClick={() => {
                    handleNavigateToProblemSetDetail(problemSet.problemSetId)
                  }}
                  startContent={
                    <Icon icon={BookOpen} size="sm" color="secondary" />
                  }
                  endContent={
                    <Button
                      label={isDeletingThis ? '삭제 중...' : '삭제'}
                      size="sm"
                      variant="destructive"
                      isDisabled={deleteProblemSetMutation.isPending}
                      icon={<Icon icon={Trash2} size="sm" />}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleDeleteProblemSet(
                          problemSet.problemSetId,
                          problemSet.name,
                        )
                      }}
                    />
                  }
                />
              )
            })}
          </List>

          <HStack hAlign="center" width="100%">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              isDisabled={problemSetsQuery.isFetching}
              onChange={(page) => {
                setCurrentPage(page)
              }}
            />
          </HStack>
        </VStack>
      )}

      {/* 닫으면 팝업 내부 상태도 초기화됩니다. */}
      {isCreateModalOpen && (
        <ProblemSetCreateDialog
          isSubmitting={createProblemSetMutation.isPending}
          errorMessage={
            createProblemSetMutation.error
              ? getProblemReferenceErrorMessage(
                  createProblemSetMutation.error,
                  '문제집 생성 중 오류가 발생했습니다.',
                )
              : null
          }
          onClose={handleCloseCreateModal}
          onSubmit={handleSubmitCreateProblemSet}
        />
      )}
    </VStack>
  )
}
