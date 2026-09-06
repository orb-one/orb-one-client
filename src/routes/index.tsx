import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { createFileRoute } from '@tanstack/react-router'

import groupProblemSetImage from '@/assets/landing/group-problem-set.webp'
import solutionDetailImage from '@/assets/landing/solution-detail.webp'
import { BrandLogo } from '@/components/brand/brand-logo'
import { ProviderLogoMarquee } from '@/components/landing/provider-logo-marquee'
import { useTranslations } from '@/lib/i18n/use-translations'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

export function LandingPage() {
  const t = useTranslations()
  const copy = t.landing
  const [heroTitleBeforeHighlight, heroTitleAfterHighlight = ''] =
    copy.hero.title.split(copy.hero.highlight)

  return (
    <VStack
      gap={0}
      className="orb-brand-accent orb-study-landing overflow-x-clip"
    >
      <section
        aria-labelledby="landing-hero-title"
        className="landing-study-hero relative min-h-[calc(100dvh-4rem)] overflow-hidden"
      >
        <header className="landing-hero-copy landing-study-hero-copy">
          <VStack gap={6} hAlign="center">
            <Heading
              id="landing-hero-title"
              level={1}
              type="display-1"
              justify="center"
              textWrap="balance"
            >
              {heroTitleBeforeHighlight}
              <span className="text-[var(--color-accent)]">
                {copy.hero.highlight}
              </span>
              {heroTitleAfterHighlight}
            </Heading>
            <Text
              id="landing-hero-description"
              as="p"
              type="large"
              color="secondary"
              justify="center"
              textWrap="pretty"
            >
              {copy.hero.description}
            </Text>
          </VStack>
        </header>

        <VStack
          gap={0}
          role="group"
          aria-label={copy.images.previewLabel}
          className="landing-hero-visual landing-study-product-stage"
        >
          <figure className="landing-product-window landing-product-window-main">
            <figcaption aria-hidden="true" className="landing-window-bar">
              workspace / weekly-problems
            </figcaption>
            <img
              src={groupProblemSetImage}
              width={1440}
              height={602}
              alt={copy.images.groupAlt}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </figure>

          <figure className="landing-product-window landing-product-window-detail">
            <figcaption aria-hidden="true" className="landing-window-bar">
              solutions / BOJ-1000.java
            </figcaption>
            <img
              src={solutionDetailImage}
              width={1440}
              height={952}
              alt={copy.images.solutionAlt}
              loading="eager"
              decoding="async"
            />
          </figure>
        </VStack>
      </section>

      <ProviderLogoMarquee
        title={copy.support.title}
        description={copy.support.description}
      />

      <footer className="bg-surface border-t border-[var(--color-border)]">
        <Grid
          columns={{ minWidth: 240, max: 2, repeat: 'fit' }}
          gap={3}
          align="center"
          width="100%"
          maxWidth={1200}
          className="mx-auto px-4 py-8 sm:px-6"
        >
          <BrandLogo label={t.common.productName} size="sm" />
          <Text
            as="p"
            type="supporting"
            color="secondary"
            className="md:justify-self-end"
          >
            {copy.footer}
          </Text>
        </Grid>
      </footer>
    </VStack>
  )
}
