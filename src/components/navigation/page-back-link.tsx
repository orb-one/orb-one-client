import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { useMatches, useRouter } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { findNearestRegisteredParentPath } from '@/lib/navigation/nearest-parent-route'

interface PageBackLinkProps {
  href?: string
  label: string
}

export function PageBackLink({ href, label }: PageBackLinkProps) {
  if (href !== undefined) {
    return <BackLink href={href} label={label} />
  }

  return <InferredPageBackLink label={label} />
}

function InferredPageBackLink({ label }: Pick<PageBackLinkProps, 'label'>) {
  const router = useRouter()
  const currentMatch = useMatches({ select: (matches) => matches.at(-1) })
  const currentRoute = currentMatch && router.routesById[currentMatch.routeId]

  // 모든 file route가 rootRoute 아래에 있어 fullPath로 상위 페이지를 찾음
  const parentPath = currentRoute
    ? findNearestRegisteredParentPath(
        currentRoute.fullPath,
        new Set(Object.keys(router.routesByPath)),
      )
    : null

  if (!parentPath || !currentMatch) {
    return null
  }

  // params는 buildLocation에 맡기고 현재 search는 제거
  const parentHref = router.buildLocation({
    to: parentPath,
    params: currentMatch.params,
    search: {},
  }).href

  return <BackLink href={parentHref} label={label} />
}

function BackLink({ href, label }: Required<PageBackLinkProps>) {
  return (
    <Link href={href} isStandalone className="self-start">
      <HStack as="span" gap={1} vAlign="center">
        <Icon icon={ArrowLeft} size="sm" color="inherit" />
        {label}
      </HStack>
    </Link>
  )
}
