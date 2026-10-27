import { useToast } from '@astryxdesign/core/Toast'

import { ProblemMultiPickerDialog } from '@/components/problems/problem-multi-picker-dialog'
import { useAddPracticeProblem } from '@/lib/api/practice'
import { getProblemReferenceErrorMessage } from '@/lib/problems/problem-reference-errors'

interface AddPracticeProblemModalProps {
  groupId: string
  existingProblemIds?: readonly string[]
  practiceId: string
  isOpen: boolean
  onClose: () => void
}

export function AddPracticeProblemModal(props: AddPracticeProblemModalProps) {
  if (!props.isOpen) return null

  return <AddPracticeProblemModalContent key={props.practiceId} {...props} />
}

function AddPracticeProblemModalContent({
  groupId,
  existingProblemIds,
  practiceId,
  onClose,
}: AddPracticeProblemModalProps) {
  const showToast = useToast()
  const addProblem = useAddPracticeProblem(groupId, practiceId)
  const errorMessage = addProblem.isError
    ? getProblemReferenceErrorMessage(
        addProblem.error,
        '문제를 추가하지 못했습니다.',
      )
    : null

  function handleSubmit(problemIds: string[]) {
    if (addProblem.isPending || problemIds.length === 0) return

    addProblem.mutate(
      { problemIds },
      {
        onSuccess: () => {
          showToast({ body: '문제를 추가했습니다.' })
          onClose()
        },
      },
    )
  }

  return (
    <ProblemMultiPickerDialog
      existingProblemIds={existingProblemIds ?? []}
      title="문제 추가하기"
      description="연습에 추가할 문제를 선택해 주세요. 여러 문제를 선택할 수 있습니다."
      isSubmitting={addProblem.isPending}
      errorMessage={errorMessage}
      onSelectionChange={addProblem.reset}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  )
}
