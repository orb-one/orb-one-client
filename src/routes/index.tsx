import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Center } from '@astryxdesign/core/Center'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Section } from '@astryxdesign/core/Section'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Activity,
  Code2,
  Database,
  Rocket,
  RotateCcw,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'

import { useAppStore } from '@/stores/use-app-store'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

const projectSummaryQueryKey = ['project-summary'] as const

const loadSummary = async () => {
  await new Promise((resolve) => window.setTimeout(resolve, 250))

  return {
    framework: 'React + TypeScript',
    router: 'TanStack Router',
    serverState: 'TanStack Query',
  }
}

export function DashboardPage({
  summaryLoader = loadSummary,
}: DashboardPageProps = {}) {
  const launchCount = useAppStore((state) => state.launchCount)
  const incrementLaunchCount = useAppStore(
    (state) => state.incrementLaunchCount,
  )
  const resetLaunchCount = useAppStore((state) => state.resetLaunchCount)

  const summaryQuery = useQuery({
    queryKey: projectSummaryQueryKey,
    queryFn: summaryLoader,
  })
  const summaryItems: SummaryItem[] = [
    {
      label: 'Framework',
      value: summaryQuery.data?.framework,
      icon: Code2,
    },
    {
      label: 'Routing',
      value: summaryQuery.data?.router,
      icon: Waypoints,
    },
    {
      label: 'Async state',
      value: summaryQuery.data?.serverState,
      icon: Database,
    },
  ]

  return (
    <Center width="100%">
      <VStack
        width="100%"
        maxWidth={1024}
        gap={8}
        paddingInline={4}
        paddingBlock={10}
      >
        <VStack gap={3} maxWidth={672}>
          <HStack gap={1.5} vAlign="center">
            <Icon icon={Activity} size="sm" color="accent" />
            <Text type="supporting" color="secondary">
              Frontend starter
            </Text>
          </HStack>
          <VStack gap={2}>
            <Heading level={1}>Orb One client</Heading>
            <Text type="body" color="secondary">
              React, TypeScript, Zustand, TanStack Router, TanStack Query, and
              Astryx are wired together and ready to grow.
            </Text>
          </VStack>
        </VStack>

        <VStack gap={3}>
          <Heading level={2}>Project foundation</Heading>
          {summaryQuery.isError ? (
            <Banner
              status="error"
              title="Project summary unavailable"
              description="The project foundation could not be loaded."
              endContent={
                <Button
                  label="Retry"
                  size="sm"
                  variant="secondary"
                  onClick={() => void summaryQuery.refetch()}
                />
              }
            />
          ) : (
            <Grid
              width="100%"
              gap={4}
              columns={{ minWidth: 240, max: 3, repeat: 'fit' }}
            >
              {summaryItems.map((item) => (
                <SummaryCard
                  key={item.label}
                  {...item}
                  isLoading={summaryQuery.isPending}
                />
              ))}
            </Grid>
          )}
        </VStack>

        <Section variant="muted" width="100%" padding={6}>
          <Grid
            width="100%"
            gap={4}
            align="center"
            columns={{ minWidth: 280, max: 2, repeat: 'fit' }}
          >
            <VStack gap={1}>
              <Heading level={2}>Zustand store</Heading>
              <Text type="supporting" color="secondary">
                Local UI state is isolated from server state.
              </Text>
            </VStack>
            <HStack gap={2} hAlign="end" vAlign="center" wrap="wrap">
              <Button
                label="Reset"
                type="button"
                size="sm"
                variant="secondary"
                icon={<Icon icon={RotateCcw} color="inherit" />}
                onClick={resetLaunchCount}
              />
              <Button
                label={`Launch count: ${String(launchCount)}`}
                type="button"
                size="sm"
                variant="primary"
                icon={<Icon icon={Rocket} color="inherit" />}
                onClick={incrementLaunchCount}
              />
            </HStack>
          </Grid>
        </Section>
      </VStack>
    </Center>
  )
}

function SummaryCard({ label, value, icon, isLoading }: SummaryCardProps) {
  return (
    <Card padding={5} width="100%">
      <VStack gap={3}>
        <Icon icon={icon} size="md" color="accent" />
        <VStack gap={1}>
          <Text type="supporting" color="secondary">
            {label}
          </Text>
          {isLoading ? (
            <Skeleton
              data-testid="summary-skeleton"
              width="70%"
              height={20}
              radius={2}
            />
          ) : (
            <Text type="body" color="primary">
              {value}
            </Text>
          )}
        </VStack>
      </VStack>
    </Card>
  )
}

interface SummaryItem {
  label: string
  value: string | undefined
  icon: LucideIcon
}

interface DashboardPageProps {
  summaryLoader?: typeof loadSummary
}

interface SummaryCardProps extends SummaryItem {
  isLoading: boolean
}
