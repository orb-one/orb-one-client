import { HStack } from '@astryxdesign/core/HStack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Text } from '@astryxdesign/core/Text'

import { useTranslations } from '@/lib/i18n/use-translations'
import type { SolutionSummary } from '@/lib/solutions/solution-model'
import {
  getSolutionState,
  type SolutionState,
} from '@/lib/solutions/solution-state'

const statusVariants = {
  draft: 'warning',
  solved: 'success',
  unsolved: 'neutral',
  unknown: 'neutral',
} as const satisfies Record<SolutionState, 'success' | 'warning' | 'neutral'>

export function SolutionStatus({ solution }: SolutionStatusProps) {
  const copy = useTranslations().solutions.status
  const state = getSolutionState(solution)
  const label = copy[state]

  return (
    <HStack gap={1.5} vAlign="center">
      <StatusDot variant={statusVariants[state]} label={label} />
      <Text type="supporting" color="secondary">
        {label}
      </Text>
    </HStack>
  )
}

interface SolutionStatusProps {
  solution: Pick<SolutionSummary, 'isDraft' | 'isSolved'>
}
