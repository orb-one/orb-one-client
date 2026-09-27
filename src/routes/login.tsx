import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Center } from '@astryxdesign/core/Center'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { LogIn, Mail, ShieldCheck } from 'lucide-react'
import { useRef, useState, type ComponentProps } from 'react'

import {
  TurnstileCaptcha,
  type TurnstileCaptchaHandle,
} from '@/components/auth/turnstile-captcha'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { loginAccount, type LoginRequest } from '@/lib/api/auth'
import { getAuthErrorMessage } from '@/lib/auth/auth-errors'
import { signInMockUser } from '@/lib/auth/mock-auth-session'
import {
  validateLoginForm,
  type LoginFormError,
} from '@/lib/auth/login-validation'
import { currentUserQueryKey } from '@/lib/auth/auth-queries'
import { useI18n } from '@/lib/i18n/use-translations'

interface LoginSearch {
  passwordChanged?: boolean
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch =>
    search.passwordChanged === true || search.passwordChanged === 'true'
      ? { passwordChanged: true }
      : {},
  component: LoginPage,
})

type FormSubmitHandler = NonNullable<ComponentProps<'form'>['onSubmit']>

export function LoginPage() {
  const { locale, t } = useI18n()
  const copy = t.auth.login
  const mypageCopy = t.mypage
  const { passwordChanged } = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const captchaRef = useRef<TurnstileCaptchaHandle>(null)
  const [formError, setFormError] = useState<LoginFormError | null>(null)
  const loginMutation = useMutation({
    mutationFn: loginAccount,
    onSuccess: handleLoginSuccess,
    onError: resetCaptcha,
  })

  const mutationError = loginMutation.isError
    ? getAuthErrorMessage(loginMutation.error, locale, copy.genericError)
    : null
  const formErrorMessage = formError ? copy[formError] : null
  const isEmailInvalid =
    formError === 'emailRequired' || formError === 'emailInvalid'
  const isPasswordInvalid = formError === 'passwordRequired'
  const isSubmitting = loginMutation.isPending
  const isCaptchaVerified = captchaToken !== null

  async function handleLoginSuccess(_response: unknown, request: LoginRequest) {
    // 실제 로그인 성공 후 /users/me mock이 현재 사용자를 반환하도록 dev-only 세션을 맞춘다.
    await signInMockUser(request)
    await queryClient.invalidateQueries({ queryKey: currentUserQueryKey })
    void navigate({ to: '/' })
  }

  function resetLoginFeedback() {
    // 이전 제출의 server/form 오류가 다음 제출 결과와 섞이지 않도록 초기화
    loginMutation.reset()
    setFormError(null)
  }

  function resetCaptcha() {
    setCaptchaToken(null)
    captchaRef.current?.reset()
  }

  function clearLoginFeedback(...errors: LoginFormError[]) {
    if (loginMutation.isError) {
      loginMutation.reset()
    }

    setFormError((currentError) =>
      currentError && errors.includes(currentError) ? null : currentError,
    )
  }

  function focusInvalidField(error: LoginFormError) {
    const inputRef = {
      emailRequired: emailInputRef,
      emailInvalid: emailInputRef,
      passwordRequired: passwordInputRef,
    }[error]

    inputRef.current?.focus()
  }

  const handleSubmit: FormSubmitHandler = (event) => {
    event.preventDefault()

    const form = event.currentTarget
    const validation = validateLoginForm(new FormData(form))

    resetLoginFeedback()

    if (!validation.ok) {
      setFormError(validation.error)
      requestAnimationFrame(() => {
        focusInvalidField(validation.error)
      })
      return
    }

    if (!captchaToken) {
      return
    }

    loginMutation.mutate({ ...validation.request, captchaToken })
  }

  return (
    <VStack width="100%">
      <Center
        width="100%"
        minHeight="calc(100svh - var(--appshell-header-height, 3rem))"
      >
        <VStack
          gap={5}
          width="100%"
          maxWidth={432}
          paddingInline={4}
          paddingBlock={10}
          hAlign="center"
        >
          <VStack gap={2} hAlign="center">
            <Icon icon={ShieldCheck} size="lg" color="accent" />
            <Text type="supporting" color="secondary">
              {copy.eyebrow}
            </Text>
            <PageBackLink href="/" label={copy.backToHome} />
            <Heading level={1} justify="center">
              {copy.title}
            </Heading>
            <Text type="body" color="secondary" justify="center">
              {copy.description}
            </Text>
          </VStack>

          <Card padding={8} width="100%">
            {/* 브라우저 기본 validation UI 대신 i18n 가능한 검증 결과만 노출 */}
            <form noValidate onSubmit={handleSubmit}>
              <VStack gap={4} hAlign="stretch">
                {passwordChanged ? (
                  <Banner
                    status="success"
                    title={mypageCopy.passwordChangeSuccess}
                  />
                ) : null}

                {mutationError ? (
                  <Banner
                    status="error"
                    title={mutationError}
                    container="card"
                  />
                ) : null}

                <FormLayout>
                  <TextInput
                    ref={emailInputRef}
                    label={copy.emailLabel}
                    htmlName="email"
                    type="email"
                    value={email}
                    onChange={(nextEmail) => {
                      setEmail(nextEmail)
                      clearLoginFeedback('emailRequired', 'emailInvalid')
                    }}
                    startIcon={Mail}
                    required
                    isDisabled={isSubmitting}
                    {...(isEmailInvalid && formErrorMessage
                      ? {
                          status: {
                            type: 'error' as const,
                            message: formErrorMessage,
                          },
                        }
                      : {})}
                    placeholder={copy.emailPlaceholder}
                    size="lg"
                    width="100%"
                    autoComplete="email"
                  />

                  <TextInput
                    ref={passwordInputRef}
                    label={copy.passwordLabel}
                    htmlName="password"
                    type="password"
                    value={password}
                    onChange={(nextPassword) => {
                      setPassword(nextPassword)
                      clearLoginFeedback('passwordRequired')
                    }}
                    required
                    isDisabled={isSubmitting}
                    {...(isPasswordInvalid && formErrorMessage
                      ? {
                          status: {
                            type: 'error' as const,
                            message: formErrorMessage,
                          },
                        }
                      : {})}
                    placeholder={copy.passwordPlaceholder}
                    size="lg"
                    width="100%"
                    autoComplete="current-password"
                  />
                </FormLayout>

                <TurnstileCaptcha
                  ref={captchaRef}
                  action="login"
                  onTokenChange={setCaptchaToken}
                />

                {loginMutation.isSuccess ? (
                  <Banner status="success" title={copy.successMessage} />
                ) : null}

                <Button
                  label={isSubmitting ? copy.submitting : copy.submit}
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting || !isCaptchaVerified}
                  icon={<Icon icon={LogIn} color="inherit" />}
                  className="w-full"
                />

                <Text type="supporting" color="secondary" justify="center">
                  {copy.registerPrompt}{' '}
                  <Link href="/register">{copy.registerLink}</Link>
                </Text>
              </VStack>
            </form>
          </Card>
        </VStack>
      </Center>
    </VStack>
  )
}
