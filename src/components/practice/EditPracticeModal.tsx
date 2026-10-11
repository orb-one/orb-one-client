import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useToast } from '@astryxdesign/core/Toast'
import { useState } from 'react'
import { useUpdatePractice, type Practice } from '@/lib/api/practice'
import { getReadableErrorMessage } from '@/lib/api/error-message'
import {
  extractDateOnly,
  formatDateInput,
  validateAndFormatPracticeDates,
} from '@/lib/practice/practice-date'

interface EditPracticeModalProps {
  groupId: string
  practice: Practice | null
  isOpen: boolean
  onClose: () => void
}

interface EditPracticeModalContentProps {
  groupId: string
  practice: Practice
  isOpen: boolean
  onClose: () => void
}

function EditPracticeModalContent({
  groupId,
  practice,
  isOpen,
  onClose,
}: EditPracticeModalContentProps) {
  const [title, setTitle] = useState(practice.title)
  const [startDate, setStartDate] = useState(
    extractDateOnly(practice.startDate),
  )
  const [endDate, setEndDate] = useState(extractDateOnly(practice.endDate))
  const showToast = useToast()

  const updatePractice = useUpdatePractice(groupId, practice.id)

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!title.trim()) {
      showToast({ body: '연습 이름을 입력해주세요.', type: 'error' })
      return
    }

    const dateValidation = validateAndFormatPracticeDates(startDate, endDate)
    if (!dateValidation.success) {
      showToast({ body: dateValidation.error, type: 'error' })
      return
    }

    updatePractice.mutate(
      {
        title: title.trim(),
        startDate: dateValidation.startDate,
        endDate: dateValidation.endDate,
      },
      {
        onSuccess: () => {
          showToast({ body: '연습이 수정되었습니다.' })
          onClose()
        },
        onError: (error: unknown) => {
          const message = getReadableErrorMessage(
            error,
            '연습 수정에 실패했습니다.',
          )
          showToast({ body: message, type: 'error' })
        },
      },
    )
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) onClose()
      }}
    >
      <DialogHeader
        title="연습 수정하기"
        onOpenChange={(open: boolean) => {
          if (!open) onClose()
        }}
      />
      <form
        onSubmit={handleSubmit}
        className="p-4"
        style={{ overflowX: 'hidden', boxSizing: 'border-box' }}
      >
        <FormLayout>
          <TextInput
            htmlName="title"
            label="연습 이름"
            hasAutoFocus
            value={title}
            onChange={(val) => {
              setTitle(val)
            }}
            placeholder="1주차"
          />
          <div className="flex w-full flex-col gap-4 sm:flex-row">
            <TextInput
              htmlName="startDate"
              label="시작 일시"
              value={startDate}
              onChange={(val) => {
                setStartDate(formatDateInput(val))
              }}
              placeholder="YYYYMMDD"
            />
            <TextInput
              htmlName="endDate"
              label="종료 일시"
              value={endDate}
              onChange={(val) => {
                setEndDate(formatDateInput(val))
              }}
              placeholder="YYYYMMDD"
            />
          </div>
        </FormLayout>
        <div className="mt-6 flex justify-end gap-2">
          <Button label="취소" variant="secondary" onClick={onClose} />
          <Button
            type="submit"
            label="저장"
            variant="primary"
            isLoading={updatePractice.isPending}
          />
        </div>
      </form>
    </Dialog>
  )
}

export function EditPracticeModal({
  groupId,
  practice,
  isOpen,
  onClose,
}: EditPracticeModalProps) {
  if (!practice || !isOpen) {
    return null
  }

  return (
    <EditPracticeModalContent
      key={practice.id}
      groupId={groupId}
      practice={practice}
      isOpen={isOpen}
      onClose={onClose}
    />
  )
}
