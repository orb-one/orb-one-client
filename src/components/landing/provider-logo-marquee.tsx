import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'

import baekjoonLogo from '@/assets/providers/baekjoon.png'
import jungolLogo from '@/assets/providers/jungol.webp'
import programmersDarkLogo from '@/assets/providers/programmers-dark.png'
import programmersLightLogo from '@/assets/providers/programmers-light.png'
import sweaLogo from '@/assets/providers/swea.png'

interface ProviderLogoMarqueeProps {
  title: string
  description: string
}

const providers = [
  {
    name: 'Baekjoon Online Judge',
    src: baekjoonLogo,
    className: 'w-[150px] md:w-[168px] landing-provider-logo-contrast',
  },
  {
    name: 'Programmers',
    src: programmersDarkLogo,
    darkSrc: programmersLightLogo,
    className: 'w-[132px] md:w-[148px]',
  },
  {
    name: 'SW Expert Academy',
    src: sweaLogo,
    className: 'w-[164px] md:w-[184px] landing-provider-logo-contrast',
  },
  {
    name: 'JUNGOL',
    src: jungolLogo,
    className: 'w-[108px] md:w-[122px] landing-provider-logo-contrast',
  },
] as const

export function ProviderLogoMarquee({
  title,
  description,
}: ProviderLogoMarqueeProps) {
  return (
    <section
      id="providers"
      aria-labelledby="landing-providers-title"
      className="bg-surface border-y border-[var(--color-border)] py-12 md:py-16 lg:py-24"
    >
      <Grid
        columns={{ minWidth: 448, max: 2, repeat: 'fit' }}
        gap={10}
        align="center"
        width="100%"
        maxWidth={1200}
        className="mx-auto px-4 sm:px-6"
      >
        <header className="max-w-[29rem]">
          <VStack gap={3}>
            <Heading id="landing-providers-title" level={2} textWrap="balance">
              {title}
            </Heading>
            <Text as="p" type="body" color="secondary" textWrap="pretty">
              {description}
            </Text>
          </VStack>
        </header>

        <VStack
          gap={0}
          role="group"
          className="landing-provider-marquee min-w-0"
          tabIndex={0}
          aria-labelledby="landing-providers-title"
        >
          <HStack className="landing-provider-track">
            {[false, true].map((isDuplicate) => (
              <HStack
                key={isDuplicate ? 'duplicate' : 'original'}
                aria-hidden={isDuplicate || undefined}
                className="landing-provider-group"
              >
                {providers.map((provider) => (
                  <picture
                    key={provider.name}
                    className="landing-provider-item shrink-0"
                  >
                    {'darkSrc' in provider ? (
                      <source
                        media="(prefers-color-scheme: dark)"
                        srcSet={provider.darkSrc}
                      />
                    ) : null}
                    <img
                      src={provider.src}
                      alt={isDuplicate ? '' : provider.name}
                      width="240"
                      height="48"
                      loading="eager"
                      decoding="async"
                      className={`landing-provider-logo h-auto object-contain ${provider.className}`}
                    />
                  </picture>
                ))}
              </HStack>
            ))}
          </HStack>
        </VStack>
      </Grid>
    </section>
  )
}
