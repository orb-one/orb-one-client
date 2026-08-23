interface BrandLogoProps {
  label?: string
  size?: 'sm' | 'md'
}

const dimensions = {
  sm: { width: 53, height: 28 },
  md: { width: 61, height: 32 },
} as const

export function BrandLogo({ label, size = 'md' }: BrandLogoProps) {
  const { width, height } = dimensions[size]

  return (
    <img
      src="/brand/o1-wordmark-a.svg"
      width={width}
      height={height}
      alt={label ?? ''}
      className="brand-logo block shrink-0 object-contain"
    />
  )
}
