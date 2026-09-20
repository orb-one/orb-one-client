import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useToast } from '@astryxdesign/core/Toast'
import { useState, useEffect } from 'react'
import { useUpdatePractice, type Practice } from '@/lib/api/practice'

interface EditPracticeModalProps {
  groupId: string
  practice: Practice | null
  isOpen: boolean
  onClose: () => void
}

const formatDateInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length >= 7) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
  } else if (digits.length >= 5) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }
  return digits
}

export function EditPracticeModal({
  groupId,
  practice,
  isOpen,
  onClose,
}: EditPracticeModalProps) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const showToast = useToast()

  // practice prop이 변경될 때마다 모달의 초기값을 세팅합니다.
  useEffect(() => {
    if (practice) {
      // eslint-disable-next-line
      setTitle(practice.title)
      setStartDate(practice.startDate.split('T')[0] ?? '')
      setEndDate(practice.endDate.split('T')[0] ?? '')
    }
  }, [practice])

  const updatePractice = useUpdatePractice(groupId, practice?.id ?? '')

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!practice) return

    if (!title || !startDate || !endDate) {
      showToast({ body: '모든 필드를 입력해주세요.', type: 'error' })
      return
    }

    if (startDate.length !== 10 || endDate.length !== 10) {
      showToast({
        body: '날짜를 끝까지 올바르게 입력해주세요. (예: 2023-01-01)',
        type: 'error',
      })
      return
    }

    if (startDate > endDate) {
      showToast({
        body: '종료 일시는 시작 일시보다 빠를 수 없습니다.',
        type: 'error',
      })
      return
    }

    updatePractice.mutate(
      {
        title,
        startDate: `${startDate}T00:00:00`,
        endDate: `${endDate}T23:59:59`,
      },
      {
        onSuccess: () => {
          showToast({ body: '연습이 수정되었습니다.' })
          onClose()
        },
        onError: () => {
          showToast({ body: '연습 수정에 실패했습니다.', type: 'error' })
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
      <form onSubmit={handleSubmit} className="p-4">
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
          <div className="flex flex-col gap-4">
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
