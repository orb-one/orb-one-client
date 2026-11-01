import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import {
  DateRangeInput,
  type DateRange,
} from '@astryxdesign/core/DateRangeInput'
import { TimeInput, type ISOTimeString } from '@astryxdesign/core/TimeInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import type { KeyboardEvent } from 'react'

import type { PracticeScheduleDraft } from '@/lib/practice/practice-date'

interface PracticeScheduleFieldProps {
  value: PracticeScheduleDraft
  onChange: (value: PracticeScheduleDraft) => void
  isDisabled?: boolean
}

function commitTimeOnEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (
    event.key !== 'Enter' ||
    event.defaultPrevented ||
    event.nativeEvent.isComposing
  )
    return
  // Enter로 시각 입력만 확정하고, 이전 값으로 폼이 제출되지 않도록 합니다.
  event.preventDefault()
  event.currentTarget.blur()
}

export function PracticeScheduleField({
  value,
  onChange,
  isDisabled = false,
}: PracticeScheduleFieldProps) {
  const hasWideCalendar = useMediaQuery('(min-width: 640px)')
  const range: DateRange | null =
    value.startDate && value.endDate
      ? {
          start: value.startDate as DateRange['start'],
          end: value.endDate as DateRange['end'],
        }
      : null

  return (
    <VStack gap={4} width="100%">
      <CheckboxInput
        label="종일"
        value={value.isAllDay}
        onChange={(isAllDay) => {
          onChange({ ...value, isAllDay })
        }}
        isDisabled={isDisabled}
      />
      <DateRangeInput
        label="연습 기간"
        description={
          value.isAllDay
            ? '한국 시간 기준으로, 선택한 마지막 날짜까지 진행합니다.'
            : '한국 시간 기준입니다. 종료 시각부터 연습이 종료됩니다.'
        }
        placeholder="시작일과 종료일을 선택해 주세요"
        value={range}
        onChange={(next) => {
          onChange({
            ...value,
            startDate: next?.start ?? '',
            endDate: next?.end ?? '',
          })
        }}
        min="1970-01-01"
        max="2100-12-31"
        numberOfMonths={hasWideCalendar ? 2 : 1}
        isDisabled={isDisabled}
        width="100%"
      />
      {!value.isAllDay && (
        <>
          <TimeInput
            label="시작 시간"
            value={value.startTime as ISOTimeString}
            onChange={(startTime) => {
              onChange({ ...value, startTime: startTime ?? '' })
            }}
            hourFormat="24h"
            onKeyDown={commitTimeOnEnter}
            placeholder="09:30"
            isDisabled={isDisabled}
            width="100%"
          />
          <TimeInput
            label="종료 시간"
            value={value.endTime as ISOTimeString}
            onChange={(endTime) => {
              onChange({ ...value, endTime: endTime ?? '' })
            }}
            hourFormat="24h"
            onKeyDown={commitTimeOnEnter}
            placeholder="18:45"
            isDisabled={isDisabled}
            width="100%"
          />
        </>
      )}
    </VStack>
  )
}
