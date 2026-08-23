import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpenCheck,
  Braces,
  LibraryBig,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

import groupProblemSetImage from '@/assets/landing/group-problem-set.webp'
import solutionDetailImage from '@/assets/landing/solution-detail.webp'
import { BrandLogo } from '@/components/brand/brand-logo'
import { ProviderLogoMarquee } from '@/components/landing/provider-logo-marquee'
import { SharedLearningPreview } from '@/components/landing/shared-learning-preview'
import { currentUserQueryOptions } from '@/lib/auth/auth-queries'
import { useTranslations } from '@/lib/i18n/use-translations'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

export function LandingPage() {
  const t = useTranslations()
  const copy = t.landing
  const currentUserQuery = useQuery(currentUserQueryOptions())
  const isSignedIn =
    currentUserQuery.data !== null && currentUserQuery.data !== undefined
  const primaryCta = isSignedIn
    ? { label: copy.cta.viewSolutions, href: '/solutions' }
    : { label: copy.cta.startRecording, href: '/register' }
  const secondaryCta = isSignedIn
    ? { label: copy.cta.viewGroups, href: '/groups' }
    : { label: copy.cta.signIn, href: '/login' }
  const workflowSteps: WorkflowStep[] = [
    { ...copy.workflow.choose, icon: BookOpenCheck },
    { ...copy.workflow.record, icon: Braces },
    { ...copy.workflow.explain, icon: LibraryBig },
    { ...copy.workflow.find, icon: UsersRound },
  ]

  return (
    <div className="orb-brand-accent overflow-x-clip bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]">
      <section
        aria-labelledby="landing-hero-title"
        className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-[1360px] items-center gap-8 px-4 py-12 md:px-8 lg:grid-cols-12 lg:gap-10 lg:py-16"
      >
        <div className="landing-hero-copy lg:col-span-5 lg:pl-[4vw]">
          <h1
            id="landing-hero-title"
            className="max-w-[15ch] text-[clamp(3rem,4vw,3.75rem)] leading-[0.98] font-semibold tracking-[-0.055em] text-balance break-keep"
          >
            {copy.hero.title}
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-8 text-[var(--color-text-secondary)] md:text-xl">
            {copy.hero.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              label={primaryCta.label}
              href={primaryCta.href}
              size="lg"
              variant="primary"
              endContent={<Icon icon={ArrowRight} color="inherit" />}
            />
            <Button
              label={secondaryCta.label}
              href={secondaryCta.href}
              size="lg"
              variant="secondary"
            />
          </div>
        </div>

        <div className="landing-hero-visual relative lg:col-span-7">
          <div className="mx-auto w-full max-w-[760px]">
            <SharedLearningPreview copy={copy.preview} />
          </div>
        </div>
      </section>

      <ProviderLogoMarquee title={copy.support.title} />

      <section
        aria-labelledby="landing-workflow-title"
        className="landing-section-reveal mx-auto w-full max-w-[1180px] px-4 py-24 md:px-8 md:py-32"
      >
        <div className="max-w-[720px]">
          <h2
            id="landing-workflow-title"
            className="text-3xl leading-tight font-semibold tracking-[-0.035em] md:text-5xl"
          >
            {copy.workflow.title}
          </h2>
          <p className="mt-4 max-w-[62ch] text-base leading-7 text-[var(--color-text-secondary)] md:text-lg">
            {copy.workflow.description}
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-4 md:gap-0">
          {workflowSteps.map((step) => (
            <article
              key={step.title}
              className="border-t border-[var(--color-border-subtle)] pt-5 md:px-5 md:first:pl-0 md:last:pr-0"
            >
              <Icon icon={step.icon} size="md" color="accent" />
              <h3 className="mt-6 text-xl font-semibold tracking-[-0.02em]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="landing-solutions-title"
        className="landing-section-reveal mx-auto grid w-full max-w-[1280px] items-center gap-10 px-4 py-24 md:px-8 md:py-32 lg:grid-cols-12 lg:gap-16"
      >
        <figure className="overflow-hidden rounded-[16px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] shadow-[0_24px_70px_color-mix(in_srgb,var(--color-text-primary)_10%,transparent)] lg:col-span-7">
          <img
            src={solutionDetailImage}
            width={1440}
            height={1000}
            alt={copy.images.solutionAlt}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full"
          />
        </figure>
        <div className="lg:col-span-5 lg:pr-[4vw]">
          <h2
            id="landing-solutions-title"
            className="max-w-[11ch] text-4xl leading-[1.04] font-semibold tracking-[-0.04em] md:text-5xl"
          >
            {copy.solutions.title}
          </h2>
          <p className="mt-5 max-w-[48ch] text-base leading-7 text-[var(--color-text-secondary)] md:text-lg">
            {copy.solutions.description}
          </p>
          <div className="mt-7">
            <Button
              label={copy.solutions.cta}
              href="/solutions"
              size="lg"
              variant="secondary"
              endContent={<Icon icon={ArrowRight} color="inherit" />}
            />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="landing-groups-title"
        className="landing-section-reveal mx-auto grid w-full max-w-[1280px] items-center gap-10 px-4 py-24 md:px-8 md:py-32 lg:grid-cols-12 lg:gap-16"
      >
        <div className="lg:col-span-5 lg:pl-[4vw]">
          <h2
            id="landing-groups-title"
            className="max-w-[12ch] text-4xl leading-[1.04] font-semibold tracking-[-0.04em] md:text-5xl"
          >
            {copy.groups.title}
          </h2>
          <p className="mt-5 max-w-[46ch] text-base leading-7 text-[var(--color-text-secondary)] md:text-lg">
            {copy.groups.description}
          </p>
          <div className="mt-7">
            <Button
              label={copy.groups.cta}
              href="/groups"
              size="lg"
              variant="secondary"
              endContent={<Icon icon={ArrowRight} color="inherit" />}
            />
          </div>
        </div>
        <figure className="overflow-hidden rounded-[16px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] shadow-[0_24px_70px_color-mix(in_srgb,var(--color-text-primary)_10%,transparent)] lg:col-span-7">
          <img
            src={groupProblemSetImage}
            width={1440}
            height={650}
            alt={copy.images.groupAlt}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full"
          />
        </figure>
      </section>

      <section
        aria-labelledby="landing-final-cta-title"
        className="landing-section-reveal mx-auto flex w-full max-w-[1040px] flex-col items-start px-4 py-28 md:items-center md:px-8 md:py-40 md:text-center"
      >
        <h2
          id="landing-final-cta-title"
          className="max-w-[13ch] text-4xl leading-[1.04] font-semibold tracking-[-0.045em] text-balance md:text-6xl"
        >
          {copy.finalCta.title}
        </h2>
        <p className="mt-5 max-w-[54ch] text-base leading-7 text-[var(--color-text-secondary)] md:text-lg">
          {copy.finalCta.description}
        </p>
        <div className="mt-8 flex flex-wrap gap-3 md:justify-center">
          <Button
            label={primaryCta.label}
            href={primaryCta.href}
            size="lg"
            variant="primary"
            endContent={<Icon icon={ArrowRight} color="inherit" />}
          />
          <Button
            label={secondaryCta.label}
            href={secondaryCta.href}
            size="lg"
            variant="secondary"
          />
        </div>
      </section>

      <footer className="border-t border-[var(--color-border-subtle)]">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <BrandLogo label={t.common.productName} size="sm" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            {copy.footer}
          </p>
        </div>
      </footer>
    </div>
  )
}

interface WorkflowStep {
  title: string
  description: string
  icon: LucideIcon
}
