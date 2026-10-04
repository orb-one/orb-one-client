import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useToast } from '@astryxdesign/core/Toast'
import { useState } from 'react'
import { useCreatePractice } from '@/lib/api/practice'
import { ProblemPickerDialog } from '@/components/problems/problem-picker-dialog'
import type { Problem } from '@/lib/problems/problem-model'
import { List, ListItem } from '@astryxdesign/core/List'
import { Icon } from '@astryxdesign/core/Icon'
import { Trash2, Plus } from 'lucide-react'

interface CreatePracticeModalProps {
  groupId: string
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

export function CreatePracticeModal({
  groupId,
  isOpen,
  onClose,
}: CreatePracticeModalProps) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [selectedProblems, setSelectedProblems] = useState<Problem[]>([])
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const showToast = useToast()
  const createPractice = useCreatePractice(groupId)

  const handleClose = () => {
    setTitle('')
    setStartDate('')
    setEndDate('')
    setSelectedProblems([])
    onClose()
  }

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!title || !startDate || !endDate) {
      showToast({ body: '연습 기본 정보를 모두 입력해주세요.', type: 'error' })
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

    if (selectedProblems.length === 0) {
      showToast({
        body: '최소 하나의 문제를 선택해주세요.',
        type: 'error',
      })
      return
    }

    createPractice.mutate(
      {
        title,
        startDate: `${startDate.replace(' ', 'T')}:00`,
        endDate: `${endDate.replace(' ', 'T')}:00`,
        problemIds: selectedProblems.map((p) => p.id),
      },
      {
        onSuccess: () => {
          showToast({ body: '연습이 성공적으로 생성되었습니다.' })
          handleClose()
        },
        onError: (error: Error) => {
          showToast({
            body: error.message || '연습 생성에 실패했습니다.',
            type: 'error',
          })
        },
      },
    )
  }

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onOpenChange={(open: boolean) => {
          if (!open) handleClose()
        }}
      >
        <DialogHeader
          title="연습 및 첫 문제 등록"
          onOpenChange={(open: boolean) => {
            if (!open) handleClose()
          }}
        />
        <form
          onSubmit={handleSubmit}
          className="p-4"
          style={{
            maxHeight: '70vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
          }}
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

            <hr className="my-4 border-gray-200" />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">선택된 문제</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  label="문제 추가"
                  icon={<Icon icon={Plus} size="sm" />}
                  onClick={() => {
                    setIsPickerOpen(true)
                  }}
                />
              </div>
              {selectedProblems.length > 0 ? (
                <List density="balanced" hasDividers>
                  {selectedProblems.map((problem) => (
                    <ListItem
                      key={problem.id}
                      label={problem.name}
                      description={`${problem.provider} ${problem.externalId}`}
                      endContent={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          label="삭제"
                          icon={<Icon icon={Trash2} size="sm" />}
                          onClick={() => {
                            setSelectedProblems(
                              selectedProblems.filter(
                                (p) => p.id !== problem.id,
                              ),
                            )
                          }}
                        />
                      }
                    />
                  ))}
                </List>
              ) : (
                <div className="rounded-md border border-dashed py-4 text-center text-sm text-gray-500">
                  선택된 문제가 없습니다.
                </div>
              )}
            </div>
          </FormLayout>
          <div className="mt-6 flex justify-end gap-2">
            <Button label="취소" variant="secondary" onClick={handleClose} />
            <Button
              type="submit"
              label="생성하기"
              variant="primary"
              isLoading={createPractice.isPending}
            />
          </div>
        </form>
      </Dialog>
      <ProblemPickerDialog
        isOpen={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        selectedProblem={null}
        onSelect={(problem) => {
          if (!selectedProblems.find((p) => p.id === problem.id)) {
            setSelectedProblems([...selectedProblems, problem])
          }
        }}
      />
    </>
  )
}
