import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Mail, ShieldCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { registerAccount } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { useTranslations } from '@/lib/i18n/use-translations'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

export function RegisterPage() {
  const t = useTranslations()
  const copy = t.auth.register
  const [formError, setFormError] = useState<string | null>(null)
  const registerMutation = useMutation({
    mutationFn: registerAccount,
  })

  const mutationError = registerMutation.isError
    ? getRegisterErrorMessage(registerMutation.error, copy.genericError)
    : null
  const feedbackMessage = formError ?? mutationError
  const isPasswordMismatch = formError === copy.passwordMismatch
  const isSubmitting = registerMutation.isPending

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

        <form
          className="bg-card text-card-foreground rounded-md border p-6 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault()

            const form = event.currentTarget
            const formData = new FormData(form)
            const password = getStringFormValue(formData, 'password')
            const passwordConfirm = getStringFormValue(
              formData,
              'passwordConfirm',
            )

            // 이전 제출의 server/form 오류가 다음 제출 결과와 섞이지 않도록 초기화
            registerMutation.reset()
            setFormError(null)

            // 서버 호출 전 클라이언트에서 확인 가능한 입력 오류 차단
            if (password !== passwordConfirm) {
              setFormError(copy.passwordMismatch)
              return
            }

            registerMutation.mutate(
              {
                email: getStringFormValue(formData, 'email').trim(),
                password,
                nickname: getStringFormValue(formData, 'nickname').trim(),
              },
              {
                onSuccess: () => {
                  // mock API 응답 이후 실제 계정 상태 복원 불가로 입력값만 정리
                  form.reset()
                },
              },
            )
          }}
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
                minLength={8}
                disabled={isSubmitting}
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
                minLength={8}
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

function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === 'string' ? value : ''
}

function getRegisterErrorMessage(error: Error, fallback: string) {
  // ApiError의 server message 우선 노출, 그 외 오류는 일반 문구로 대체
  if (error instanceof ApiError && error.message.trim().length > 0) {
    return error.message
  }

  return fallback
}
