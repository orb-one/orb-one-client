export interface ProviderOption {
  value: string
  label: string
}

export const PRACTICE_PROVIDER_OPTIONS: ProviderOption[] = [
  { value: 'JUNGOL', label: 'JUNGOL' },
  { value: 'SWEA', label: 'SWEA' },
  { value: 'PROGRAMMERS', label: 'PROGRAMMERS' },
  { value: 'LEETCODE', label: 'LEETCODE' },
  { value: 'CUSTOM', label: '기타 (직접 입력)' },
]
