import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useToast } from '@astryxdesign/core/Toast'
import { useState } from 'react'
import { useAddPracticeProblem } from '@/lib/api/practice'

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
  const [provider, setProvider] = useState('')
  const [externalProblemId, setExternalProblemId] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  const showToast = useToast()
  const addProblem = useAddPracticeProblem(groupId, practiceId)

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!provider || !externalProblemId || !name || !url) {
      showToast({
        body: '모든 문제 정보를 입력해주세요.',
        type: 'error',
      })
      return
    }

    addProblem.mutate(
      {
        provider,
        externalProblemId,
        name,
        url,
      },
      {
        onSuccess: () => {
          showToast({ body: '문제가 성공적으로 등록되었습니다.' })
          setProvider('')
          setExternalProblemId('')
          setName('')
          setUrl('')
          onClose()
        },
        onError: () => {
          showToast({ body: '문제 등록에 실패했습니다.', type: 'error' })
        },
      },
    )
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          setProvider('')
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
            setProvider('')
            setExternalProblemId('')
            setName('')
            setUrl('')
            onClose()
          }
        }}
      />
      <form onSubmit={handleSubmit} className="p-4">
        <FormLayout>
          <TextInput
            htmlName="provider"
            label="플랫폼"
            hasAutoFocus
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
            label="추가하기"
            variant="primary"
            isLoading={addProblem.isPending}
          />
        </div>
      </form>
    </Dialog>
  )
}
