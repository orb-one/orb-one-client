import {
  Link as TanStackLink,
  type LinkProps as TanStackLinkProps,
} from '@tanstack/react-router'
import { forwardRef, type AnchorHTMLAttributes } from 'react'

type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>

type AstryxRouterLinkProps = {
  [Key in keyof AnchorProps]?: Exclude<AnchorProps[Key], undefined>
} & {
  href?: string
}

type AppRouteTarget = NonNullable<TanStackLinkProps['to']>

/**
 * Lets Astryx navigation components use TanStack Router without full reloads.
 * Astryx passes anchor-style `href` props; TanStack Router consumes `to`.
 */
export const AstryxRouterLink = forwardRef<
  HTMLAnchorElement,
  AstryxRouterLinkProps
>(function AstryxRouterLink({ href = '/', ...props }, ref) {
  return <TanStackLink ref={ref} to={href as AppRouteTarget} {...props} />
})
