import { Button } from '@astryxdesign/core/Button'
import { Field } from '@astryxdesign/core/Field'
import { List, ListItem } from '@astryxdesign/core/List'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useId, type RefObject } from 'react'

import type { Problem } from '@/lib/problems/problem-model'

interface PracticeProblemFieldProps {
  selectedProblems: readonly Problem[]
  onOpenPicker: () => void
  onRemoveProblem: (problemId: string) => void
  pickerButtonRef: RefObject<HTMLButtonElement | null>
  isDisabled: boolean
}

export function PracticeProblemField({
  selectedProblems,
  onOpenPicker,
  onRemoveProblem,
  pickerButtonRef,
  isDisabled,
}: PracticeProblemFieldProps) {
  const id = useId()

  return (
    <Field
      label="문제"
      isRequired
      inputID={id}
      description="연습에 포함할 문제를 하나 이상 선택해 주세요."
      descriptionID={`${id}-description`}
      isDisabled={isDisabled}
    >
      <VStack width="100%" gap={3}>
        {selectedProblems.length > 0 && (
          <>
            <Text type="supporting" color="secondary">
              {`${String(selectedProblems.length)}개 선택됨`}
            </Text>
            <List density="balanced" hasDividers aria-label="선택한 문제">
              {selectedProblems.map((problem) => (
                <ListItem
                  key={problem.id}
                  label={problem.name}
                  description={`${problem.provider} ${problem.externalId}`}
                  endContent={
                    <Button
                      label="선택 해제"
                      aria-label={`${problem.name} 선택 해제`}
                      size="sm"
                      variant="secondary"
                      isDisabled={isDisabled}
                      onClick={() => {
                        onRemoveProblem(problem.id)
                        pickerButtonRef.current?.focus()
                      }}
                    />
                  }
                />
              ))}
            </List>
          </>
        )}
        <Button
          ref={pickerButtonRef}
          id={id}
          label={selectedProblems.length > 0 ? '문제 변경' : '문제 선택'}
          aria-label={selectedProblems.length > 0 ? '문제 변경' : '문제 선택'}
          aria-describedby={`${id}-description`}
          variant="secondary"
          isDisabled={isDisabled}
          onClick={onOpenPicker}
        />
      </VStack>
    </Field>
  )
}
