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
  if (isSafeNativeUrl(href)) {
    return <a ref={ref} href={href} {...props} />
  }

  if (hasUrlScheme(href)) {
    return (
      <a
        ref={ref}
        {...props}
        aria-disabled="true"
        tabIndex={-1}
        onClick={(event) => {
          event.preventDefault()
        }}
      />
    )
  }

  return <TanStackLink ref={ref} to={href as AppRouteTarget} {...props} />
})

const safeNativeProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:'])

function isSafeNativeUrl(value: string) {
  const trimmedValue = value.trimStart()

  if (trimmedValue.startsWith('//')) {
    return true
  }

  const protocol = getUrlProtocol(trimmedValue)

  return protocol !== null && safeNativeProtocols.has(protocol)
}

function hasUrlScheme(value: string) {
  return getUrlProtocol(value.trimStart()) !== null
}

function getUrlProtocol(value: string) {
  const protocol = /^([a-z][a-z\d+\-.]*):/i.exec(value)?.[1]

  return protocol ? `${protocol.toLowerCase()}:` : null
}
