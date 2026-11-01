import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useToast } from '@astryxdesign/core/Toast'
import { useEffect, useId, useRef, useState } from 'react'
import { PracticeScheduleField } from '@/components/practice/practice-schedule-field'
import { useUpdatePractice, type Practice } from '@/lib/api/practice'
import { getReadableErrorMessage } from '@/lib/api/error-message'
import {
  restorePracticeSchedule,
  validatePracticeSchedule,
} from '@/lib/practice/practice-date'

interface EditPracticeModalProps {
  groupId: string
  practice: Practice | null
  isOpen: boolean
  onClose: () => void
}

function EditPracticeModalContent({
  groupId,
  practice,
  onClose,
}: {
  groupId: string
  practice: Practice
  onClose: () => void
}) {
  const [title, setTitle] = useState(practice.title)
  const [schedule, setSchedule] = useState(() =>
    restorePracticeSchedule(practice.startDate, practice.endDate),
  )
  const [validationError, setValidationError] = useState<string | null>(null)
  const formId = useId()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const showToast = useToast()
  const updatePractice = useUpdatePractice(groupId, practice.id)
  const isSubmitting = updatePractice.isPending
  const errorMessage = !schedule
    ? '연습 기간을 확인할 수 없어 수정할 수 없습니다. 새로고침 후 다시 시도해 주세요.'
    : (validationError ??
      (updatePractice.isError
        ? getReadableErrorMessage(
            updatePractice.error,
            '연습 수정에 실패했습니다.',
          )
        : null))

  useEffect(() => {
    if (errorMessage && scrollAreaRef.current)
      scrollAreaRef.current.scrollTop = 0
  }, [errorMessage])

  function handleClose(open: boolean) {
    if (!open && !isSubmitting) onClose()
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting || !schedule) return
    if (!title.trim()) {
      setValidationError('연습 이름을 입력해 주세요.')
      return
    }
    const dates = validatePracticeSchedule(schedule)
    if (!dates.success) {
      setValidationError(dates.error)
      return
    }
    setValidationError(null)
    updatePractice.mutate(
      {
        title: title.trim(),
        startDate: dates.startDate,
        endDate: dates.endDate,
      },
      {
        onSuccess: () => {
          showToast({ body: '연습이 수정되었습니다.' })
          onClose()
        },
      },
    )
  }

  return (
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
          <DialogHeader title="연습 수정하기" onOpenChange={handleClose} />
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
                  onChange={(value) => {
                    setTitle(value)
                    setValidationError(null)
                    updatePractice.reset()
                  }}
                  placeholder="1주차"
                  isDisabled={isSubmitting}
                />
                {schedule && (
                  <PracticeScheduleField
                    value={schedule}
                    onChange={(value) => {
                      setSchedule(value)
                      setValidationError(null)
                      updatePractice.reset()
                    }}
                    isDisabled={isSubmitting}
                  />
                )}
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
                label="저장"
                variant="primary"
                isDisabled={!schedule || isSubmitting}
                isLoading={isSubmitting}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}

export function EditPracticeModal({
  groupId,
  practice,
  isOpen,
  onClose,
}: EditPracticeModalProps) {
  if (!practice || !isOpen) return null
  return (
    <EditPracticeModalContent
      key={practice.id}
      groupId={groupId}
      practice={practice}
      onClose={onClose}
    />
  )
}
