import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Activity, Database, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/use-app-store'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

const loadSummary = async () => {
  await new Promise((resolve) => window.setTimeout(resolve, 250))

  return {
    framework: 'React + TypeScript',
    router: 'TanStack Router',
    serverState: 'TanStack Query',
  }
}

function DashboardPage() {
  const launchCount = useAppStore((state) => state.launchCount)
  const incrementLaunchCount = useAppStore(
    (state) => state.incrementLaunchCount,
  )
  const resetLaunchCount = useAppStore((state) => state.resetLaunchCount)

  const summaryQuery = useQuery({
    queryKey: ['project-summary'],
    queryFn: loadSummary,
  })

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <section className="space-y-4">
        <div className="text-legacy-muted-foreground rounded-legacy-md inline-flex items-center gap-2 border px-2.5 py-1 text-sm">
          <Activity className="size-4" />
          Frontend starter
        </div>
        <div className="max-w-2xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
            Orb One client
          </h1>
          <p className="text-legacy-muted-foreground text-base leading-7">
            React, TypeScript, Zustand, TanStack Router, TanStack Query, and
            shadcn/ui are wired together and ready to grow.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <InfoPanel
          label="Framework"
          value={summaryQuery.data?.framework ?? 'Loading'}
        />
        <InfoPanel
          label="Routing"
          value={summaryQuery.data?.router ?? 'Loading'}
        />
        <InfoPanel
          label="Async state"
          value={summaryQuery.data?.serverState ?? 'Loading'}
        />
      </section>

      <section className="bg-legacy-card text-legacy-card-foreground rounded-legacy-lg border p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-medium">Zustand store</h2>
            <p className="text-legacy-muted-foreground text-sm">
              Local UI state is isolated from server state.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={resetLaunchCount}>
              <RotateCcw className="size-4" />
              Reset
            </Button>
            <Button type="button" onClick={incrementLaunchCount}>
              Launch count: {launchCount}
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}

function InfoPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-legacy-card text-legacy-card-foreground rounded-legacy-lg border p-4">
      <div className="bg-legacy-muted rounded-legacy-md mb-3 flex size-8 items-center justify-center">
        <Database className="size-4" />
      </div>
      <p className="text-legacy-muted-foreground text-sm">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}
