import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, LogIn, Mail, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTranslations } from '@/lib/i18n/use-translations'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

export function LoginPage() {
  const t = useTranslations()
  const copy = t.auth.login

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
                placeholder={copy.passwordPlaceholder}
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 text-sm transition-colors outline-none focus-visible:ring-3"
              />
            </div>
          </div>

          <Button className="mt-6 w-full" type="submit" size="lg">
            <LogIn className="size-4" />
            {copy.submit}
          </Button>
        </form>
      </section>
    </main>
  )
}
