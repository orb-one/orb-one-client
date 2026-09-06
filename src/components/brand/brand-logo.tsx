interface BrandLogoProps {
  label?: string
  size?: 'sm' | 'md'
}

const dimensions = {
  sm: { width: 28, height: 28 },
  md: { width: 32, height: 32 },
} as const

export function BrandLogo({ label, size = 'md' }: BrandLogoProps) {
  const { width, height } = dimensions[size]

  return (
    <img
      src="/brand/orb-one-symbol.svg"
      width={width}
      height={height}
      alt={label ?? ''}
      className="brand-logo block shrink-0 object-contain"
    />
  )
}
