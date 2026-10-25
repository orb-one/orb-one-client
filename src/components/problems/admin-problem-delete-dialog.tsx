import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useEffect, useRef } from 'react'

import { useTranslations } from '@/lib/i18n/use-translations'
import type { Problem } from '@/lib/problems/problem-model'

interface AdminProblemDeleteDialogProps {
  problem: Problem
  isDeleting: boolean
  errorMessage: string | null
  onClose: () => void
  onDelete: () => void
}

export function AdminProblemDeleteDialog({
  problem,
  isDeleting,
  errorMessage,
  onClose,
  onDelete,
}: AdminProblemDeleteDialogProps) {
  const copy = useTranslations().adminProblems
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // 제목 자동 포커스 이후 안전한 기본 동작인 취소로 이동한다.
    cancelRef.current?.focus()
  }, [])

  function handleOpenChange(open: boolean) {
    if (!open && !isDeleting) onClose()
  }

  return (
    <Dialog
      isOpen
      onOpenChange={handleOpenChange}
      purpose="form"
      role="alertdialog"
      aria-label={copy.deleteTitle}
      width={440}
      maxHeight="calc(100dvh - 2rem)"
    >
      <Layout
        height="auto"
        defaultHasDividers
        header={
          <DialogHeader
            title={copy.deleteTitle}
            onOpenChange={handleOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={3}>
              <Text>{problem.name}</Text>
              <Text color="secondary" type="supporting" wordBreak="break-all">
                {problem.provider} · {problem.externalId}
              </Text>
              <Text color="secondary">{copy.deleteDescription}</Text>
              {errorMessage ? (
                <Banner status="error" title={errorMessage} />
              ) : null}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button
                ref={cancelRef}
                label={copy.cancel}
                variant="secondary"
                isDisabled={isDeleting}
                data-autofocus
                onClick={onClose}
              />
              <Button
                label={copy.deleteAction}
                variant="destructive"
                isLoading={isDeleting}
                onClick={onDelete}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
