// 알고하자의 src/lib/solvedacTier.js에서 사용하던 BOJ 티어 색상이다.
// 숫자 변환이나 별 모양 구현 대신 색상 정보만 재사용한다.
// SWEA 출처: https://swexpertacademy.com/main/css/sw_common.css (.badgeC-D1~D8)
export const problemDifficultyColors = {
  'boj-unrated': { background: '#2D2D2D', text: '#FFFFFF' },
  'boj-bronze': { background: '#AC5600', text: '#FFFFFF' },
  'boj-silver': { background: '#435F7A', text: '#FFFFFF' },
  'boj-gold': { background: '#EC9A00', text: '#111111' },
  'boj-platinum': { background: '#27E2A4', text: '#111111' },
  'boj-diamond': { background: '#00B4FC', text: '#111111' },
  'boj-ruby': { background: '#FE0062', text: '#111111' },
  'swea-d1-d2': { background: '#FFE161', text: '#111111' },
  'swea-d3-d4': { background: '#6BCB77', text: '#111111' },
  'swea-d5-d6': { background: '#4D96FF', text: '#111111' },
  'swea-d7-d8': { background: '#FF6B6B', text: '#111111' },
} as const
