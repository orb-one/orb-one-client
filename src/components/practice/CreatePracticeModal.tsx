import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import {
  DateRangeInput,
  type DateRange,
} from '@astryxdesign/core/DateRangeInput'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Divider } from '@astryxdesign/core/Divider'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useToast } from '@astryxdesign/core/Toast'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

import { ProblemMultiPickerDialog } from '@/components/problems/problem-multi-picker-dialog'
import { PracticeProblemField } from '@/components/practice/practice-problem-field'
import { useCreatePractice } from '@/lib/api/practice'
import { validateAndFormatPracticeDates } from '@/lib/practice/practice-date'
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
  const [dateRange, setDateRange] = useState<DateRange | null>(null)
  const hasWideCalendar = useMediaQuery('(min-width: 640px)')
  const [selectedProblems, setSelectedProblems] = useState<Problem[]>([])
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const pickerButtonRef = useRef<HTMLButtonElement>(null)
  const wasPickerOpenRef = useRef(false)
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

  useLayoutEffect(() => {
    if (wasPickerOpenRef.current && !isPickerOpen) {
      pickerButtonRef.current?.focus()
    }
    wasPickerOpenRef.current = isPickerOpen
  }, [isPickerOpen])

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

    if (!dateRange) {
      setValidationError('연습 기간을 선택해 주세요.')
      return
    }

    const dates = validateAndFormatPracticeDates(dateRange.start, dateRange.end)
    if (!dates.success) {
      setValidationError(dates.error)
      return
    }

    if (selectedProblems.length === 0) {
      setValidationError('문제를 선택해 주세요.')
      return
    }

    setValidationError(null)
    createPractice.mutate(
      {
        title: title.trim(),
        startDate: dates.startDate,
        endDate: dates.endDate,
        problemIds: selectedProblems.map((problem) => problem.id),
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
                  <DateRangeInput
                    label="연습 기간"
                    placeholder="시작일과 종료일을 선택해 주세요"
                    value={dateRange}
                    onChange={(value) => {
                      setDateRange(value)
                      setValidationError(null)
                    }}
                    min="1970-01-01"
                    max="2100-12-31"
                    numberOfMonths={hasWideCalendar ? 2 : 1}
                    isDisabled={isSubmitting}
                    width="100%"
                  />
                  <Divider />
                  <PracticeProblemField
                    pickerButtonRef={pickerButtonRef}
                    selectedProblems={selectedProblems}
                    isDisabled={isSubmitting}
                    onRemoveProblem={(problemId) => {
                      setSelectedProblems((current) =>
                        current.filter((problem) => problem.id !== problemId),
                      )
                      setValidationError(null)
                      createPractice.reset()
                    }}
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
                  isDisabled={
                    !dateRange || selectedProblems.length === 0 || isSubmitting
                  }
                  isLoading={isSubmitting}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
      {isPickerOpen && (
        <ProblemMultiPickerDialog
          title="문제 선택"
          description="연습에 포함할 문제를 선택해 주세요. 여러 문제를 선택할 수 있습니다."
          initialSelectedProblems={selectedProblems}
          submitLabel="선택 완료"
          allowEmptySelection
          isSubmitting={false}
          onClose={() => {
            setIsPickerOpen(false)
          }}
          onSubmit={(_, problems) => {
            setSelectedProblems(problems)
            setIsPickerOpen(false)
            setValidationError(null)
            createPractice.reset()
          }}
        />
      )}
    </>
  )
}
