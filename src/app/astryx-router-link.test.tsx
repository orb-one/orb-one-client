import { cleanup, render, screen } from '@testing-library/react'
import { forwardRef, type AnchorHTMLAttributes } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Link: forwardRef<
    HTMLAnchorElement,
    AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }
  >(function MockRouterLink({ to, children, ...props }, ref) {
    return (
      <a ref={ref} href={to} data-router-link="true" {...props}>
        {children}
      </a>
    )
  }),
}))

import { AstryxRouterLink } from '@/app/astryx-router-link'

afterEach(cleanup)

it('routes internal links through TanStack Router', () => {
  render(<AstryxRouterLink href="/solutions">Solutions</AstryxRouterLink>)

  expect(screen.getByRole('link', { name: 'Solutions' })).toHaveAttribute(
    'data-router-link',
    'true',
  )
})

it('keeps absolute links as native anchors', () => {
  render(
    <AstryxRouterLink
      href="https://www.acmicpc.net/problem/1000"
      target="_blank"
      rel="noopener noreferrer"
    >
      Problem
    </AstryxRouterLink>,
  )

  const link = screen.getByRole('link', { name: 'Problem' })

  expect(link).not.toHaveAttribute('data-router-link')
  expect(link).toHaveAttribute('href', 'https://www.acmicpc.net/problem/1000')
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
})

it.each(['javascript:alert(1)', 'data:text/html,<h1>unsafe</h1>'])(
  'blocks the unsafe link scheme in %s',
  (href) => {
    render(<AstryxRouterLink href={href}>Unsafe</AstryxRouterLink>)

    const content = screen.getByText('Unsafe')

    expect(content).not.toHaveAttribute('href')
    expect(content).toHaveAttribute('aria-disabled', 'true')
    expect(content).toHaveAttribute('tabindex', '-1')
  },
)

it.each(['mailto:user@example.com', 'tel:+821012345678'])(
  'keeps the safe native link scheme in %s',
  (href) => {
    render(<AstryxRouterLink href={href}>Contact</AstryxRouterLink>)

    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      href,
    )
  },
)
