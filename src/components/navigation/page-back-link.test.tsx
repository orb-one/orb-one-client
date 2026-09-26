import { LayerProvider } from '@astryxdesign/core/Layer'
import { LinkProvider } from '@astryxdesign/core/Link'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'

import { AstryxRouterLink } from '@/app/astryx-router-link'
import { PageBackLink } from '@/components/navigation/page-back-link'

afterEach(cleanup)

it.each([
  ['/solutions/solution-1/edit?source=search', '/solutions/solution-1'],
  ['/groups/group-1/practices/practice-1', '/groups/group-1'],
  ['/solutions/new', '/solutions'],
  ['/login', '/'],
])(
  'uses the nearest registered parent for a direct visit to %s',
  async (from, to) => {
    const router = createTestRouter(from)
    renderRouter(router)

    const backLink = await screen.findByRole('link', { name: '뒤로 가기' })
    expect(backLink).toHaveAttribute('href', to)

    await userEvent.click(backLink)
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(to)
    })
  },
)

it('keeps an explicit destination ahead of the inferred parent', async () => {
  const router = createTestRouter(
    '/groups/group-1/practices/practice-1',
    '/groups',
  )
  renderRouter(router)

  expect(
    await screen.findByRole('link', { name: '뒤로 가기' }),
  ).toHaveAttribute('href', '/groups')
})

it('does not link the home page to itself', async () => {
  const router = createTestRouter('/')
  renderRouter(router)

  expect(
    await screen.findByRole('heading', { name: '현재 페이지' }),
  ).toBeVisible()
  expect(screen.queryByRole('link', { name: '뒤로 가기' })).toBeNull()
})

function createTestRouter(initialEntry: string, explicitHref?: string) {
  const rootRoute = createRootRoute({ component: Outlet })
  const backLinkProps = explicitHref === undefined ? {} : { href: explicitHref }
  const page = () => (
    <>
      <PageBackLink {...backLinkProps} label="뒤로 가기" />
      <h1>현재 페이지</h1>
    </>
  )
  const paths = [
    '/',
    '/groups',
    '/groups/$groupId',
    '/groups/$groupId/practices/$practiceId',
    '/login',
    '/solutions',
    '/solutions/$solutionId',
    '/solutions/$solutionId/edit',
    '/solutions/new',
  ] as const
  const children = paths.map((path) =>
    createRoute({ getParentRoute: () => rootRoute, path, component: page }),
  )

  return createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  })
}

function renderRouter(router: ReturnType<typeof createTestRouter>) {
  render(
    <Theme theme={neutralTheme} mode="light">
      <LayerProvider>
        <LinkProvider component={AstryxRouterLink}>
          <RouterProvider router={router} />
        </LinkProvider>
      </LayerProvider>
    </Theme>,
  )
}
