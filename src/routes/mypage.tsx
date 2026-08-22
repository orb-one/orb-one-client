import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Section } from '@astryxdesign/core/Section'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { VStack } from '@astryxdesign/core/VStack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import {
  useRef,
  useState,
  type ComponentProps,
  type PropsWithChildren,
} from 'react'

import { updateCurrentUser, type CurrentUserResponse } from '@/lib/api/auth'
import { ApiError, AuthSessionExpiredError } from '@/lib/api/client'
import {
  currentUserQueryKey,
  currentUserQueryOptions,
} from '@/lib/auth/auth-queries'
import {
  validateProfileForm,
  type ProfileFormError,
} from '@/lib/auth/profile-validation'
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
          <VStack role="status" aria-live="polite" gap={4}>
            <Heading level={2}>{copy.accountInformation}</Heading>
            <Skeleton width="100%" height={72} />
            <Skeleton width="100%" height={72} index={1} />
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
      <ProfileForm currentUser={currentUserQuery.data} />
    </MyPageFrame>
  )
}

type FormSubmitHandler = NonNullable<ComponentProps<'form'>['onSubmit']>

function ProfileForm({ currentUser }: { currentUser: CurrentUserResponse }) {
  const copy = useTranslations().mypage
  const queryClient = useQueryClient()
  const [nickname, setNickname] = useState(currentUser.nickname)
  const [formError, setFormError] = useState<ProfileFormError | null>(null)
  const nicknameInputRef = useRef<HTMLInputElement>(null)
  const updateMutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (updatedUser) => {
      setNickname(updatedUser.nickname)
      setFormError(null)
      queryClient.setQueryData(currentUserQueryKey, updatedUser)
    },
    onError: (error) => {
      if (isAuthenticationError(error)) {
        queryClient.setQueryData(currentUserQueryKey, null)
      }
    },
  })
  const formErrorMessage = formError ? copy[formError] : null
  const hasChanges = nickname.trim() !== currentUser.nickname
  const isSubmitting = updateMutation.isPending
  const mutationError =
    updateMutation.isError && !isAuthenticationError(updateMutation.error)
      ? copy.saveError
      : null

  function clearFeedback() {
    if (updateMutation.isError || updateMutation.isSuccess) {
      updateMutation.reset()
    }

    setFormError(null)
  }

  const handleSubmit: FormSubmitHandler = (event) => {
    event.preventDefault()

    const validation = validateProfileForm(new FormData(event.currentTarget))

    clearFeedback()

    if (!validation.ok) {
      setFormError(validation.error)
      requestAnimationFrame(() => nicknameInputRef.current?.focus())
      return
    }

    updateMutation.mutate(validation.request)
  }

  return (
    <Section padding={4} width="100%">
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={2}>{copy.accountInformation}</Heading>
          <Text type="supporting" color="secondary">
            {copy.accountDescription}
          </Text>
        </VStack>

        <form noValidate onSubmit={handleSubmit}>
          <VStack gap={4}>
            {mutationError ? (
              <Banner status="error" title={mutationError} />
            ) : null}

            {updateMutation.isSuccess ? (
              <Banner status="success" title={copy.saveSuccess} />
            ) : null}

            <FormLayout direction="horizontal-labels">
              <TextInput
                label={copy.emailLabel}
                htmlName="email"
                type="email"
                value={currentUser.email}
                disabledMessage={copy.emailReadOnly}
                isDisabled
                autoComplete="email"
              />

              <TextInput
                ref={nicknameInputRef}
                label={copy.nicknameLabel}
                htmlName="nickname"
                type="text"
                value={nickname}
                onChange={(nextNickname) => {
                  setNickname(nextNickname)
                  clearFeedback()
                }}
                description={copy.nicknameDescription}
                required
                isDisabled={isSubmitting}
                {...(formErrorMessage
                  ? {
                      status: {
                        type: 'error' as const,
                        message: formErrorMessage,
                      },
                    }
                  : {})}
                autoComplete="username"
              />
            </FormLayout>

            <HStack hAlign="end">
              <Button
                label={isSubmitting ? copy.saving : copy.save}
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                isDisabled={isSubmitting || !hasChanges}
                {...(!hasChanges ? { tooltip: copy.noChanges } : {})}
              />
            </HStack>
          </VStack>
        </form>
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
