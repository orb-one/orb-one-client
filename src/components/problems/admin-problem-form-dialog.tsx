import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Grid } from '@astryxdesign/core/Grid'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Selector } from '@astryxdesign/core/Selector'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useState, type SyntheticEvent } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

import type { AdminProblemRequest } from '@/lib/api/problems'
import { useTranslations } from '@/lib/i18n/use-translations'
import { problemProviders, type Problem } from '@/lib/problems/problem-model'

interface FormValues {
  provider: string
  externalProblemId: string
  name: string
  url: string
  difficulty: string
}

interface AdminProblemFormDialogProps {
  problem: Problem | null
  isSubmitting: boolean
  errorMessage: string | null
  onClose: () => void
  onSubmit: (request: AdminProblemRequest) => void
}

export function AdminProblemFormDialog({
  problem,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: AdminProblemFormDialogProps) {
  const copy = useTranslations().adminProblems
  const [store] = useState(() =>
    createStore<{ values: FormValues; attempted: boolean }>(() => ({
      values: {
        provider: problem?.provider ?? '',
        externalProblemId: problem?.externalId ?? '',
        name: problem?.name ?? '',
        url: problem?.url ?? '',
        difficulty: problem?.difficulty ?? '',
      },
      attempted: false,
    })),
  )
  const { values, attempted } = useStore(store)
  const required = (value: string) =>
    attempted && !value.trim()
      ? { status: { type: 'error' as const, message: copy.required } }
      : {}
  const textStatus = (value: string, max: number, isRequired = false) => {
    if (value.length > max) {
      return {
        status: {
          type: 'error' as const,
          message: copy.tooLong.replace('{max}', String(max)),
        },
      }
    }
    return isRequired ? required(value) : {}
  }

  function setValue(field: keyof FormValues, value: string) {
    store.setState((state) => ({ values: { ...state.values, [field]: value } }))
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    store.setState({ attempted: true })
    const provider = problemProviders.find((item) => item === values.provider)
    if (
      !provider ||
      !values.externalProblemId.trim() ||
      !values.name.trim() ||
      values.externalProblemId.length > 128 ||
      values.name.length > 100 ||
      values.url.length > 500 ||
      values.difficulty.length > 32
    )
      return

    onSubmit({
      provider,
      externalProblemId: values.externalProblemId.trim(),
      name: values.name.trim(),
      url: values.url.trim() || null,
      difficulty: values.difficulty.trim() || null,
    })
  }

  function handleOpenChange(open: boolean) {
    if (!open && !isSubmitting) onClose()
  }

  return (
    <Dialog
      isOpen
      onOpenChange={handleOpenChange}
      purpose="form"
      width={560}
      maxHeight="calc(100dvh - 2rem)"
      aria-label={problem ? copy.editTitle : copy.create}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex min-h-0 flex-1 flex-col"
      >
        <Layout
          height="auto"
          defaultHasDividers
          header={
            <DialogHeader
              title={problem ? copy.editTitle : copy.create}
              onOpenChange={handleOpenChange}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={4} width="100%">
                {errorMessage ? (
                  <Banner status="error" title={errorMessage} />
                ) : null}
                <FormLayout>
                  <Grid columns={{ minWidth: 200, max: 2 }} gap={4}>
                    <Selector
                      label={copy.provider}
                      options={[...problemProviders]}
                      value={values.provider}
                      onChange={(value) => {
                        setValue('provider', value)
                      }}
                      placeholder={copy.providerPlaceholder}
                      isRequired
                      isDisabled={isSubmitting}
                      {...required(values.provider)}
                    />
                    <TextInput
                      label={copy.externalId}
                      value={values.externalProblemId}
                      onChange={(value) => {
                        setValue('externalProblemId', value)
                      }}
                      placeholder={copy.externalIdPlaceholder}
                      isRequired
                      isDisabled={isSubmitting}
                      {...textStatus(values.externalProblemId, 128, true)}
                    />
                  </Grid>
                  <TextInput
                    label={copy.name}
                    value={values.name}
                    onChange={(value) => {
                      setValue('name', value)
                    }}
                    placeholder={copy.namePlaceholder}
                    isRequired
                    isDisabled={isSubmitting}
                    {...textStatus(values.name, 100, true)}
                  />
                  <TextInput
                    label={copy.url}
                    value={values.url}
                    onChange={(value) => {
                      setValue('url', value)
                    }}
                    placeholder="https://..."
                    isOptional
                    isDisabled={isSubmitting}
                    {...textStatus(values.url, 500)}
                  />
                  <TextInput
                    label={copy.difficulty}
                    value={values.difficulty}
                    onChange={(value) => {
                      setValue('difficulty', value)
                    }}
                    description={copy.difficultyHint}
                    isOptional
                    isDisabled={isSubmitting}
                    {...textStatus(values.difficulty, 32)}
                  />
                </FormLayout>
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button
                  label={copy.cancel}
                  variant="secondary"
                  isDisabled={isSubmitting}
                  onClick={onClose}
                />
                <Button
                  label={problem ? copy.save : copy.create}
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </form>
    </Dialog>
  )
}
