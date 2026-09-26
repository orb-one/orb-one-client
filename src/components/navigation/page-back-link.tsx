import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { ArrowLeft } from 'lucide-react'

interface PageBackLinkProps {
  href: string
  label: string
}

export function PageBackLink({ href, label }: PageBackLinkProps) {
  return (
    <Link href={href} isStandalone className="self-start">
      <HStack as="span" gap={1} vAlign="center">
        <Icon icon={ArrowLeft} size="sm" color="inherit" />
        {label}
      </HStack>
    </Link>
  )
}
