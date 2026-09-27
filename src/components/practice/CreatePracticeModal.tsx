import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useToast } from '@astryxdesign/core/Toast'
import { useState } from 'react'
import { useCreatePractice } from '@/lib/api/practice'

interface CreatePracticeModalProps {
  groupId: string
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

export function CreatePracticeModal({
  groupId,
  isOpen,
  onClose,
}: CreatePracticeModalProps) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 첫 문제 등록을 위한 필수 상태들
  const [provider, setProvider] = useState('')
  const [externalProblemId, setExternalProblemId] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  const showToast = useToast()

  const createPractice = useCreatePractice(groupId)

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!title || !startDate || !endDate) {
      showToast({ body: '연습 기본 정보를 모두 입력해주세요.', type: 'error' })
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

    if (!provider || !externalProblemId || !name || !url) {
      showToast({
        body: '모든 문제 정보를 입력해주세요.',
        type: 'error',
      })
      return
    }

    createPractice.mutate(
      {
        title,
        startDate: `${startDate}T00:00:00`,
        endDate: `${endDate}T23:59:59`,
        problems: [
          {
            provider,
            externalProblemId,
            name,
            url,
          },
        ],
      },
      {
        onSuccess: () => {
          showToast({ body: '연습이 성공적으로 생성되었습니다.' })
          setTitle('')
          setStartDate('')
          setEndDate('')
          setProvider('')
          setExternalProblemId('')
          setName('')
          setUrl('')
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
        title="연습 및 첫 문제 등록"
        onOpenChange={(open: boolean) => {
          if (!open) onClose()
        }}
      />
      <form
        onSubmit={handleSubmit}
        className="p-4"
        style={{ maxHeight: '70vh', overflowY: 'auto' }}
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

          <hr className="my-4 border-gray-200" />

          <TextInput
            htmlName="provider"
            label="플랫폼"
            value={provider}
            onChange={(val) => {
              setProvider(val)
            }}
            placeholder="플랫폼"
          />
          <TextInput
            htmlName="externalProblemId"
            label="문제 ID"
            value={externalProblemId}
            onChange={(val) => {
              setExternalProblemId(val.replace(/\D/g, ''))
            }}
            placeholder="1000"
          />
          <TextInput
            htmlName="name"
            label="문제 이름"
            value={name}
            onChange={(val) => {
              setName(val)
            }}
            placeholder="A+B"
          />
          <TextInput
            htmlName="url"
            label="문제 링크"
            value={url}
            onChange={(val) => {
              setUrl(val)
            }}
            placeholder="https://"
          />
        </FormLayout>
        <div className="mt-6 flex justify-end gap-2">
          <Button label="취소" variant="secondary" onClick={onClose} />
          <Button
            type="submit"
            label="생성하기"
            variant="primary"
            isLoading={createPractice.isPending}
          />
        </div>
      </form>
    </Dialog>
  )
}
