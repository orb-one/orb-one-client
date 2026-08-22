import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { Heading } from '@astryxdesign/core/Heading'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Section } from '@astryxdesign/core/Section'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { VStack } from '@astryxdesign/core/VStack'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import type { PropsWithChildren } from 'react'

import { AuthSessionExpiredError } from '@/lib/api/client'
import { currentUserQueryOptions } from '@/lib/auth/auth-queries'
import { useTranslations } from '@/lib/i18n/use-translations'

export const Route = createFileRoute('/mypage')({
  component: MyPage,
})

export function MyPage() {
  const t = useTranslations()
  const copy = t.mypage
  const currentUserQuery = useQuery(currentUserQueryOptions())

  if (currentUserQuery.isPending) {
    return (
      <MyPageFrame>
        <Section padding={4} width="100%">
          <VStack role="status" aria-live="polite">
            <MetadataList
              title={<Heading level={2}>{copy.accountInformation}</Heading>}
              orientation="horizontal"
            >
              <MetadataListItem label={copy.nicknameLabel}>
                <Skeleton width={112} height={20} />
              </MetadataListItem>
              <MetadataListItem label={copy.emailLabel}>
                <Skeleton width={176} height={20} index={1} />
              </MetadataListItem>
            </MetadataList>
            <VisuallyHidden>{copy.loading}</VisuallyHidden>
          </VStack>
        </Section>
      </MyPageFrame>
    )
  }

  if (
    currentUserQuery.data === null ||
    currentUserQuery.error instanceof AuthSessionExpiredError
  ) {
    return <Navigate to="/login" replace />
  }

  if (currentUserQuery.isError) {
    return (
      <MyPageFrame>
        <Banner
          status="error"
          title={copy.loadError}
          endContent={
            <Button
              label={copy.retry}
              size="sm"
              variant="secondary"
              onClick={() => void currentUserQuery.refetch()}
            />
          }
        />
      </MyPageFrame>
    )
  }

  return (
    <MyPageFrame>
      <Section padding={4} width="100%">
        <MetadataList
          title={<Heading level={2}>{copy.accountInformation}</Heading>}
          orientation="horizontal"
        >
          <MetadataListItem label={copy.nicknameLabel}>
            {currentUserQuery.data.nickname}
          </MetadataListItem>
          <MetadataListItem label={copy.emailLabel}>
            {currentUserQuery.data.email}
          </MetadataListItem>
        </MetadataList>
      </Section>
    </MyPageFrame>
  )
}

function MyPageFrame({ children }: PropsWithChildren) {
  const copy = useTranslations().mypage

  return (
    <Center width="100%">
      <VStack
        width="100%"
        maxWidth={720}
        gap={6}
        paddingInline={4}
        paddingBlock={10}
      >
        <VStack gap={2}>
          <Heading level={1}>{copy.title}</Heading>
          <Text type="body" color="secondary">
            {copy.description}
          </Text>
        </VStack>
        {children}
      </VStack>
    </Center>
  )
}
