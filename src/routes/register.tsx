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
import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserPlus,
  UserRound,
} from 'lucide-react'
import { useRef, useState, type ComponentProps } from 'react'

import { registerAccount, type RegisterRequest } from '@/lib/api/auth'
import { getAuthErrorMessage } from '@/lib/auth/auth-errors'
import { rememberMockRegisteredUser } from '@/lib/auth/mock-auth-session'
import {
  REGISTER_PASSWORD_MIN_LENGTH,
  validateRegisterForm,
  type RegisterFormError,
} from '@/lib/auth/register-validation'
import { useI18n } from '@/lib/i18n/use-translations'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

type FormSubmitHandler = NonNullable<ComponentProps<'form'>['onSubmit']>

export function RegisterPage() {
  const { locale, t } = useI18n()
  const copy = t.auth.register
  const navigate = Route.useNavigate()
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const emailInputRef = useRef<HTMLInputElement>(null)
  const nicknameInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const passwordConfirmInputRef = useRef<HTMLInputElement>(null)
  const [formError, setFormError] = useState<RegisterFormError | null>(null)
  const registerMutation = useMutation({
    mutationFn: registerAccount,
    onSuccess: handleRegisterSuccess,
  })

  const mutationError = registerMutation.isError
    ? getAuthErrorMessage(registerMutation.error, locale, copy.genericError)
    : null
  const formErrorMessage = formError ? copy[formError] : null
  const isEmailInvalid =
    formError === 'emailRequired' || formError === 'emailInvalid'
  const isPasswordMismatch = formError === 'passwordMismatch'
  const isNicknameInvalid = formError === 'nicknameRequired'
  const isPasswordInvalid =
    formError === 'passwordRequired' || formError === 'passwordTooShort'
  const isSubmitting = registerMutation.isPending

  async function handleRegisterSuccess(
    _response: unknown,
    request: RegisterRequest,
  ) {
    // 실제 회원가입 성공 후 /users/me mock이 같은 nickname을 돌려주도록 표시 정보만 기억한다.
    await rememberMockRegisteredUser(request)
    void navigate({ to: '/login' })
  }

  function resetRegisterFeedback() {
    // 이전 제출의 server/form 오류가 다음 제출 결과와 섞이지 않도록 초기화
    registerMutation.reset()
    setFormError(null)
  }

  function clearRegisterFeedback(...errors: RegisterFormError[]) {
    if (registerMutation.isError) {
      registerMutation.reset()
    }

    setFormError((currentError) =>
      currentError && errors.includes(currentError) ? null : currentError,
    )
  }

  function focusInvalidField(error: RegisterFormError) {
    const inputRef = {
      emailRequired: emailInputRef,
      emailInvalid: emailInputRef,
      nicknameRequired: nicknameInputRef,
      passwordRequired: passwordInputRef,
      passwordTooShort: passwordInputRef,
      passwordMismatch: passwordConfirmInputRef,
    }[error]

    inputRef.current?.focus()
  }

  const handleSubmit: FormSubmitHandler = (event) => {
    event.preventDefault()

    const form = event.currentTarget
    const validation = validateRegisterForm(new FormData(form))

    resetRegisterFeedback()

    if (!validation.ok) {
      setFormError(validation.error)
      requestAnimationFrame(() => {
        focusInvalidField(validation.error)
      })
      return
    }

    registerMutation.mutate(validation.request)
  }

  return (
    <VStack as="main" width="100%">
      <Center width="100%" minHeight="calc(100svh - 3.5rem)">
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
            <Heading level={1} justify="center">
              {copy.title}
            </Heading>
            <Text type="body" color="secondary" justify="center">
              {copy.description}
            </Text>
            <Link href="/login" isStandalone>
              {copy.backToLogin}
            </Link>
          </VStack>

          <Card padding={8} width="100%">
            {/* 브라우저 기본 validation UI 대신 i18n 가능한 검증 결과만 노출 */}
            <form noValidate onSubmit={handleSubmit}>
              <VStack gap={4} hAlign="stretch">
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
                      clearRegisterFeedback('emailRequired', 'emailInvalid')
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
                    ref={nicknameInputRef}
                    label={copy.nicknameLabel}
                    htmlName="nickname"
                    type="text"
                    value={nickname}
                    onChange={(nextNickname) => {
                      setNickname(nextNickname)
                      clearRegisterFeedback('nicknameRequired')
                    }}
                    startIcon={UserRound}
                    required
                    isDisabled={isSubmitting}
                    {...(isNicknameInvalid && formErrorMessage
                      ? {
                          status: {
                            type: 'error' as const,
                            message: formErrorMessage,
                          },
                        }
                      : {})}
                    placeholder={copy.nicknamePlaceholder}
                    size="lg"
                    width="100%"
                    autoComplete="username"
                  />

                  <TextInput
                    ref={passwordInputRef}
                    label={copy.passwordLabel}
                    htmlName="password"
                    type="password"
                    value={password}
                    onChange={(nextPassword) => {
                      setPassword(nextPassword)
                      clearRegisterFeedback(
                        'passwordRequired',
                        'passwordTooShort',
                        'passwordMismatch',
                      )
                    }}
                    startIcon={LockKeyhole}
                    required
                    minLength={REGISTER_PASSWORD_MIN_LENGTH}
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
                    autoComplete="new-password"
                  />

                  <TextInput
                    ref={passwordConfirmInputRef}
                    label={copy.passwordConfirmLabel}
                    htmlName="passwordConfirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={(nextPasswordConfirm) => {
                      setPasswordConfirm(nextPasswordConfirm)
                      clearRegisterFeedback('passwordMismatch')
                    }}
                    startIcon={LockKeyhole}
                    required
                    minLength={REGISTER_PASSWORD_MIN_LENGTH}
                    isDisabled={isSubmitting}
                    {...(isPasswordMismatch && formErrorMessage
                      ? {
                          status: {
                            type: 'error' as const,
                            message: formErrorMessage,
                          },
                        }
                      : {})}
                    placeholder={copy.passwordConfirmPlaceholder}
                    size="lg"
                    width="100%"
                    autoComplete="new-password"
                  />
                </FormLayout>

                {registerMutation.isSuccess ? (
                  <Banner status="success" title={copy.successMessage} />
                ) : null}

                <Button
                  label={isSubmitting ? copy.submitting : copy.submit}
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting}
                  icon={<Icon icon={UserPlus} color="inherit" />}
                  className="w-full"
                />

                <Text type="supporting" color="secondary" justify="center">
                  {copy.loginPrompt} <Link href="/login">{copy.loginLink}</Link>
                </Text>
              </VStack>
            </form>
          </Card>
        </VStack>
      </Center>
    </VStack>
  )
}
