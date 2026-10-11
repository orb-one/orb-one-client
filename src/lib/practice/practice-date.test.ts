import { describe, expect, it } from 'vitest'
import {
  extractDateOnly,
  formatDateInput,
  isValidDateString,
  validateAndFormatPracticeDates,
} from './practice-date'

describe('practice-date', () => {
  describe('formatDateInput', () => {
    it('숫자 입력을 YYYY-MM-DD 형식으로 포맷팅합니다', () => {
      expect(formatDateInput('20261011')).toBe('2026-10-11')
      expect(formatDateInput('202610')).toBe('2026-10')
      expect(formatDateInput('2026')).toBe('2026')
      expect(formatDateInput('2026-10-11')).toBe('2026-10-11')
      expect(formatDateInput('abc20261011def')).toBe('2026-10-11')
    })
  })

  describe('isValidDateString', () => {
    it('유효한 날짜를 올바르게 판단합니다', () => {
      expect(isValidDateString('2026-10-11')).toBe(true)
      expect(isValidDateString('2024-02-29')).toBe(true) // 윤년
      expect(isValidDateString('2023-02-28')).toBe(true)
    })

    it('존재하지 않는 날짜나 잘못된 형식을 걸러냅니다', () => {
      expect(isValidDateString('2023-02-29')).toBe(false) // 평년 2월 29일
      expect(isValidDateString('2026-13-01')).toBe(false) // 13월
      expect(isValidDateString('2026-04-31')).toBe(false) // 4월 31일
      expect(isValidDateString('20261011')).toBe(false)
      expect(isValidDateString('invalid')).toBe(false)
    })
  })

  describe('validateAndFormatPracticeDates', () => {
    it('유효한 시작일과 종료일을 00:00:00 및 23:59:59로 변환합니다', () => {
      const result = validateAndFormatPracticeDates('2026-10-01', '2026-10-07')
      expect(result).toEqual({
        success: true,
        startDate: '2026-10-01T00:00:00',
        endDate: '2026-10-07T23:59:59',
      })
    })

    it('종료일이 시작일보다 앞서면 에러를 반환합니다', () => {
      const result = validateAndFormatPracticeDates('2026-10-07', '2026-10-01')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain(
          '종료 일시는 시작 일시보다 빠를 수 없습니다',
        )
      }
    })

    it('날짜가 유효하지 않으면 에러를 반환합니다', () => {
      const result = validateAndFormatPracticeDates('2026-02-30', '2026-10-01')
      expect(result.success).toBe(false)
    })
  })

  describe('extractDateOnly', () => {
    it('ISO 문자열에서 날짜만 추출합니다', () => {
      expect(extractDateOnly('2026-10-11T00:00:00')).toBe('2026-10-11')
      expect(extractDateOnly('2026-10-11 14:30:00')).toBe('2026-10-11')
      expect(extractDateOnly('')).toBe('')
    })
  })
})
