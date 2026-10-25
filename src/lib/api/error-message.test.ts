import { describe, expect, it } from 'vitest'
import { ApiError } from './client'
import { getReadableErrorMessage } from './error-message'

describe('getReadableErrorMessage', () => {
  it('일반 Error 인스턴스인 경우 error.message를 반환합니다', () => {
    const error = new Error('네트워크 연결이 끊어졌습니다.')
    expect(getReadableErrorMessage(error, '기본 에러')).toBe(
      '네트워크 연결이 끊어졌습니다.',
    )
  })

  it('ApiError에 fieldErrors가 포함된 경우 한국어 필드명과 사유를 포함하여 반환합니다', () => {
    const response = new Response(null, { status: 400 })
    const body = {
      code: 'INVALID_FIELD',
      message: '요청 값이 올바르지 않습니다.',
      fieldErrors: [
        { field: 'startDate', reason: 'INVALID_FORMAT' },
        { field: 'problems', reason: 'REQUIRED' },
      ],
    }
    const apiError = new ApiError(
      '요청 값이 올바르지 않습니다.',
      400,
      response,
      body,
    )

    const result = getReadableErrorMessage(apiError, '요청 실패')
    expect(result).toBe(
      '요청 값이 올바르지 않습니다. (시작 일시: 형식 오류, 문제: 필수 입력)',
    )
  })

  it('알 수 없는 필드명인 경우 원래 필드명을 유지합니다', () => {
    const response = new Response(null, { status: 400 })
    const body = {
      message: '검증 실패',
      fieldErrors: [{ field: 'customParam', reason: 'INVALID_VALUE' }],
    }
    const apiError = new ApiError('검증 실패', 400, response, body)

    const result = getReadableErrorMessage(apiError, '실패')
    expect(result).toBe('검증 실패 (customParam: 값 오류)')
  })

  it('fieldErrors가 없는 경우 기본 메시지를 반환합니다', () => {
    const response = new Response(null, { status: 500 })
    const apiError = new ApiError('서버 오류', 500, response, {})
    expect(getReadableErrorMessage(apiError, '기본 에러')).toBe('서버 오류')
  })

  it('서버의 길이 오류 사유를 한국어로 표시하고 알 수 없는 사유 코드는 노출하지 않습니다', () => {
    const body = {
      message: '요청 값이 올바르지 않습니다.',
      fieldErrors: [
        { field: 'name', reason: 'INVALID_LENGTH' },
        { field: 'difficulty', reason: 'NEW_REASON' },
      ],
    }
    const error = new ApiError(
      body.message,
      400,
      new Response(null, { status: 400 }),
      body,
    )

    expect(getReadableErrorMessage(error, '저장 실패')).toBe(
      '요청 값이 올바르지 않습니다. (문제 이름: 길이 오류, 난이도: 값 오류)',
    )
  })

  it.each([
    [403, '요청을 수행할 권한이 없습니다.'],
    [404, '문제를 찾을 수 없습니다.'],
    [409, '이미 등록된 문제입니다.'],
    [500, '서버 내부 오류가 발생했습니다.'],
  ] as const)(
    'HTTP %i의 서버 메시지를 그대로 유지합니다',
    (status, message) => {
      const error = new ApiError(
        message,
        status,
        new Response(null, { status }),
        { message },
      )

      expect(getReadableErrorMessage(error, '프론트 기본 안내')).toBe(message)
    },
  )

  it('fetch 실패의 기술 문자열 대신 작업별 재시도 안내를 반환합니다', () => {
    const fallback = '문제를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'

    expect(
      getReadableErrorMessage(new TypeError('Failed to fetch'), fallback),
    ).toBe(fallback)
  })

  it('error가 null이거나 falsy인 경우 fallbackMessage를 반환합니다', () => {
    expect(getReadableErrorMessage(null, '알 수 없는 오류')).toBe(
      '알 수 없는 오류',
    )
  })
})
