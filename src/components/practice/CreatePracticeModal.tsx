import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Selector } from '@astryxdesign/core/Selector'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useToast } from '@astryxdesign/core/Toast'
import { useState } from 'react'
import { useCreatePractice } from '@/lib/api/practice'
import { getReadableErrorMessage } from '@/lib/api/error-message'
import {
  formatDateInput,
  validateAndFormatPracticeDates,
} from '@/lib/practice/practice-date'
import { PRACTICE_PROVIDER_OPTIONS } from '@/lib/practice/provider-options'

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

  // 첫 문제 등록을 위한 상태들
  const [providerSelect, setProviderSelect] = useState('JUNGOL')
  const [customProvider, setCustomProvider] = useState('')
  const [externalProblemId, setExternalProblemId] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  const showToast = useToast()
  const createPractice = useCreatePractice(groupId)

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

    const effectiveProvider =
      providerSelect === 'CUSTOM'
        ? customProvider.trim()
        : providerSelect.trim()

    if (!effectiveProvider) {
      showToast({
        body: '플랫폼을 선택하거나 직접 입력해주세요.',
        type: 'error',
      })
      return
    }

    if (!externalProblemId.trim() || !name.trim() || !url.trim()) {
      showToast({
        body: '모든 문제 정보를 입력해주세요.',
        type: 'error',
      })
      return
    }

    createPractice.mutate(
      {
        title: title.trim(),
        startDate: dateValidation.startDate,
        endDate: dateValidation.endDate,
        problems: [
          {
            provider: effectiveProvider,
            externalProblemId: externalProblemId.trim(),
            name: name.trim(),
            url: url.trim(),
          },
        ],
      },
      {
        onSuccess: () => {
          showToast({ body: '연습이 성공적으로 생성되었습니다.' })
          setTitle('')
          setStartDate('')
          setEndDate('')
          setProviderSelect('JUNGOL')
          setCustomProvider('')
          setExternalProblemId('')
          setName('')
          setUrl('')
          onClose()
        },
        onError: (error: unknown) => {
          const message = getReadableErrorMessage(
            error,
            '연습 생성에 실패했습니다.',
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
        if (!open) {
          setTitle('')
          setStartDate('')
          setEndDate('')
          setProviderSelect('JUNGOL')
          setCustomProvider('')
          setExternalProblemId('')
          setName('')
          setUrl('')
          onClose()
        }
      }}
    >
      <DialogHeader
        title="연습 및 첫 문제 등록"
        onOpenChange={(open: boolean) => {
          if (!open) {
            setTitle('')
            setStartDate('')
            setEndDate('')
            setProviderSelect('JUNGOL')
            setCustomProvider('')
            setExternalProblemId('')
            setName('')
            setUrl('')
            onClose()
          }
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

          <Selector
            htmlName="provider"
            label="플랫폼"
            value={providerSelect}
            onChange={(val) => {
              setProviderSelect(val)
            }}
            options={PRACTICE_PROVIDER_OPTIONS}
            placeholder="플랫폼 선택"
          />

          {providerSelect === 'CUSTOM' && (
            <TextInput
              htmlName="customProvider"
              label="플랫폼 직접 입력"
              value={customProvider}
              onChange={(val) => {
                setCustomProvider(val)
              }}
              placeholder="플랫폼 이름을 입력하세요"
            />
          )}

          <TextInput
            htmlName="externalProblemId"
            label="문제 ID"
            value={externalProblemId}
            onChange={(val) => {
              setExternalProblemId(val)
            }}
            placeholder="예: 1000"
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
