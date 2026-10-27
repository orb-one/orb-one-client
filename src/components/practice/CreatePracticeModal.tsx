import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Divider } from '@astryxdesign/core/Divider'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useToast } from '@astryxdesign/core/Toast'
import { useEffect, useId, useRef, useState } from 'react'

import { ProblemPickerDialog } from '@/components/problems/problem-picker-dialog'
import { PracticeProblemField } from '@/components/practice/practice-problem-field'
import { useCreatePractice } from '@/lib/api/practice'
import {
  formatDateInput,
  validateAndFormatPracticeDates,
} from '@/lib/practice/practice-date'
import type { Problem } from '@/lib/problems/problem-model'
import { getProblemReferenceErrorMessage } from '@/lib/problems/problem-reference-errors'

interface CreatePracticeModalProps {
  groupId: string
  isOpen: boolean
  onClose: () => void
}

export function CreatePracticeModal(props: CreatePracticeModalProps) {
  if (!props.isOpen) return null

  return <CreatePracticeModalContent key={props.groupId} {...props} />
}

function CreatePracticeModalContent({
  groupId,
  onClose,
}: CreatePracticeModalProps) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const formId = useId()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const showToast = useToast()
  const createPractice = useCreatePractice(groupId)
  const isSubmitting = createPractice.isPending
  const errorMessage =
    validationError ??
    (createPractice.isError
      ? getProblemReferenceErrorMessage(
          createPractice.error,
          '연습을 만들지 못했습니다.',
        )
      : null)

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
    if (isSubmitting) return

    if (!title.trim()) {
      setValidationError('연습 이름을 입력해 주세요.')
      return
    }

    const dates = validateAndFormatPracticeDates(startDate, endDate)
    if (!dates.success) {
      setValidationError(dates.error)
      return
    }

    if (!selectedProblem) {
      setValidationError('문제를 선택해 주세요.')
      return
    }

    setValidationError(null)
    createPractice.mutate(
      {
        title: title.trim(),
        startDate: dates.startDate,
        endDate: dates.endDate,
        problemIds: [selectedProblem.id],
      },
      {
        onSuccess: () => {
          showToast({ body: '연습을 만들었습니다.' })
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
            <DialogHeader title="연습 만들기" onOpenChange={handleClose} />
          }
          content={
            <LayoutContent
              ref={scrollAreaRef}
              isScrollable
              data-testid="practice-form-scroll-area"
            >
              <form id={formId} onSubmit={handleSubmit}>
                <FormLayout>
                  {errorMessage && (
                    <Banner role="alert" status="error" title={errorMessage} />
                  )}
                  <TextInput
                    htmlName="title"
                    label="연습 이름"
                    hasAutoFocus
                    value={title}
                    onChange={setTitle}
                    placeholder="1주차"
                    isDisabled={isSubmitting}
                  />
                  <TextInput
                    htmlName="startDate"
                    label="시작 일시"
                    value={startDate}
                    onChange={(value) => {
                      setStartDate(formatDateInput(value))
                    }}
                    placeholder="YYYYMMDD"
                    isDisabled={isSubmitting}
                  />
                  <TextInput
                    htmlName="endDate"
                    label="종료 일시"
                    value={endDate}
                    onChange={(value) => {
                      setEndDate(formatDateInput(value))
                    }}
                    placeholder="YYYYMMDD"
                    isDisabled={isSubmitting}
                  />
                  <Divider />
                  <PracticeProblemField
                    selectedProblem={selectedProblem}
                    isDisabled={isSubmitting}
                    onOpenPicker={() => {
                      setIsPickerOpen(true)
                    }}
                  />
                </FormLayout>
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
                  label="생성하기"
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
          setValidationError(null)
          createPractice.reset()
        }}
        description="연습에 추가할 문제를 선택해 주세요."
      />
    </>
  )
}
