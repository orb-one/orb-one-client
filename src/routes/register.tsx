import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Mail, ShieldCheck, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTranslations } from '@/lib/i18n/use-translations'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

export function RegisterPage() {
  const t = useTranslations()
  const copy = t.auth.register

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
                placeholder={copy.passwordConfirmPlaceholder}
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 text-sm transition-colors outline-none focus-visible:ring-3"
              />
            </div>
          </div>

          <Button className="mt-6 w-full" type="submit" size="lg">
            <UserPlus className="size-4" />
            {copy.submit}
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
