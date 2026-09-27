import { act, cleanup, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import {
  TurnstileCaptcha,
  type TurnstileCaptchaHandle,
} from '@/components/auth/turnstile-captcha'
import { useAppStore } from '@/stores/use-app-store'

interface TurnstileCallbacks {
  onError?: () => void
  onExpire?: () => void
  onSuccess?: (token: string) => void
  onWidgetLoad?: () => void
}

const { resizeObserverMock, turnstileMock } = vi.hoisted(() => ({
  resizeObserverMock: {
    callback: null as ResizeObserverCallback | null,
    disconnect: vi.fn(),
    observe: vi.fn(),
  },
  turnstileMock: {
    props: null as
      | (TurnstileCallbacks & {
          options?: Record<string, unknown>
          scriptOptions?: Record<string, unknown>
          siteKey?: string
        })
      | null,
    reset: vi.fn(),
  },
}))

vi.mock('@marsidev/react-turnstile', async () => {
  const { createElement, forwardRef, useImperativeHandle } =
    await import('react')

  return {
    Turnstile: forwardRef<
      { reset: () => void },
      TurnstileCallbacks & {
        options?: Record<string, unknown>
        siteKey?: string
      }
    >(function MockTurnstile(props, ref) {
      turnstileMock.props = props
      useImperativeHandle(ref, () => ({ reset: turnstileMock.reset }))

      return createElement('span', { 'data-testid': 'turnstile-widget' })
    }),
  }
})

const originalResizeObserver = globalThis.ResizeObserver

beforeEach(() => {
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
  globalThis.ResizeObserver = class ResizeObserverMock implements ResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      resizeObserverMock.callback = callback
    }

    observe() {
      resizeObserverMock.observe()
    }

    unobserve() {
      return undefined
    }

    disconnect() {
      resizeObserverMock.disconnect()
    }
  }
  useAppStore.getState().setLocale('ko')
})

afterEach(() => {
  cleanup()
  turnstileMock.props = null
  turnstileMock.reset.mockReset()
  resizeObserverMock.callback = null
  resizeObserverMock.disconnect.mockReset()
  resizeObserverMock.observe.mockReset()
  vi.useRealTimers()
  vi.unstubAllEnvs()
  globalThis.ResizeObserver = originalResizeObserver
})

it('configures a login challenge and publishes successful tokens', () => {
  const onTokenChange = vi.fn()
  render(<TurnstileCaptcha action="login" onTokenChange={onTokenChange} />)

  expect(turnstileMock.props?.siteKey).toBe('test-site-key')
  expect(turnstileMock.props?.options).toMatchObject({
    action: 'login',
    language: 'ko',
    responseField: false,
    size: 'flexible',
  })
  expect(turnstileMock.props?.scriptOptions).toBeUndefined()

  act(() => turnstileMock.props?.onSuccess?.('turnstile-token'))
  expect(onTokenChange).toHaveBeenLastCalledWith('turnstile-token')
})

it('uses a compact challenge when the available width is below 300px', () => {
  const onTokenChange = vi.fn()
  render(<TurnstileCaptcha action="login" onTokenChange={onTokenChange} />)

  act(() => turnstileMock.props?.onSuccess?.('turnstile-token'))
  act(() => {
    resizeObserverMock.callback?.(
      [
        {
          contentRect: { width: 299 },
        } as ResizeObserverEntry,
      ],
      {} as ResizeObserver,
    )
  })

  expect(turnstileMock.props?.options).toMatchObject({ size: 'compact' })
  expect(onTokenChange).toHaveBeenLastCalledWith(null)
})

it('shows a reload action when the widget does not load in time', () => {
  vi.useFakeTimers()
  render(<TurnstileCaptcha action="login" onTokenChange={vi.fn()} />)

  act(() => {
    vi.advanceTimersByTime(10_000)
  })

  expect(screen.getByRole('alert')).toHaveTextContent(
    '보안 인증을 불러오지 못했습니다. 페이지를 새로고침해 주세요.',
  )
  expect(screen.getByRole('button', { name: '새로고침' })).toBeVisible()
})

it('cancels the loading timeout after the widget loads', () => {
  vi.useFakeTimers()
  render(<TurnstileCaptcha action="login" onTokenChange={vi.fn()} />)

  act(() => turnstileMock.props?.onWidgetLoad?.())
  act(() => {
    vi.advanceTimersByTime(10_000)
  })

  expect(screen.queryByText(/페이지를 새로고침/)).not.toBeInTheDocument()
})

it('clears expired tokens and shows localized feedback', () => {
  const onTokenChange = vi.fn()
  render(<TurnstileCaptcha action="register" onTokenChange={onTokenChange} />)

  act(() => turnstileMock.props?.onExpire?.())

  expect(onTokenChange).toHaveBeenLastCalledWith(null)
  expect(screen.getByRole('alert')).toHaveTextContent(
    '보안 인증 시간이 만료되었습니다. 다시 인증해 주세요.',
  )
})

it('clears failed challenges and exposes an imperative reset', () => {
  const onTokenChange = vi.fn()
  const ref = createRef<TurnstileCaptchaHandle>()
  render(
    <TurnstileCaptcha ref={ref} action="login" onTokenChange={onTokenChange} />,
  )

  act(() => turnstileMock.props?.onError?.())
  expect(onTokenChange).toHaveBeenLastCalledWith(null)
  expect(screen.getByRole('alert')).toHaveTextContent(
    '보안 인증을 완료하지 못했습니다. 다시 시도해 주세요.',
  )

  act(() => ref.current?.reset())
  expect(turnstileMock.reset).toHaveBeenCalledOnce()
})

it('fails closed when the Turnstile sitekey is missing', () => {
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')

  render(<TurnstileCaptcha action="login" onTokenChange={vi.fn()} />)

  expect(screen.queryByTestId('turnstile-widget')).not.toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent(
    '보안 인증 설정을 불러오지 못했습니다.',
  )
})
