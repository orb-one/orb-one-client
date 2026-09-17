import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { DateInput } from '@astryxdesign/core/DateInput'
import { FormLayout } from '@astryxdesign/core/FormLayout'

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

    if (!provider || !externalProblemId || !name) {
      showToast({
        body: '플랫폼, 문제 ID, 문제 이름은 필수입니다.',
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
          setProvider('BOJ')
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
          </div>

          <hr className="my-4 border-gray-200" />

          <TextInput
            htmlName="provider"
            label="플랫폼 (예: BOJ, PROGRAMMERS)"
            value={provider}
            onChange={(val) => {
              setProvider(val)
            }}
            placeholder="BOJ"
          />
          <TextInput
            htmlName="externalProblemId"
            label="문제 ID (예: 1000)"
            value={externalProblemId}
            onChange={(val) => {
              setExternalProblemId(val)
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
            label="문제 링크 (선택)"
            value={url}
            onChange={(val) => {
              setUrl(val)
            }}
            placeholder="https://acmicpc.net/problem/1000"
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
