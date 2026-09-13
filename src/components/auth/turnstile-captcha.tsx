import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { VStack } from '@astryxdesign/core/VStack'
import {
  Turnstile,
  type TurnstileInstance,
  type WidgetSize,
} from '@marsidev/react-turnstile'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { useI18n } from '@/lib/i18n/use-translations'

export type CaptchaAction = 'login' | 'register'

export interface TurnstileCaptchaHandle {
  reset: () => void
}

interface TurnstileCaptchaProps {
  action: CaptchaAction
  onTokenChange: (token: string | null) => void
}

type CaptchaFeedback =
  | 'configurationError'
  | 'loadError'
  | 'verificationError'
  | 'expired'

const TURNSTILE_MIN_FLEXIBLE_WIDTH = 300
const TURNSTILE_LOAD_TIMEOUT_MS = 10_000

export const TurnstileCaptcha = forwardRef<
  TurnstileCaptchaHandle,
  TurnstileCaptchaProps
>(function TurnstileCaptcha({ action, onTokenChange }, ref) {
  const { locale, t } = useI18n()
  const containerRef = useRef<HTMLElement>(null)
  const widgetRef = useRef<TurnstileInstance>(null)
  const [feedback, setFeedback] = useState<CaptchaFeedback | null>(null)
  const [isWidgetLoaded, setIsWidgetLoaded] = useState(false)
  const [widgetSize, setWidgetSize] = useState<WidgetSize>('flexible')
  const previousWidgetSizeRef = useRef(widgetSize)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()

  const clearToken = useCallback(() => {
    onTokenChange(null)
  }, [onTokenChange])

  const reset = useCallback(() => {
    clearToken()
    setFeedback(null)
    widgetRef.current?.reset()
  }, [clearToken])

  useImperativeHandle(ref, () => ({ reset }), [reset])

  useLayoutEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const updateWidgetSize = (width: number) => {
      if (width <= 0) {
        return
      }

      setWidgetSize(
        width < TURNSTILE_MIN_FLEXIBLE_WIDTH ? 'compact' : 'flexible',
      )
    }

    updateWidgetSize(container.clientWidth)

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]

      if (entry) {
        updateWidgetSize(entry.contentRect.width)
      }
    })

    observer.observe(container)
    return () => {
      observer.disconnect()
    }
  }, [])

  useLayoutEffect(() => {
    if (previousWidgetSizeRef.current === widgetSize) {
      return
    }

    previousWidgetSizeRef.current = widgetSize
    clearToken()
    setFeedback(null)
    setIsWidgetLoaded(false)
  }, [clearToken, widgetSize])

  useEffect(() => {
    if (!siteKey || isWidgetLoaded) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      clearToken()
      setFeedback('loadError')
    }, TURNSTILE_LOAD_TIMEOUT_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [clearToken, isWidgetLoaded, siteKey, widgetSize])

  if (!siteKey) {
    return (
      <Banner
        status="error"
        title={t.auth.captcha.configurationError}
        container="card"
      />
    )
  }

  return (
    <VStack
      ref={containerRef}
      gap={2}
      width="100%"
      hAlign="stretch"
      style={{ minWidth: 0 }}
    >
      <Turnstile
        key={widgetSize}
        ref={widgetRef}
        siteKey={siteKey}
        className="w-full"
        style={{ marginInline: 'auto' }}
        options={{
          action,
          appearance: 'always',
          execution: 'render',
          language: locale,
          refreshExpired: 'auto',
          refreshTimeout: 'auto',
          responseField: false,
          retry: 'auto',
          size: widgetSize,
          theme: 'auto',
        }}
        onWidgetLoad={() => {
          setIsWidgetLoaded(true)
          setFeedback((currentFeedback) =>
            currentFeedback === 'loadError' ? null : currentFeedback,
          )
        }}
        onSuccess={(token) => {
          setFeedback(null)
          onTokenChange(token)
        }}
        onExpire={() => {
          clearToken()
          setFeedback('expired')
        }}
        onError={() => {
          clearToken()
          setFeedback('verificationError')
        }}
        onTimeout={() => {
          clearToken()
          setFeedback('verificationError')
        }}
        onUnsupported={() => {
          clearToken()
          setFeedback('verificationError')
        }}
      />

      {feedback ? (
        <Banner
          status="error"
          title={t.auth.captcha[feedback]}
          container="card"
          endContent={
            feedback === 'loadError' ? (
              <Button
                type="button"
                label={t.auth.captcha.reload}
                variant="ghost"
                size="sm"
                onClick={() => {
                  window.location.reload()
                }}
              />
            ) : undefined
          }
        />
      ) : null}
    </VStack>
  )
})
