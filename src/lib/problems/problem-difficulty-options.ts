import type { ProblemProvider } from '@/lib/problems/problem-model'

interface DifficultyOption {
  value: string
  label: string
}

interface DifficultySection {
  type: 'section'
  title: string
  options: DifficultyOption[]
}

const tierLevels = [
  { value: 5, label: 'V' },
  { value: 4, label: 'IV' },
  { value: 3, label: 'III' },
  { value: 2, label: 'II' },
  { value: 1, label: 'I' },
]

function tierSection(tier: string): DifficultySection {
  return {
    type: 'section',
    title: tier,
    options: tierLevels.map((level) => ({
      value: `${tier.toUpperCase()}_${String(level.value)}`,
      label: `${tier} ${level.label}`,
    })),
  }
}

const tierSections = [
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'Ruby',
].map(tierSection)

const sproutSection = tierSection('Sprout')
sproutSection.options.push({ value: 'SPROUT_1_PLUS', label: 'Sprout I+' })

// 화면 표기와 API 문자열을 분리하고, 제공자 사이의 난이도를 환산하지 않는다.
// BOJ: https://help.solved.ac/ko/problem/level
// 정올은 확인된 일반 티어를 제공하며, 목록 밖의 기존 값은 폼에서 보존한다.
export const problemDifficultyOptions: Record<
  ProblemProvider,
  (DifficultyOption | DifficultySection)[]
> = {
  BOJ: [
    { value: 'UNRATED', label: 'Unrated' },
    { value: 'NOT_RATABLE', label: 'Not ratable' },
    sproutSection,
    ...tierSections,
  ],
  JUNGOL: [{ value: 'UNRATED', label: 'Unrated' }, ...tierSections],
  SWEA: Array.from({ length: 8 }, (_, index) => ({
    value: `D${String(index + 1)}`,
    label: `D${String(index + 1)}`,
  })),
  PROGRAMMERS: Array.from({ length: 6 }, (_, level) => ({
    value: `LEVEL_${String(level)}`,
    label: `Lv. ${String(level)}`,
  })),
  LEETCODE: [
    { value: 'EASY', label: 'Easy' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HARD', label: 'Hard' },
  ],
}
