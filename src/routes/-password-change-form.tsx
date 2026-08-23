import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Section } from '@astryxdesign/core/Section'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState, type ComponentProps } from 'react'

import { changeCurrentUserPassword } from '@/lib/api/auth'
import { ApiError, AuthSessionExpiredError } from '@/lib/api/client'
import {
  PASSWORD_CHANGE_MIN_LENGTH,
  validatePasswordChangeForm,
  type PasswordChangeField,
  type PasswordChangeFormError,
} from '@/lib/auth/password-change-validation'
import { useTranslations } from '@/lib/i18n/use-translations'

type FormSubmitHandler = NonNullable<ComponentProps<'form'>['onSubmit']>

interface PasswordChangeFormProps {
  onPasswordChanged: () => void | Promise<void>
  onSessionExpired: () => void
}

export function PasswordChangeForm({
  onPasswordChanged,
  onSessionExpired,
}: PasswordChangeFormProps) {
  const copy = useTranslations().mypage
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [passwordChangeCompleted, setPasswordChangeCompleted] = useState(false)
  const [formError, setFormError] = useState<{
    error: PasswordChangeFormError
    field: PasswordChangeField
  } | null>(null)
  const currentPasswordInputRef = useRef<HTMLInputElement>(null)
  const newPasswordInputRef = useRef<HTMLInputElement>(null)
  const newPasswordConfirmInputRef = useRef<HTMLInputElement>(null)
  const signOutMutation = useMutation({
    mutationFn: async () => Promise.resolve(onPasswordChanged()),
  })
  const changeMutation = useMutation({
    mutationFn: changeCurrentUserPassword,
    onSuccess: () => {
      setPasswordChangeCompleted(true)
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
      signOutMutation.mutate()
    },
    onError: (error) => {
      if (isSessionExpiredError(error)) {
        onSessionExpired()
        return
      }

      if (isInvalidCurrentPasswordError(error)) {
        requestAnimationFrame(() => currentPasswordInputRef.current?.focus())
      }
    },
  })
  const isSubmitting = changeMutation.isPending || signOutMutation.isPending
  const invalidCurrentPassword =
    changeMutation.isError &&
    isInvalidCurrentPasswordError(changeMutation.error)
  const logoutError = signOutMutation.isError
  const genericMutationError =
    changeMutation.isError &&
    !invalidCurrentPassword &&
    !isSessionExpiredError(changeMutation.error)

  function clearFeedback() {
    if (changeMutation.isError || changeMutation.isSuccess) {
      changeMutation.reset()
    }

    setFormError(null)
  }

  function focusField(field: PasswordChangeField) {
    const inputRefs = {
      currentPassword: currentPasswordInputRef,
      newPassword: newPasswordInputRef,
      newPasswordConfirm: newPasswordConfirmInputRef,
    }

    requestAnimationFrame(() => inputRefs[field].current?.focus())
  }

  const handleSubmit: FormSubmitHandler = (event) => {
    event.preventDefault()

    const validation = validatePasswordChangeForm(
      new FormData(event.currentTarget),
    )

    clearFeedback()

    if (!validation.ok) {
      setFormError({ error: validation.error, field: validation.field })
      focusField(validation.field)
      return
    }

    changeMutation.mutate(validation.request)
  }

  function fieldStatus(field: PasswordChangeField) {
    if (field === 'currentPassword' && invalidCurrentPassword) {
      return {
        type: 'error' as const,
        message: copy.currentPasswordIncorrect,
      }
    }

    if (formError?.field !== field) {
      return undefined
    }

    return {
      type: 'error' as const,
      message: copy[formError.error],
    }
  }

  const currentPasswordStatus = fieldStatus('currentPassword')
  const newPasswordStatus = fieldStatus('newPassword')
  const newPasswordConfirmStatus = fieldStatus('newPasswordConfirm')

  return (
    <Section padding={4} width="100%">
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={2}>{copy.passwordInformation}</Heading>
          <Text type="supporting" color="secondary">
            {copy.passwordDescription}
          </Text>
        </VStack>

        <form noValidate onSubmit={handleSubmit}>
          <VStack gap={4}>
            {genericMutationError ? (
              <Banner status="error" title={copy.passwordChangeError} />
            ) : null}

            {logoutError ? (
              <Banner
                status="error"
                title={copy.passwordChangedLogoutError}
                endContent={
                  <Button
                    label={copy.passwordChangeLogoutRetry}
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      signOutMutation.mutate()
                    }}
                  />
                }
              />
            ) : null}

            {signOutMutation.isSuccess ? (
              <Banner status="success" title={copy.passwordChangeSuccess} />
            ) : null}

            <FormLayout direction="horizontal-labels">
              <TextInput
                ref={currentPasswordInputRef}
                label={copy.currentPasswordLabel}
                htmlName="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(value) => {
                  setCurrentPassword(value)
                  clearFeedback()
                }}
                required
                isDisabled={isSubmitting || passwordChangeCompleted}
                {...(currentPasswordStatus
                  ? { status: currentPasswordStatus }
                  : {})}
                autoComplete="current-password"
              />

              <TextInput
                ref={newPasswordInputRef}
                label={copy.newPasswordLabel}
                htmlName="newPassword"
                type="password"
                value={newPassword}
                onChange={(value) => {
                  setNewPassword(value)
                  clearFeedback()
                }}
                description={copy.newPasswordDescription}
                required
                minLength={PASSWORD_CHANGE_MIN_LENGTH}
                isDisabled={isSubmitting || passwordChangeCompleted}
                {...(newPasswordStatus ? { status: newPasswordStatus } : {})}
                autoComplete="new-password"
              />

              <TextInput
                ref={newPasswordConfirmInputRef}
                label={copy.newPasswordConfirmLabel}
                htmlName="newPasswordConfirm"
                type="password"
                value={newPasswordConfirm}
                onChange={(value) => {
                  setNewPasswordConfirm(value)
                  clearFeedback()
                }}
                required
                isDisabled={isSubmitting || passwordChangeCompleted}
                {...(newPasswordConfirmStatus
                  ? { status: newPasswordConfirmStatus }
                  : {})}
                autoComplete="new-password"
              />
            </FormLayout>

            <HStack hAlign="end">
              <Button
                label={
                  signOutMutation.isPending
                    ? copy.passwordChangeSigningOut
                    : changeMutation.isPending
                      ? copy.passwordChanging
                      : copy.passwordChangeSubmit
                }
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                isDisabled={isSubmitting || passwordChangeCompleted}
              />
            </HStack>
          </VStack>
        </form>
      </VStack>
    </Section>
  )
}

function isInvalidCurrentPasswordError(error: unknown) {
  return error instanceof ApiError && error.code === 'INVALID_CREDENTIALS'
}

function isSessionExpiredError(error: unknown) {
  return (
    error instanceof AuthSessionExpiredError ||
    (error instanceof ApiError &&
      error.status === 401 &&
      error.code === 'UNAUTHENTICATED')
  )
}
