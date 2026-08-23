import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { DateInput } from '@astryxdesign/core/DateInput'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Stack } from '@astryxdesign/core/Stack'

type ISODateString =
  `${number}${number}${number}${number}-${number}${number}-${number}${number}`
import { TextInput } from '@astryxdesign/core/TextInput'
import { useToast } from '@astryxdesign/core/Toast'
import { useState } from 'react'
import { useCreatePractice } from '@/lib/api/practice'

interface CreatePracticeModalProps {
  groupId: string
  isOpen: boolean
  onClose: () => void
}

export function CreatePracticeModal({
  groupId,
  isOpen,
  onClose,
}: CreatePracticeModalProps) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const showToast = useToast()

  const createPractice = useCreatePractice(groupId)

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!title || !startDate || !endDate) {
      showToast({ body: '모든 필드를 입력해주세요.', type: 'error' })
      return
    }

    createPractice.mutate(
      {
        title,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        problems: [], // 빈 문제 목록으로 생성
      },
      {
        onSuccess: () => {
          showToast({ body: '연습이 생성되었습니다.' })
          setTitle('')
          setStartDate('')
          setEndDate('')
          onClose()
        },
        onError: () => {
          showToast({ body: '연습 생성에 실패했습니다.', type: 'error' })
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
        title="연습 만들기"
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
          <Stack gap={4} direction="horizontal">
            <DateInput
              label="시작 일시"
              value={startDate as ISODateString}
              onChange={(val) => {
                setStartDate(val ?? '')
              }}
              placeholder="YYYY-MM-DD"
            />
            <DateInput
              label="종료 일시"
              value={endDate as ISODateString}
              onChange={(val) => {
                setEndDate(val ?? '')
              }}
              placeholder="YYYY-MM-DD"
            />
          </Stack>
        </FormLayout>
        <div className="mt-6 flex justify-end gap-2">
          <Button label="취소" variant="secondary" onClick={onClose} />
          <Button
            type="submit"
            label="연습 만들기"
            variant="primary"
            isLoading={createPractice.isPending}
          />
        </div>
      </form>
    </Dialog>
  )
}
