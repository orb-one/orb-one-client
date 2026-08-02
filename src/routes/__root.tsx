import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link to="/" className="text-sm font-semibold">
            Orb One
          </Link>
          <nav className="text-muted-foreground flex items-center gap-3 text-sm">
            <Link
              to="/"
              className="hover:text-foreground [&.active]:text-foreground transition-colors"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
