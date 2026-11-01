import { Token } from '@astryxdesign/core/Token'

import { useTranslations } from '@/lib/i18n/use-translations'
import { getProblemDifficultyPresentation } from '@/lib/problems/problem-difficulty-presentation'

interface ProblemDifficultyChipProps {
  provider: string
  difficulty: string | null
  label?: string
}

export function ProblemDifficultyChip({
  provider,
  difficulty,
  label,
}: ProblemDifficultyChipProps) {
  const copy = useTranslations().adminProblems
  const presentation = getProblemDifficultyPresentation(
    provider,
    difficulty ?? '',
  )

  return (
    <Token
      size="sm"
      className="w-fit"
      label={label ?? (difficulty ? presentation.label : copy.noDifficulty)}
      color={presentation.color}
    />
  )
}
