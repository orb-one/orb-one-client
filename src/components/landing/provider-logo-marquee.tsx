import baekjoonLogo from '@/assets/providers/baekjoon.png'
import jungolLogo from '@/assets/providers/jungol.webp'
import programmersDarkLogo from '@/assets/providers/programmers-dark.png'
import programmersLightLogo from '@/assets/providers/programmers-light.png'
import sweaLogo from '@/assets/providers/swea.png'

interface ProviderLogoMarqueeProps {
  title: string
}

const providers = [
  {
    name: 'Baekjoon Online Judge',
    src: baekjoonLogo,
    className: 'w-[168px] md:w-[190px] landing-provider-logo-contrast',
  },
  {
    name: 'JUNGOL',
    src: jungolLogo,
    className: 'w-[116px] md:w-[132px] landing-provider-logo-contrast',
  },
  {
    name: 'SW Expert Academy',
    src: sweaLogo,
    className: 'w-[178px] md:w-[202px] landing-provider-logo-contrast',
  },
  {
    name: 'Programmers',
    src: programmersDarkLogo,
    darkSrc: programmersLightLogo,
    className: 'w-[140px] md:w-[158px]',
  },
] as const

export function ProviderLogoMarquee({ title }: ProviderLogoMarqueeProps) {
  return (
    <section
      aria-labelledby="landing-providers-title"
      className="border-y border-[var(--color-border-subtle)] py-6 md:py-8"
    >
      <h2
        id="landing-providers-title"
        className="px-4 text-center text-sm font-medium text-[var(--color-text-secondary)]"
      >
        {title}
      </h2>

      <div className="landing-provider-marquee mt-6 overflow-hidden">
        <div className="landing-provider-track">
          {[false, true].map((isDuplicate) => (
            <div
              key={isDuplicate ? 'duplicate' : 'original'}
              aria-hidden={isDuplicate || undefined}
              className="landing-provider-group"
            >
              {providers.map((provider) => (
                <picture key={provider.name} className="shrink-0">
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
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
