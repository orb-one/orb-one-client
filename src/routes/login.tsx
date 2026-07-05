import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, LogIn, Mail, ShieldCheck } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import { loginAccount } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import {
  validateLoginForm,
  type LoginFormError,
} from '@/lib/auth/login-validation'
import { currentUserQueryKey } from '@/lib/auth/auth-queries'
import { useTranslations } from '@/lib/i18n/use-translations'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

type FormSubmitHandler = NonNullable<ComponentProps<'form'>['onSubmit']>

export function LoginPage() {
  const t = useTranslations()
  const copy = t.auth.login
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<LoginFormError | null>(null)
  const loginMutation = useMutation({
    mutationFn: loginAccount,
    onSuccess: handleLoginSuccess,
  })

  const mutationError = loginMutation.isError
    ? getLoginErrorMessage(loginMutation.error, copy.genericError)
    : null
  const formErrorMessage = formError ? copy[formError] : null
  const feedbackMessage = formErrorMessage ?? mutationError
  const isEmailInvalid =
    formError === 'emailRequired' || formError === 'emailInvalid'
  const isPasswordInvalid = formError === 'passwordRequired'
  const isSubmitting = loginMutation.isPending

  function handleLoginSuccess() {
    void queryClient.invalidateQueries({ queryKey: currentUserQueryKey })
    void navigate({ to: '/' })
  }

  function resetLoginFeedback() {
    // 이전 제출의 server/form 오류가 다음 제출 결과와 섞이지 않도록 초기화
    loginMutation.reset()
    setFormError(null)
  }

  const handleSubmit: FormSubmitHandler = (event) => {
    event.preventDefault()

    const form = event.currentTarget
    const validation = validateLoginForm(new FormData(form))

    resetLoginFeedback()

    if (!validation.ok) {
      setFormError(validation.error)
      return
    }

    loginMutation.mutate(validation.request)
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
            <Link to="/">
              <ArrowLeft className="size-4" />
              {copy.backToHome}
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
              <label className="text-sm font-medium" htmlFor="login-email">
                {copy.emailLabel}
              </label>
              <div className="relative">
                <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input
                  id="login-email"
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
              <label className="text-sm font-medium" htmlFor="login-password">
                {copy.passwordLabel}
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isSubmitting}
                aria-invalid={isPasswordInvalid || undefined}
                placeholder={copy.passwordPlaceholder}
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 text-sm transition-colors outline-none focus-visible:ring-3"
              />
            </div>
          </div>

          {feedbackMessage ? (
            <p className="text-destructive mt-4 text-sm" role="alert">
              {feedbackMessage}
            </p>
          ) : null}

          {loginMutation.isSuccess ? (
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
            <LogIn className="size-4" />
            {isSubmitting ? copy.submitting : copy.submit}
          </Button>

          <p className="text-muted-foreground mt-4 text-center text-sm">
            {copy.registerPrompt}{' '}
            <Link
              to="/register"
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              {copy.registerLink}
            </Link>
          </p>
        </form>
      </section>
    </main>
  )
}

function getLoginErrorMessage(error: Error, fallback: string) {
  // ApiError의 server message 우선 노출, 그 외 오류는 일반 문구로 대체
  if (error instanceof ApiError && error.message.trim().length > 0) {
    return error.message
  }

  return fallback
}
