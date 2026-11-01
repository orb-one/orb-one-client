const DAY_MS = 86_400_000
const OFFSET = '+09:00'
const seoulParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export interface PracticeScheduleDraft {
  isAllDay: boolean
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  original?: {
    startDate: string
    endDate: string
    startKey: string
    endKey: string
  }
}

export function emptyPracticeSchedule(): PracticeScheduleDraft {
  return {
    isAllDay: true,
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '18:00',
  }
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

export function isValidDateString(value: string): boolean {
  const year = Number(value.slice(0, 4))
  return year >= 1970 && year <= 2100 && isCalendarDate(value)
}

// 시간대가 없는 구응답은 브라우저 시간대로 추측하지 않습니다.
export function parsePracticeInstant(value: string): number {
  const match =
    /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d{1,9})?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(
      value,
    )
  if (!match || !isCalendarDate(match[1] ?? '')) return Number.NaN
  return Date.parse(value)
}

function getSeoulDateTime(instant: number) {
  const parts = seoulParts.formatToParts(instant)
  const get = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === name)?.value ?? ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

function shiftDate(value: string, days: number): string {
  return new Date(Date.parse(`${value}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

function boundaryKey(draft: PracticeScheduleDraft, boundary: 'start' | 'end') {
  return `${draft.isAllDay ? 'all-day' : 'timed'}|${draft[`${boundary}Date`]}|${draft.isAllDay ? '' : draft[`${boundary}Time`]}`
}

export function restorePracticeSchedule(
  startDate: string,
  endDate: string,
): PracticeScheduleDraft | null {
  const start = parsePracticeInstant(startDate)
  const end = parsePracticeInstant(endDate)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end)
    return null
  const from = getSeoulDateTime(start)
  const to = getSeoulDateTime(end)
  // API에 종일 구분 필드가 없으므로 한국 자정 경계의 기간을 종일로 복원합니다.
  const isAllDay =
    from.time === '00:00' &&
    to.time === '00:00' &&
    start % 60_000 === 0 &&
    end % 60_000 === 0
  const draft: PracticeScheduleDraft = {
    isAllDay,
    startDate: from.date,
    endDate: isAllDay ? shiftDate(to.date, -1) : to.date,
    startTime: from.time,
    endTime: to.time,
  }
  draft.original = {
    startDate,
    endDate,
    startKey: boundaryKey(draft, 'start'),
    endKey: boundaryKey(draft, 'end'),
  }
  return draft
}

export type PracticeDateValidationResult =
  | { success: true; startDate: string; endDate: string }
  | { success: false; error: string }

export function validatePracticeSchedule(
  draft: PracticeScheduleDraft,
  now = Date.now(),
): PracticeDateValidationResult {
  if (!draft.startDate || !draft.endDate)
    return { success: false, error: '연습 기간을 선택해 주세요.' }
  if (
    !isValidDateString(draft.startDate) ||
    !isValidDateString(draft.endDate)
  ) {
    return {
      success: false,
      error: '시작일과 종료일을 올바른 날짜로 입력해 주세요.',
    }
  }
  if (
    !draft.isAllDay &&
    ![draft.startTime, draft.endTime].every((time) =>
      /^([01]\d|2[0-3]):[0-5]\d$/.test(time),
    )
  ) {
    return {
      success: false,
      error: '시작 시간과 종료 시간을 모두 입력해 주세요.',
    }
  }
  let startDate = `${draft.startDate}T${draft.isAllDay ? '00:00' : draft.startTime}:00${OFFSET}`
  let endDate = `${draft.isAllDay ? shiftDate(draft.endDate, 1) : draft.endDate}T${draft.isAllDay ? '00:00' : draft.endTime}:00${OFFSET}`
  // 분 단위 입력으로 기존 초·소수초가 의도치 않게 바뀌지 않도록 보존합니다.
  if (draft.original?.startKey === boundaryKey(draft, 'start'))
    startDate = draft.original.startDate
  if (draft.original?.endKey === boundaryKey(draft, 'end'))
    endDate = draft.original.endDate
  if (
    draft.startDate > draft.endDate ||
    Date.parse(startDate) >= Date.parse(endDate)
  ) {
    return {
      success: false,
      error: '종료 일시는 시작 일시보다 이후여야 합니다.',
    }
  }
  if (Date.parse(endDate) <= now)
    return {
      success: false,
      error: '종료 일시는 현재 시각보다 이후여야 합니다.',
    }
  return { success: true, startDate, endDate }
}

export function formatPracticeDateTime(value: string): string {
  const instant = parsePracticeInstant(value)
  if (!Number.isFinite(instant)) return '시각 확인 불가'
  const { date, time } = getSeoulDateTime(instant)
  return `${date} ${time}`
}

export function formatPracticePeriod(
  startDate: string,
  endDate: string,
): string {
  const schedule = restorePracticeSchedule(startDate, endDate)
  if (!schedule) return '연습 기간을 확인할 수 없습니다.'
  if (schedule.isAllDay) {
    const dates =
      schedule.startDate === schedule.endDate
        ? schedule.startDate
        : `${schedule.startDate} ~ ${schedule.endDate}`
    return `${dates} · 종일 (한국 시간)`
  }
  return `${formatPracticeDateTime(startDate)} ~ ${formatPracticeDateTime(endDate)} (한국 시간, 종료 시각 미포함)`
}
