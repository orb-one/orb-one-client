import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Section } from '@astryxdesign/core/Section'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useToast } from '@astryxdesign/core/Toast'
import { VStack } from '@astryxdesign/core/VStack'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { deleteCurrentUser } from '@/lib/api/auth'
import { ApiError, AuthSessionExpiredError } from '@/lib/api/client'
import { useTranslations } from '@/lib/i18n/use-translations'

export function AccountDeletionSection({
  onDeleted,
  onSessionExpired,
}: AccountDeletionSectionProps) {
  const copy = useTranslations().mypage
  const showToast = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const deletionMutation = useMutation({ mutationFn: deleteCurrentUser })
  const isDeletionConfirmed = confirmationText === copy.accountDeletionConsent
  const isUserOwnsGroupError =
    deletionMutation.error instanceof ApiError &&
    deletionMutation.error.status === 409 &&
    deletionMutation.error.code === 'USER_OWNS_GROUP'
  const hasDeletionError =
    deletionMutation.isError &&
    !isUserOwnsGroupError &&
    !isAuthenticationError(deletionMutation.error)

  async function handleDelete() {
    try {
      await deletionMutation.mutateAsync()
    } catch (error) {
      setIsDialogOpen(false)

      if (isAuthenticationError(error)) {
        onSessionExpired()
      }

      return
    }

    setIsDialogOpen(false)
    showToast({
      body: copy.accountDeletionSuccess,
      uniqueID: 'account.deletion.success',
      collisionBehavior: 'overwrite',
    })
    await onDeleted()
  }

  function openConfirmation() {
    deletionMutation.reset()
    setConfirmationText('')
    setIsDialogOpen(true)
  }

  function closeConfirmation() {
    if (deletionMutation.isPending) {
      return
    }

    setConfirmationText('')
    setIsDialogOpen(false)
  }

  return (
    <Section padding={4} width="100%">
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={2}>{copy.accountDeletionTitle}</Heading>
          <Text type="supporting" color="secondary">
            {copy.accountDeletionDescription}
          </Text>
        </VStack>

        {isUserOwnsGroupError ? (
          <Banner
            status="error"
            title={copy.accountDeletionGroupOwnerError}
            description={copy.accountDeletionGroupOwnerGuidance}
          />
        ) : null}

        {hasDeletionError ? (
          <Banner status="error" title={copy.accountDeletionError} />
        ) : null}

        <HStack hAlign="end">
          <Button
            label={copy.accountDeletionSubmit}
            variant="destructive"
            isDisabled={deletionMutation.isPending}
            onClick={openConfirmation}
          />
        </HStack>

        <Dialog
          isOpen={isDialogOpen}
          aria-label={copy.accountDeletionConfirmTitle}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setIsDialogOpen(true)
              return
            }

            closeConfirmation()
          }}
          purpose="form"
          width={480}
        >
          <Layout
            height="auto"
            header={<DialogHeader title={copy.accountDeletionConfirmTitle} />}
            content={
              <LayoutContent>
                <VStack gap={4}>
                  <Text>{copy.accountDeletionConfirmDescription}</Text>
                  <TextInput
                    label={copy.accountDeletionConfirmationLabel}
                    description={copy.accountDeletionConfirmationDescription}
                    placeholder={copy.accountDeletionConsent}
                    value={confirmationText}
                    isDisabled={deletionMutation.isPending}
                    onChange={setConfirmationText}
                  />
                </VStack>
              </LayoutContent>
            }
            footer={
              <LayoutFooter hasDivider>
                <HStack gap={2} hAlign="end">
                  <Button
                    label={copy.accountDeletionCancel}
                    variant="secondary"
                    isDisabled={deletionMutation.isPending}
                    onClick={closeConfirmation}
                  />
                  <Button
                    label={copy.accountDeletionSubmit}
                    variant="destructive"
                    isDisabled={
                      !isDeletionConfirmed || deletionMutation.isPending
                    }
                    isLoading={deletionMutation.isPending}
                    onClick={() => void handleDelete()}
                  />
                </HStack>
              </LayoutFooter>
            }
          />
        </Dialog>
      </VStack>
    </Section>
  )
}

function isAuthenticationError(error: unknown) {
  return (
    error instanceof AuthSessionExpiredError ||
    (error instanceof ApiError && error.status === 401)
  )
}

interface AccountDeletionSectionProps {
  onDeleted: () => void | Promise<void>
  onSessionExpired: () => void
}
