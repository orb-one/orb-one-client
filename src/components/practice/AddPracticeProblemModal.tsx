import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { useToast } from '@astryxdesign/core/Toast'
import { VStack } from '@astryxdesign/core/VStack'
import { useEffect, useId, useRef, useState } from 'react'

import { ProblemPickerDialog } from '@/components/problems/problem-picker-dialog'
import { PracticeProblemField } from '@/components/practice/practice-problem-field'
import { useAddPracticeProblem } from '@/lib/api/practice'
import type { Problem } from '@/lib/problems/problem-model'
import { getProblemReferenceErrorMessage } from '@/lib/problems/problem-reference-errors'

interface AddPracticeProblemModalProps {
  groupId: string
  practiceId: string
  isOpen: boolean
  onClose: () => void
}

export function AddPracticeProblemModal(props: AddPracticeProblemModalProps) {
  if (!props.isOpen) return null

  return <AddPracticeProblemModalContent key={props.practiceId} {...props} />
}

function AddPracticeProblemModalContent({
  groupId,
  practiceId,
  onClose,
}: AddPracticeProblemModalProps) {
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const formId = useId()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const showToast = useToast()
  const addProblem = useAddPracticeProblem(groupId, practiceId)
  const isSubmitting = addProblem.isPending
  const errorMessage = addProblem.isError
    ? getProblemReferenceErrorMessage(
        addProblem.error,
        '문제 등록에 실패했습니다.',
      )
    : null

  useEffect(() => {
    if (errorMessage && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0
    }
  }, [errorMessage])

  function handleClose(open: boolean) {
    if (!open && !isSubmitting) onClose()
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting || !selectedProblem) return

    addProblem.mutate(
      { problemIds: [selectedProblem.id] },
      {
        onSuccess: () => {
          showToast({ body: '문제가 성공적으로 등록되었습니다.' })
          onClose()
        },
      },
    )
  }

  return (
    <>
      <Dialog
        isOpen
        onOpenChange={handleClose}
        purpose="form"
        width={560}
        maxHeight="calc(100dvh - 1rem)"
      >
        <Layout
          height="fill"
          defaultHasDividers
          header={
            <DialogHeader title="문제 추가하기" onOpenChange={handleClose} />
          }
          content={
            <LayoutContent
              ref={scrollAreaRef}
              isScrollable
              data-testid="practice-form-scroll-area"
            >
              <form id={formId} onSubmit={handleSubmit}>
                <VStack gap={4}>
                  {errorMessage && (
                    <Banner status="error" title={errorMessage} />
                  )}
                  <PracticeProblemField
                    selectedProblem={selectedProblem}
                    isDisabled={isSubmitting}
                    onOpenPicker={() => {
                      setIsPickerOpen(true)
                    }}
                  />
                </VStack>
              </form>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack width="100%" hAlign="end" gap={2}>
                <Button
                  label="취소"
                  variant="secondary"
                  isDisabled={isSubmitting}
                  onClick={() => {
                    handleClose(false)
                  }}
                />
                <Button
                  type="submit"
                  form={formId}
                  label="추가하기"
                  variant="primary"
                  isDisabled={!selectedProblem || isSubmitting}
                  isLoading={isSubmitting}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
      <ProblemPickerDialog
        isOpen={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        selectedProblem={selectedProblem}
        onSelect={(problem) => {
          setSelectedProblem(problem)
          addProblem.reset()
        }}
        description="연습에 연결할 문제를 선택해 주세요."
      />
    </>
  )
}
