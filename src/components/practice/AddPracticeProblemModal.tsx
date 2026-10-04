import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { useToast } from '@astryxdesign/core/Toast'
import { useState } from 'react'
import { useAddPracticeProblem } from '@/lib/api/practice'
import { ProblemPickerDialog } from '@/components/problems/problem-picker-dialog'
import type { Problem } from '@/lib/problems/problem-model'
import { List, ListItem } from '@astryxdesign/core/List'
import { Icon } from '@astryxdesign/core/Icon'
import { Trash2, Plus } from 'lucide-react'

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
  const [selectedProblems, setSelectedProblems] = useState<Problem[]>([])
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const showToast = useToast()
  const addProblem = useAddPracticeProblem(groupId, practiceId)

  const handleClose = () => {
    setSelectedProblems([])
    onClose()
  }

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (selectedProblems.length === 0) {
      showToast({
        body: '최소 하나의 문제를 선택해주세요.',
        type: 'error',
      })
      return
    }

    Promise.all(
      selectedProblems.map((p) =>
        addProblem.mutateAsync({
          provider: p.provider,
          externalProblemId: p.externalId,
          name: p.name,
          url: p.url,
          difficulty: p.difficulty ?? 'UNKNOWN',
        }),
      ),
    )
      .then(() => {
        showToast({ body: '문제가 성공적으로 등록되었습니다.' })
        handleClose()
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : '문제 추가에 실패했습니다.'
        showToast({ body: message, type: 'error' })
      })
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
          title="문제 추가하기"
          onOpenChange={(open: boolean) => {
            if (!open) handleClose()
          }}
        />
        <form onSubmit={handleSubmit} className="p-4">
          <FormLayout>
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
              label="추가하기"
              variant="primary"
              isLoading={addProblem.isPending}
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
