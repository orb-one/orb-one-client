import { describe, expect, it } from 'vitest'
import {
  emptyPracticeSchedule,
  formatPracticeDateTime,
  formatPracticePeriod,
  isValidDateString,
  parsePracticeInstant,
  restorePracticeSchedule,
  validatePracticeSchedule,
} from './practice-date'

const now = Date.parse('2026-01-01T00:00:00Z')
const allDay = (startDate = '2026-10-12', endDate = startDate) => ({
  ...emptyPracticeSchedule(),
  startDate,
  endDate,
})
const timed = () => ({
  ...allDay(),
  isAllDay: false,
  startTime: '09:30',
  endTime: '18:45',
})

describe('practice schedule', () => {
  it.each([
    ['2026-10-12', '2026-10-13'],
    ['2026-10-31', '2026-11-01'],
    ['2026-12-31', '2027-01-01'],
    ['2028-02-29', '2028-03-01'],
    ['2100-12-31', '2101-01-01'],
  ])('converts all-day %s into the exclusive next midnight %s', (day, next) => {
    expect(validatePracticeSchedule(allDay(day), now)).toEqual({
      success: true,
      startDate: `${day}T00:00:00+09:00`,
      endDate: `${next}T00:00:00+09:00`,
    })
  })

  it('sends the selected minutes with seconds fixed at zero and an explicit offset', () => {
    expect(validatePracticeSchedule(timed(), now)).toEqual({
      success: true,
      startDate: '2026-10-12T09:30:00+09:00',
      endDate: '2026-10-12T18:45:00+09:00',
    })
  })

  it.each([
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '20261012',
    '1969-12-31',
    '2101-01-01',
  ])('rejects invalid input dates: %s', (date) => {
    expect(isValidDateString(date)).toBe(false)
    expect(validatePracticeSchedule(allDay(date), now).success).toBe(false)
  })

  it.each([
    { startTime: '18:45' },
    { startTime: '19:00' },
    { startDate: '2026-10-13' },
    { startTime: '' },
    { endTime: '24:00' },
    { endTime: '18:45:30' },
  ])('rejects equal/reversed or incomplete timed ranges: %j', (changes) => {
    expect(
      validatePracticeSchedule({ ...timed(), ...changes }, now).success,
    ).toBe(false)
  })

  it('rejects reversed all-day ranges and missing dates', () => {
    expect(
      validatePracticeSchedule(allDay('2026-10-13', '2026-10-12'), now).success,
    ).toBe(false)
    expect(validatePracticeSchedule(emptyPracticeSchedule(), now).success).toBe(
      false,
    )
  })

  it('requires the end to be strictly in the future', () => {
    const end = Date.parse('2026-10-12T09:45:00Z')
    expect(validatePracticeSchedule(timed(), end - 1).success).toBe(true)
    expect(validatePracticeSchedule(timed(), end).success).toBe(false)
    expect(validatePracticeSchedule(timed(), end + 1).success).toBe(false)
  })

  it.each([
    [
      '2026-10-11T15:00:00Z',
      '2026-10-12T15:00:00Z',
      true,
      '2026-10-12',
      '2026-10-12',
      '00:00',
      '00:00',
    ],
    [
      '2026-12-31T15:00:00Z',
      '2027-01-02T15:00:00Z',
      true,
      '2027-01-01',
      '2027-01-02',
      '00:00',
      '00:00',
    ],
    [
      '2026-10-12T00:30:00Z',
      '2026-10-12T09:45:00Z',
      false,
      '2026-10-12',
      '2026-10-12',
      '09:30',
      '18:45',
    ],
    [
      '2026-10-12T09:30:00+09:00',
      '2026-10-12T18:45:00+09:00',
      false,
      '2026-10-12',
      '2026-10-12',
      '09:30',
      '18:45',
    ],
    [
      '2100-12-30T15:00:00Z',
      '2100-12-31T15:00:00Z',
      true,
      '2100-12-31',
      '2100-12-31',
      '00:00',
      '00:00',
    ],
  ])(
    'restores and round-trips %s ~ %s',
    (start, end, isAllDay, startDate, endDate, startTime, endTime) => {
      const draft = restorePracticeSchedule(start, end)
      expect(draft).toMatchObject({
        isAllDay,
        startDate,
        endDate,
        startTime,
        endTime,
      })
      if (!draft) throw new Error('Missing restored draft')
      expect(validatePracticeSchedule(draft, now)).toEqual({
        success: true,
        startDate: start,
        endDate: end,
      })
    },
  )

  it('preserves existing seconds on an unchanged boundary and zeros manually changed minutes', () => {
    const draft = restorePracticeSchedule(
      '2026-10-12T00:30:12.123Z',
      '2026-10-12T09:45:59Z',
    )
    if (!draft) throw new Error('Missing restored draft')
    expect(
      validatePracticeSchedule({ ...draft, startTime: '10:00' }, now),
    ).toEqual({
      success: true,
      startDate: '2026-10-12T10:00:00+09:00',
      endDate: '2026-10-12T09:45:59Z',
    })
  })

  it.each([
    '2026-10-12T09:30:00',
    '2026-10-12 09:30:00',
    '2026-02-30T00:00:00Z',
    '2026-10-12T24:00:00Z',
    '',
    'invalid',
  ])(
    'does not guess a timezone or silently normalize invalid responses: %s',
    (value) => {
      expect(parsePracticeInstant(value)).toBeNaN()
      expect(formatPracticeDateTime(value)).toBe('시각 확인 불가')
      expect(restorePracticeSchedule(value, '2026-10-13T00:00:00Z')).toBeNull()
    },
  )

  it('formats UTC values in Seoul, including the next calendar day', () => {
    expect(formatPracticeDateTime('2026-10-11T15:00:00Z')).toBe(
      '2026-10-12 00:00',
    )
    expect(formatPracticeDateTime('2026-10-12T00:30:00Z')).toBe(
      '2026-10-12 09:30',
    )
    expect(formatPracticeDateTime('2026-10-12T09:30:00+09:00')).toBe(
      '2026-10-12 09:30',
    )
  })

  it('describes all-day dates inclusively and timed ends exclusively', () => {
    expect(
      formatPracticePeriod('2026-10-11T15:00:00Z', '2026-10-12T15:00:00Z'),
    ).toBe('2026-10-12 · 종일 (한국 시간)')
    expect(
      formatPracticePeriod('2026-10-12T00:30:00Z', '2026-10-12T09:45:00Z'),
    ).toContain('09:30 ~ 2026-10-12 18:45')
  })
})
