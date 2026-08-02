import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Field } from '@astryxdesign/core/Field'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Stack } from '@astryxdesign/core/Stack'
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
          <Field label="연습 이름" inputID="title">
            <TextInput
              id="title"
              label="연습 이름"
              value={title}
              onChange={setTitle}
              placeholder="예: 1주차 DP 특훈"
            />
          </Field>
          <Stack gap={4} direction="horizontal">
            <Field label="시작 일시" inputID="startDate" className="flex-1">
              <TextInput
                id="startDate"
                label="시작 일시"
                value={startDate}
                onChange={setStartDate}
                placeholder="YYYY-MM-DDTHH:mm"
              />
            </Field>
            <Field label="종료 일시" inputID="endDate" className="flex-1">
              <TextInput
                id="endDate"
                label="종료 일시"
                value={endDate}
                onChange={setEndDate}
                placeholder="YYYY-MM-DDTHH:mm"
              />
            </Field>
          </Stack>
        </FormLayout>
        <div className="mt-6 flex justify-end gap-2">
          <Button label="취소" variant="secondary" onClick={onClose} />
          <Button
            type="submit"
            label="만들기"
            variant="primary"
            isLoading={createPractice.isPending}
          />
        </div>
      </form>
    </Dialog>
  )
}
