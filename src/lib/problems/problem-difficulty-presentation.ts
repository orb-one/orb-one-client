import type { problemDifficultyColors } from './problem-difficulty-colors'
import { problemDifficultyOptions } from './problem-difficulty-options'
import { problemProviders } from './problem-model'

type DifficultyColor = keyof typeof problemDifficultyColors | 'gray'

const bojTierColors: Record<string, DifficultyColor> = {
  BRONZE: 'boj-bronze',
  SILVER: 'boj-silver',
  GOLD: 'boj-gold',
  PLATINUM: 'boj-platinum',
  DIAMOND: 'boj-diamond',
  RUBY: 'boj-ruby',
  UNRATED: 'boj-unrated',
  NOT: 'boj-unrated',
}

const sweaColors: Record<string, DifficultyColor> = {
  D1: 'swea-d1-d2',
  D2: 'swea-d1-d2',
  D3: 'swea-d3-d4',
  D4: 'swea-d3-d4',
  D5: 'swea-d5-d6',
  D6: 'swea-d5-d6',
  D7: 'swea-d7-d8',
  D8: 'swea-d7-d8',
}

export function getProblemDifficultyPresentation(
  provider: string,
  difficulty: string,
): { label: string; color: DifficultyColor } {
  const source = problemProviders.find((item) => item === provider)
  const normalized = difficulty.trim().toUpperCase()
  const known = source
    ? problemDifficultyOptions[source]
        .flatMap((option) => ('value' in option ? [option] : option.options))
        .find((option) => option.value === normalized)
    : undefined

  // 알 수 없는 값이나 제공자는 추측해 색칠하지 않는다.
  if (!known) return { label: difficulty, color: 'gray' }

  const color =
    source === 'BOJ'
      ? (bojTierColors[normalized.split('_')[0] ?? ''] ?? 'gray')
      : source === 'SWEA'
        ? (sweaColors[normalized] ?? 'gray')
        : 'gray'

  return { label: known.label, color }
}
