import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { useToast } from '@astryxdesign/core/Toast'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { handleAuthSessionExpiredError } from '@/app/query-client'
import { ApiError, AuthSessionExpiredError } from '@/lib/api/client'
import { useI18n } from '@/lib/i18n/use-translations'
import {
  restoreDeletedSolution,
  useDeleteSolution,
} from '@/lib/solutions/solution-mutations'

type RestoreResult = 'success' | 'retryable-error' | 'terminal-error'

/** 작성자 풀이의 삭제 확인과 실행 취소 흐름을 제공한다. */
export function SolutionDeleteAction({
  solutionId,
  onDeleted,
}: SolutionDeleteActionProps) {
  const { t } = useI18n()
  const copy = t.solutions.detail
  const queryClient = useQueryClient()
  const showToast = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const deleteMutation = useDeleteSolution(solutionId)

  /** 삭제 오류를 서버 상태 계약에 맞는 사용자 메시지로 변환한다. */
  function getDeleteErrorMessage(error: unknown) {
    if (error instanceof ApiError && error.status === 403) {
      return copy.deleteForbidden
    }

    if (error instanceof ApiError && error.status === 404) {
      return copy.deleteNotFound
    }

    return copy.deleteError
  }

  /** 삭제 성공 안내를 표시하고 복구 요청의 재시도 가능 여부를 관리한다. */
  function showDeleteSuccessToast() {
    let dismissDeleteToast: (() => void) | null = null

    /** 삭제된 풀이를 복구하고 실패 종류에 따라 재시도 가능 여부를 반환한다. */
    const restore = async (): Promise<RestoreResult> => {
      try {
        await restoreDeletedSolution(queryClient, solutionId)
      } catch (error) {
        if (error instanceof AuthSessionExpiredError) {
          dismissDeleteToast?.()
          handleAuthSessionExpiredError(error, queryClient, showToast)
          return 'terminal-error'
        }

        if (error instanceof ApiError && error.status === 404) {
          dismissDeleteToast?.()
          showToast({
            body: copy.restoreExpired,
            type: 'error',
            isAutoHide: true,
            autoHideDuration: 5000,
            uniqueID: `solution.restore.error.${solutionId}`,
            collisionBehavior: 'overwrite',
          })
          return 'terminal-error'
        }

        showToast({
          body: copy.restoreError,
          type: 'error',
          isAutoHide: true,
          autoHideDuration: 5000,
          uniqueID: `solution.restore.error.${solutionId}`,
          collisionBehavior: 'overwrite',
        })
        return 'retryable-error'
      }

      dismissDeleteToast?.()
      showToast({
        body: copy.restoreSuccess,
        uniqueID: `solution.restore.${solutionId}`,
        collisionBehavior: 'overwrite',
      })
      return 'success'
    }

    dismissDeleteToast = showToast({
      body: copy.deleteSuccess,
      endContent: (
        <SolutionRestoreAction
          label={copy.deleteUndo}
          retryLabel={copy.restoreRetry}
          onRestore={restore}
        />
      ),
      autoHideDuration: 5000,
      uniqueID: `solution.delete.${solutionId}`,
      collisionBehavior: 'overwrite',
    })
  }

  /** 확인된 삭제 요청을 처리하고 성공 시 상위 화면에 완료를 알린다. */
  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync()
    } catch (error) {
      setIsDialogOpen(false)

      if (error instanceof AuthSessionExpiredError) {
        return
      }

      showToast({
        body: getDeleteErrorMessage(error),
        type: 'error',
        isAutoHide: true,
        autoHideDuration: 5000,
        uniqueID: `solution.delete.error.${solutionId}`,
        collisionBehavior: 'overwrite',
      })
      return
    }

    setIsDialogOpen(false)
    showDeleteSuccessToast()
    await onDeleted()
  }

  return (
    <>
      <Button
        label={copy.delete}
        size="sm"
        variant="destructive"
        isDisabled={deleteMutation.isPending}
        onClick={() => {
          deleteMutation.reset()
          setIsDialogOpen(true)
        }}
      />
      <AlertDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={copy.deleteTitle}
        description={copy.deleteDescription}
        actionLabel={copy.delete}
        cancelLabel={copy.deleteCancel}
        isActionLoading={deleteMutation.isPending}
        onAction={handleDelete}
      />
    </>
  )
}

/** 복구 요청 중 중복 클릭을 막고 일시적 실패 후 재시도를 제공한다. */
function SolutionRestoreAction({
  label,
  retryLabel,
  onRestore,
}: SolutionRestoreActionProps) {
  const [hasFailed, setHasFailed] = useState(false)

  /** 복구 결과에 따라 버튼을 재시도 상태로 전환한다. */
  async function handleRestore() {
    const result = await onRestore()

    if (result === 'retryable-error') {
      setHasFailed(true)
    }
  }

  return (
    <Button
      label={hasFailed ? retryLabel : label}
      size="sm"
      variant="secondary"
      clickAction={handleRestore}
    />
  )
}

interface SolutionDeleteActionProps {
  solutionId: string
  onDeleted: () => void | Promise<void>
}

interface SolutionRestoreActionProps {
  label: string
  retryLabel: string
  onRestore: () => Promise<RestoreResult>
}
