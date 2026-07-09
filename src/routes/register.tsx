import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Mail, ShieldCheck, UserPlus } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import { registerAccount, type RegisterRequest } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { rememberMockRegisteredUser } from '@/lib/auth/mock-auth-session'
import {
  REGISTER_PASSWORD_MIN_LENGTH,
  validateRegisterForm,
  type RegisterFormError,
} from '@/lib/auth/register-validation'
import { useTranslations } from '@/lib/i18n/use-translations'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

type FormSubmitHandler = NonNullable<ComponentProps<'form'>['onSubmit']>

export function RegisterPage() {
  const t = useTranslations()
  const copy = t.auth.register
  const navigate = Route.useNavigate()
  const [formError, setFormError] = useState<RegisterFormError | null>(null)
  const registerMutation = useMutation({
    mutationFn: registerAccount,
    onSuccess: handleRegisterSuccess,
  })

  const mutationError = registerMutation.isError
    ? getRegisterErrorMessage(registerMutation.error, copy.genericError)
    : null
  const formErrorMessage = formError ? copy[formError] : null
  const feedbackMessage = formErrorMessage ?? mutationError
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

  const handleSubmit: FormSubmitHandler = (event) => {
    event.preventDefault()

    const form = event.currentTarget
    const validation = validateRegisterForm(new FormData(form))

    resetRegisterFeedback()

    if (!validation.ok) {
      setFormError(validation.error)
      return
    }

    registerMutation.mutate(validation.request)
  }

  return (
    <main className="mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-5xl items-center px-4 py-10">
      <section className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
        <div className="max-w-xl space-y-5">
          <div className="text-muted-foreground inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm">
            <ShieldCheck className="size-4" />
            {copy.eyebrow}
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
              {copy.title}
            </h1>
            <p className="text-muted-foreground max-w-md text-base leading-7">
              {copy.description}
            </p>
          </div>
          <Button asChild type="button" variant="outline">
            <Link to="/login">
              <ArrowLeft className="size-4" />
              {copy.backToLogin}
            </Link>
          </Button>
        </div>

        {/* 브라우저 기본 validation UI 대신 i18n 가능한 검증 결과만 노출 */}
        <form
          className="bg-card text-card-foreground rounded-md border p-6 shadow-sm"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="mb-6">
            <p className="font-semibold">{copy.title}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="register-email">
                {copy.emailLabel}
              </label>
              <div className="relative">
                <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                  aria-invalid={isEmailInvalid || undefined}
                  placeholder={copy.emailPlaceholder}
                  className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-9 text-sm transition-colors outline-none focus-visible:ring-3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="register-nickname"
              >
                {copy.nicknameLabel}
              </label>
              <input
                id="register-nickname"
                name="nickname"
                type="text"
                autoComplete="username"
                required
                disabled={isSubmitting}
                aria-invalid={isNicknameInvalid || undefined}
                placeholder={copy.nicknamePlaceholder}
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 text-sm transition-colors outline-none focus-visible:ring-3"
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="register-password"
              >
                {copy.passwordLabel}
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={REGISTER_PASSWORD_MIN_LENGTH}
                disabled={isSubmitting}
                aria-invalid={isPasswordInvalid || undefined}
                placeholder={copy.passwordPlaceholder}
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 text-sm transition-colors outline-none focus-visible:ring-3"
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="register-password-confirm"
              >
                {copy.passwordConfirmLabel}
              </label>
              <input
                id="register-password-confirm"
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={REGISTER_PASSWORD_MIN_LENGTH}
                disabled={isSubmitting}
                aria-invalid={isPasswordMismatch || undefined}
                placeholder={copy.passwordConfirmPlaceholder}
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 text-sm transition-colors outline-none focus-visible:ring-3"
              />
            </div>
          </div>

          {feedbackMessage ? (
            <p className="text-destructive mt-4 text-sm" role="alert">
              {feedbackMessage}
            </p>
          ) : null}

          {registerMutation.isSuccess ? (
            <p
              className="mt-4 text-sm text-emerald-700 dark:text-emerald-400"
              role="status"
            >
              {copy.successMessage}
            </p>
          ) : null}

          <Button
            className="mt-6 w-full"
            type="submit"
            size="lg"
            disabled={isSubmitting}
          >
            <UserPlus className="size-4" />
            {isSubmitting ? copy.submitting : copy.submit}
          </Button>

          <p className="text-muted-foreground mt-4 text-center text-sm">
            {copy.loginPrompt}{' '}
            <Link
              to="/login"
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              {copy.loginLink}
            </Link>
          </p>
        </form>
      </section>
    </main>
  )
}

function getRegisterErrorMessage(error: Error, fallback: string) {
  // ApiError의 server message 우선 노출, 그 외 오류는 일반 문구로 대체
  if (error instanceof ApiError && error.message.trim().length > 0) {
    return error.message
  }

  return fallback
}
