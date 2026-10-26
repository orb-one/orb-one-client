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

  it('UUID 선택 오류의 배열 필드를 문제로 표시합니다', () => {
    const body = {
      fieldErrors: [{ field: 'problemIds[0]', reason: 'REQUIRED' }],
    }
    const error = new ApiError(
      '검증 실패',
      400,
      new Response(null, { status: 400 }),
      body,
    )
    expect(getReadableErrorMessage(error, '실패')).toBe(
      '검증 실패 (문제: 필수 입력)',
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

  it('error가 null이거나 falsy인 경우 fallbackMessage를 반환합니다', () => {
    expect(getReadableErrorMessage(null, '알 수 없는 오류')).toBe(
      '알 수 없는 오류',
    )
  })
})
