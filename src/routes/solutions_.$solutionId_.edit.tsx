import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { Selector } from '@astryxdesign/core/Selector'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { VStack } from '@astryxdesign/core/VStack'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Save } from 'lucide-react'
import { lazy, Suspense, useRef, useState, type ComponentProps } from 'react'

import type { SolutionCodeEditorHandle } from '@/components/solutions/solution-code-editor'
import { SolutionMarkdownEditor } from '@/components/solutions/solution-markdown-editor'
import { ApiError, AuthSessionExpiredError } from '@/lib/api/client'
import { currentUserQueryOptions } from '@/lib/auth/auth-queries'
import { useI18n } from '@/lib/i18n/use-translations'
import type { SolutionDetail } from '@/lib/solutions/solution-model'
import { useUpdateSolution } from '@/lib/solutions/solution-mutations'
import { solutionQueryOptions } from '@/lib/solutions/solution-queries'
import {
  validateSolutionUpdateForm,
  type SolutionUpdateFormError,
} from '@/lib/solutions/solution-update-validation'

const SolutionCodeEditor = lazy(() =>
  import('@/components/solutions/solution-code-editor').then(
    ({ SolutionCodeEditor }) => ({
      default: SolutionCodeEditor,
    }),
  ),
)

export const Route = createFileRoute('/solutions_/$solutionId_/edit')({
  component: SolutionEditRoute,
})

type FormSubmitHandler = NonNullable<ComponentProps<'form'>['onSubmit']>

const languageOptions = [
  'C',
  'C++',
  'C#',
  'Dart',
  'Go',
  'Java',
  'JavaScript',
  'Kotlin',
  'Python',
  'R',
  'Ruby',
  'Rust',
  'Scala',
  'Swift',
  'TypeScript',
].map((language) => ({ value: language, label: language }))

function SolutionEditRoute() {
  const { solutionId } = Route.useParams()

  return <SolutionEditPage solutionId={solutionId} />
}

export function SolutionEditPage({ solutionId }: SolutionEditPageProps) {
  const { t } = useI18n()
  const copy = t.solutions.edit
  const solutionQuery = useQuery(solutionQueryOptions(solutionId))
  const currentUserQuery = useQuery(currentUserQueryOptions())
  const isPending = solutionQuery.isPending || currentUserQuery.isPending
  const isAuthRequired =
    solutionQuery.error instanceof AuthSessionExpiredError ||
    currentUserQuery.error instanceof AuthSessionExpiredError ||
    currentUserQuery.data === null
  const isNotFound =
    solutionQuery.error instanceof ApiError &&
    solutionQuery.error.status === 404

  function retryQueries() {
    void Promise.all([solutionQuery.refetch(), currentUserQuery.refetch()])
  }

  return (
    <Center width="100%">
      <VStack
        width="100%"
        maxWidth={1120}
        gap={5}
        paddingInline={4}
        paddingBlock={10}
      >
        <Link href={`/solutions/${solutionId}`} isStandalone>
          {copy.backToDetail}
        </Link>

        {isPending ? (
          <SolutionEditSkeleton label={copy.loading} />
        ) : solutionQuery.isError || currentUserQuery.isError ? (
          <Banner
            status={isAuthRequired ? 'info' : 'error'}
            title={
              isAuthRequired
                ? copy.authRequired
                : isNotFound
                  ? copy.notFound
                  : copy.loadError
            }
            {...(isAuthRequired
              ? {
                  endContent: (
                    <Button
                      label={t.solutions.login}
                      href="/login"
                      size="sm"
                      variant="secondary"
                    />
                  ),
                }
              : !isNotFound
                ? {
                    endContent: (
                      <Button
                        label={copy.retry}
                        size="sm"
                        variant="secondary"
                        onClick={retryQueries}
                      />
                    ),
                  }
                : {})}
          />
        ) : currentUserQuery.data === null ? (
          <Banner
            status="info"
            title={copy.authRequired}
            endContent={
              <Button
                label={t.solutions.login}
                href="/login"
                size="sm"
                variant="secondary"
              />
            }
          />
        ) : solutionQuery.data.userId !== currentUserQuery.data.id ? (
          <Banner status="error" title={copy.forbidden} />
        ) : (
          <SolutionEditForm
            key={solutionQuery.data.id}
            solution={solutionQuery.data}
          />
        )}
      </VStack>
    </Center>
  )
}

function SolutionEditForm({ solution }: { solution: SolutionDetail }) {
  const { t } = useI18n()
  const copy = t.solutions.edit
  const navigate = Route.useNavigate()
  const [language, setLanguage] = useState(solution.language ?? '')
  const [code, setCode] = useState(solution.code)
  const [description, setDescription] = useState(solution.description)
  const [isSolved, setIsSolved] = useState(solution.isSolved)
  const [memoryUsage, setMemoryUsage] = useState(solution.memoryUsage)
  const [timeElapsed, setTimeElapsed] = useState(solution.timeElapsed)
  const [memoryUsageInput, setMemoryUsageInput] = useState(
    solution.memoryUsage === null ? '' : String(solution.memoryUsage),
  )
  const [timeElapsedInput, setTimeElapsedInput] = useState(
    solution.timeElapsed === null ? '' : String(solution.timeElapsed),
  )
  const [formError, setFormError] = useState<SolutionUpdateFormError | null>(
    null,
  )
  const codeInputRef = useRef<SolutionCodeEditorHandle>(null)
  const memoryUsageInputRef = useRef<HTMLInputElement>(null)
  const timeElapsedInputRef = useRef<HTMLInputElement>(null)
  const updateMutation = useUpdateSolution(solution.id)
  const selectableLanguageOptions = getLanguageOptions(solution.language)
  const isSubmitting = updateMutation.isPending
  const formErrorMessage = formError ? copy[formError] : null
  const isAuthRequired = updateMutation.error instanceof AuthSessionExpiredError
  const isForbidden =
    updateMutation.error instanceof ApiError &&
    updateMutation.error.status === 403
  const isNotFound =
    updateMutation.error instanceof ApiError &&
    updateMutation.error.status === 404

  function resetFeedback() {
    if (updateMutation.isError) {
      updateMutation.reset()
    }

    setFormError(null)
  }

  function clearFeedback(...errors: SolutionUpdateFormError[]) {
    if (updateMutation.isError) {
      updateMutation.reset()
    }

    setFormError((currentError) =>
      currentError && errors.includes(currentError) ? null : currentError,
    )
  }

  function focusInvalidField(error: SolutionUpdateFormError) {
    const inputRef = {
      languageRequired: null,
      codeRequired: codeInputRef,
      memoryUsageInvalid: memoryUsageInputRef,
      timeElapsedInvalid: timeElapsedInputRef,
    }[error]

    inputRef?.current?.focus()
  }

  const handleSubmit: FormSubmitHandler = (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const validation = validateSolutionUpdateForm({
      language,
      code,
      description,
      isSolved,
      isDraft: solution.isDraft,
      memoryUsage,
      timeElapsed,
      memoryUsageInput,
      timeElapsedInput,
    })

    resetFeedback()

    if (!validation.ok) {
      setFormError(validation.error)
      requestAnimationFrame(() => {
        focusInvalidField(validation.error)
      })
      return
    }

    updateMutation.mutate(validation.request, {
      onSuccess: () => {
        void navigate({
          to: '/solutions/$solutionId',
          params: { solutionId: solution.id },
        })
      },
    })
  }

  const mutationErrorMessage = isAuthRequired
    ? copy.authRequired
    : isForbidden
      ? copy.forbiddenError
      : isNotFound
        ? copy.notFoundError
        : copy.genericError

  return (
    <VStack gap={5} width="100%">
      <VStack gap={2} maxWidth={672}>
        <Heading level={1}>{copy.title}</Heading>
        <Text type="body" color="secondary">
          {copy.description}
        </Text>
      </VStack>

      <form noValidate onSubmit={handleSubmit}>
        <VStack gap={5} hAlign="stretch">
          {updateMutation.isError ? (
            <Banner
              status={isAuthRequired ? 'info' : 'error'}
              title={mutationErrorMessage}
              endContent={
                isAuthRequired ? (
                  <Button
                    label={t.solutions.login}
                    href="/login"
                    size="sm"
                    variant="secondary"
                  />
                ) : undefined
              }
            />
          ) : null}

          <FormLayout>
            <Selector
              label={copy.languageLabel}
              value={language}
              onChange={(nextLanguage) => {
                setLanguage(nextLanguage)
                clearFeedback('languageRequired')
              }}
              options={selectableLanguageOptions}
              placeholder={copy.languagePlaceholder}
              isDisabled={isSubmitting}
              size="lg"
              {...(formError === 'languageRequired' && formErrorMessage
                ? {
                    status: {
                      type: 'error' as const,
                      message: formErrorMessage,
                    },
                  }
                : {})}
            />

            <Suspense
              fallback={<Skeleton width="100%" height={384} radius={3} />}
            >
              <SolutionCodeEditor
                ref={codeInputRef}
                label={copy.codeLabel}
                htmlName="code"
                value={code}
                language={language}
                onChange={(nextCode) => {
                  setCode(nextCode)
                  clearFeedback('codeRequired')
                }}
                placeholder={copy.codePlaceholder}
                description={copy.codeDescription}
                isDisabled={isSubmitting}
                {...(formError === 'codeRequired' && formErrorMessage
                  ? {
                      status: {
                        type: 'error' as const,
                        message: formErrorMessage,
                      },
                    }
                  : {})}
              />
            </Suspense>

            <SolutionMarkdownEditor
              label={`${copy.descriptionLabel} (${copy.optionalLabel})`}
              value={description}
              onChange={(nextDescription) => {
                setDescription(nextDescription)
                clearFeedback()
              }}
              description={copy.descriptionDescription}
              placeholder={copy.descriptionPlaceholder}
              editLabel={copy.descriptionEdit}
              previewLabel={copy.descriptionPreview}
              modeLabel={copy.descriptionModeLabel}
              emptyPreview={copy.descriptionPreviewEmpty}
              isDisabled={isSubmitting}
            />

            <CheckboxInput
              label={copy.solvedLabel}
              description={copy.solvedDescription}
              value={isSolved ?? false}
              onChange={(nextValue) => {
                setIsSolved(nextValue)
                clearFeedback()
              }}
              isDisabled={isSubmitting}
            />

            <FormLayout direction="horizontal">
              <NumberInput
                ref={memoryUsageInputRef}
                label={copy.memoryUsageLabel}
                description={copy.memoryUsageDescription}
                value={memoryUsage}
                onChange={(nextValue) => {
                  setMemoryUsage(nextValue)
                  setMemoryUsageInput(
                    nextValue === null ? '' : String(nextValue),
                  )
                  clearFeedback('memoryUsageInvalid')
                }}
                onInput={(event) => {
                  const inputElement = event.currentTarget as HTMLInputElement
                  const input = inputElement.value
                  const parsedValue = Number(input)

                  setMemoryUsageInput(
                    getNumberInputValidationValue(inputElement),
                  )
                  if (!input.trim() || !Number.isFinite(parsedValue)) {
                    setMemoryUsage(null)
                  } else {
                    setMemoryUsage(parsedValue)
                  }
                  clearFeedback('memoryUsageInvalid')
                }}
                min={-2_147_483_648}
                max={2_147_483_647}
                units="KB"
                isIntegerOnly
                hasClear
                isOptional
                isDisabled={isSubmitting}
                size="lg"
                {...(formError === 'memoryUsageInvalid' && formErrorMessage
                  ? {
                      status: {
                        type: 'error' as const,
                        message: formErrorMessage,
                      },
                    }
                  : {})}
              />
              <NumberInput
                ref={timeElapsedInputRef}
                label={copy.timeElapsedLabel}
                description={copy.timeElapsedDescription}
                value={timeElapsed}
                onChange={(nextValue) => {
                  setTimeElapsed(nextValue)
                  setTimeElapsedInput(
                    nextValue === null ? '' : String(nextValue),
                  )
                  clearFeedback('timeElapsedInvalid')
                }}
                onInput={(event) => {
                  const inputElement = event.currentTarget as HTMLInputElement
                  const input = inputElement.value
                  const parsedValue = Number(input)

                  setTimeElapsedInput(
                    getNumberInputValidationValue(inputElement),
                  )
                  if (!input.trim() || !Number.isFinite(parsedValue)) {
                    setTimeElapsed(null)
                  } else {
                    setTimeElapsed(parsedValue)
                  }
                  clearFeedback('timeElapsedInvalid')
                }}
                min={-2_147_483_648}
                max={2_147_483_647}
                units="ms"
                isIntegerOnly
                hasClear
                isOptional
                isDisabled={isSubmitting}
                size="lg"
                {...(formError === 'timeElapsedInvalid' && formErrorMessage
                  ? {
                      status: {
                        type: 'error' as const,
                        message: formErrorMessage,
                      },
                    }
                  : {})}
              />
            </FormLayout>
          </FormLayout>

          <Button
            label={isSubmitting ? copy.submitting : copy.submit}
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            isDisabled={isSubmitting}
            icon={<Icon icon={Save} color="inherit" />}
            className="w-full"
          />
        </VStack>
      </form>
    </VStack>
  )
}

function SolutionEditSkeleton({ label }: { label: string }) {
  return (
    <VStack role="status" aria-live="polite" gap={4} width="100%">
      <VisuallyHidden>{label}</VisuallyHidden>
      <Skeleton width="45%" height={36} radius={2} />
      <Skeleton width="100%" height={480} radius={3} index={1} />
    </VStack>
  )
}

interface SolutionEditPageProps {
  solutionId: string
}

/**
 * Preserves native bad-input state because number inputs expose its value as
 * an empty string, which would otherwise be indistinguishable from clearing.
 */
function getNumberInputValidationValue(input: HTMLInputElement) {
  return input.validity.badInput ? String(Number.NaN) : input.value
}

function getLanguageOptions(currentLanguage: string | null) {
  if (
    !currentLanguage ||
    languageOptions.some((option) => option.value === currentLanguage)
  ) {
    return languageOptions
  }

  return [
    { value: currentLanguage, label: currentLanguage },
    ...languageOptions,
  ]
}
