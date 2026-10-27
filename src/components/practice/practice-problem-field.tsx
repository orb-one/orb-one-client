import { Button } from '@astryxdesign/core/Button'
import { Field } from '@astryxdesign/core/Field'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useId } from 'react'

import type { Problem } from '@/lib/problems/problem-model'

interface PracticeProblemFieldProps {
  selectedProblem: Problem | null
  onOpenPicker: () => void
  isDisabled: boolean
}

export function PracticeProblemField({
  selectedProblem,
  onOpenPicker,
  isDisabled,
}: PracticeProblemFieldProps) {
  const id = useId()

  return (
    <Field
      label="첫 문제 (필수)"
      inputID={id}
      description="문제 목록에서 선택해 주세요."
      descriptionID={`${id}-description`}
      isDisabled={isDisabled}
    >
      <HStack width="100%" hAlign="between" vAlign="center" gap={3} wrap="wrap">
        {selectedProblem && (
          <VStack gap={1}>
            <Text type="label">{selectedProblem.name}</Text>
            <Text type="supporting" color="secondary">
              {selectedProblem.provider} {selectedProblem.externalId}
            </Text>
          </VStack>
        )}
        <Button
          id={id}
          label={selectedProblem ? '문제 변경' : '문제 선택'}
          aria-label={selectedProblem ? '문제 변경' : '문제 선택'}
          aria-describedby={`${id}-description`}
          variant="secondary"
          isDisabled={isDisabled}
          onClick={onOpenPicker}
        />
      </HStack>
    </Field>
  )
}
