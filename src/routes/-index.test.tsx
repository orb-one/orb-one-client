import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { DashboardPage } from '@/routes/index'
import { useAppStore } from '@/stores/use-app-store'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    <TOptions extends object>(options: TOptions) =>
      options,
}))

afterEach(() => {
  cleanup()
  useAppStore.getState().resetLaunchCount()
})

it('renders project summary loading and success states', async () => {
  renderDashboard()

  expect(screen.getAllByTestId('summary-skeleton')).toHaveLength(3)
  expect(
    screen.getByRole('heading', { name: 'Project foundation' }),
  ).toBeVisible()

  expect(await screen.findByText('React + TypeScript')).toBeVisible()
  expect(screen.getByText('TanStack Router')).toBeVisible()
  expect(screen.getByText('TanStack Query')).toBeVisible()
  expect(screen.queryByTestId('summary-skeleton')).not.toBeInTheDocument()
})

it('increments and resets the Zustand launch count', async () => {
  renderDashboard()

  await userEvent.click(screen.getByRole('button', { name: 'Launch count: 0' }))

  expect(screen.getByRole('button', { name: 'Launch count: 1' })).toBeVisible()

  await userEvent.click(screen.getByRole('button', { name: 'Reset' }))

  expect(screen.getByRole('button', { name: 'Launch count: 0' })).toBeVisible()
})

it('shows an error banner and retries the project summary', async () => {
  const summaryLoader = vi
    .fn()
    .mockRejectedValueOnce(new Error('Summary unavailable'))
    .mockResolvedValueOnce({
      framework: 'React + TypeScript',
      router: 'TanStack Router',
      serverState: 'TanStack Query',
    })

  renderWithClient(
    createQueryClient(),
    <DashboardPage summaryLoader={summaryLoader} />,
  )

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Project summary unavailable',
  )

  await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

  expect(await screen.findByText('React + TypeScript')).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(summaryLoader).toHaveBeenCalledTimes(2)
})

function renderDashboard() {
  return renderWithClient(createQueryClient(), <DashboardPage />)
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

function renderWithClient(queryClient: QueryClient, children: ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  )
}
