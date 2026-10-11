import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Selector } from '@astryxdesign/core/Selector'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useToast } from '@astryxdesign/core/Toast'
import { useState } from 'react'
import { useAddPracticeProblem } from '@/lib/api/practice'
import { getReadableErrorMessage } from '@/lib/api/error-message'
import { PRACTICE_PROVIDER_OPTIONS } from '@/lib/practice/provider-options'

interface AddPracticeProblemModalProps {
  groupId: string
  practiceId: string
  isOpen: boolean
  onClose: () => void
}

export function AddPracticeProblemModal({
  groupId,
  practiceId,
  isOpen,
  onClose,
}: AddPracticeProblemModalProps) {
  const [providerSelect, setProviderSelect] = useState('JUNGOL')
  const [customProvider, setCustomProvider] = useState('')
  const [externalProblemId, setExternalProblemId] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  const showToast = useToast()
  const addProblem = useAddPracticeProblem(groupId, practiceId)

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

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

    addProblem.mutate(
      {
        provider: effectiveProvider,
        externalProblemId: externalProblemId.trim(),
        name: name.trim(),
        url: url.trim(),
      },
      {
        onSuccess: () => {
          showToast({ body: '문제가 성공적으로 등록되었습니다.' })
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
            '문제 등록에 실패했습니다.',
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
        title="문제 추가하기"
        onOpenChange={(open: boolean) => {
          if (!open) {
            setProviderSelect('JUNGOL')
            setCustomProvider('')
            setExternalProblemId('')
            setName('')
            setUrl('')
            onClose()
          }
        }}
      />
      <form onSubmit={handleSubmit} className="p-4">
        <FormLayout>
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
            label="추가하기"
            variant="primary"
            isLoading={addProblem.isPending}
          />
        </div>
      </form>
    </Dialog>
  )
}
