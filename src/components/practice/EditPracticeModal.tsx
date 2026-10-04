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

const formatDateTimeInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 12)
  if (digits.length >= 11) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)} ${digits.slice(8, 10)}:${digits.slice(10, 12)}`
  } else if (digits.length >= 9) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)} ${digits.slice(8)}`
  } else if (digits.length >= 7) {
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
      setStartDate(practice.startDate.substring(0, 16).replace('T', ' '))
      setEndDate(practice.endDate.substring(0, 16).replace('T', ' '))
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

    if (startDate.length !== 16 || endDate.length !== 16) {
      showToast({
        body: '날짜와 시간을 끝까지 올바르게 입력해주세요. (예: 202301011430)',
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
        startDate: `${startDate.replace(' ', 'T')}:00`,
        endDate: `${endDate.replace(' ', 'T')}:00`,
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
                setStartDate(formatDateTimeInput(val))
              }}
              placeholder="YYYYMMDDHHMM"
            />
            <TextInput
              htmlName="endDate"
              label="종료 일시"
              value={endDate}
              onChange={(val) => {
                setEndDate(formatDateTimeInput(val))
              }}
              placeholder="YYYYMMDDHHMM"
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
