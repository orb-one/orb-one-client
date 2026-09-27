import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { Field } from '@astryxdesign/core/Field'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { Selector } from '@astryxdesign/core/Selector'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { FilePlus2 } from 'lucide-react'
import { lazy, Suspense, useRef, useState, type ComponentProps } from 'react'

import { AuthSessionExpiredError } from '@/lib/api/client'
import { PageBackLink } from '@/components/navigation/page-back-link'
import type { SolutionCodeEditorHandle } from '@/components/solutions/solution-code-editor'
import { SolutionMarkdownEditor } from '@/components/solutions/solution-markdown-editor'
import { ProblemPickerDialog } from '@/components/problems/problem-picker-dialog'
import { problemQueryOptions } from '@/lib/problems/problem-queries'
import type { Problem } from '@/lib/problems/problem-model'
import {
  validateSolutionCreateForm,
  type SolutionCreateFormError,
} from '@/lib/solutions/solution-create-validation'
import { useCreateSolution } from '@/lib/solutions/solution-mutations'
import { useI18n } from '@/lib/i18n/use-translations'

const SolutionCodeEditor = lazy(() =>
  import('@/components/solutions/solution-code-editor').then(
    ({ SolutionCodeEditor }) => ({
      default: SolutionCodeEditor,
    }),
  ),
)

export const Route = createFileRoute('/solutions_/new')({
  validateSearch: normalizeSolutionCreateSearch,
  component: SolutionCreatePage,
})

export function normalizeSolutionCreateSearch(search: Record<string, unknown>) {
  const problemId =
    typeof search.problemId === 'string' ? search.problemId.trim() : ''

  return problemId ? { problemId } : {}
}

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

export function SolutionCreatePage() {
  const { t } = useI18n()
  const copy = t.solutions.create
  const navigate = Route.useNavigate()
  const { problemId: initialProblemId } = Route.useSearch()
  const [selectedProblemOverride, setSelectedProblemOverride] =
    useState<Problem | null>(null)
  const [isProblemPickerOpen, setIsProblemPickerOpen] = useState(false)
  const [language, setLanguage] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [isSolved, setIsSolved] = useState(false)
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null)
  const [timeElapsed, setTimeElapsed] = useState<number | null>(null)
  const [memoryUsageInput, setMemoryUsageInput] = useState('')
  const [timeElapsedInput, setTimeElapsedInput] = useState('')
  const [formError, setFormError] = useState<SolutionCreateFormError | null>(
    null,
  )
  const problemPickerTriggerRef = useRef<HTMLButtonElement>(null)
  const codeInputRef = useRef<SolutionCodeEditorHandle>(null)
  const memoryUsageInputRef = useRef<HTMLInputElement>(null)
  const timeElapsedInputRef = useRef<HTMLInputElement>(null)
  const createMutation = useCreateSolution()
  const initialProblemQuery = useQuery({
    ...problemQueryOptions(initialProblemId ?? ''),
    enabled: Boolean(initialProblemId),
  })
  const selectedProblem =
    selectedProblemOverride ?? initialProblemQuery.data ?? null
  const isSubmitting = createMutation.isPending
  const isInitialProblemPending =
    Boolean(initialProblemId) &&
    !selectedProblemOverride &&
    initialProblemQuery.isPending
  const formErrorMessage = formError ? copy[formError] : null
  const isAuthRequired = createMutation.error instanceof AuthSessionExpiredError
  const problemFieldError =
    formError === 'problemIdRequired' && formErrorMessage
      ? formErrorMessage
      : initialProblemQuery.isError && !selectedProblemOverride
        ? copy.problemPrefillError
        : null

  function resetFeedback() {
    createMutation.reset()
    setFormError(null)
  }

  function clearFeedback(...errors: SolutionCreateFormError[]) {
    if (createMutation.isError) {
      createMutation.reset()
    }

    setFormError((currentError) =>
      currentError && errors.includes(currentError) ? null : currentError,
    )
  }

  function focusInvalidField(error: SolutionCreateFormError) {
    const inputRef = {
      problemIdRequired: problemPickerTriggerRef,
      languageRequired: null,
      codeRequired: codeInputRef,
      memoryUsageInvalid: memoryUsageInputRef,
      timeElapsedInvalid: timeElapsedInputRef,
    }[error]

    inputRef?.current?.focus()
  }

  function selectProblem(problem: Problem) {
    setSelectedProblemOverride(problem)
    clearFeedback('problemIdRequired')
  }

  const handleSubmit: FormSubmitHandler = (event) => {
    event.preventDefault()

    if (isSubmitting || isInitialProblemPending) {
      return
    }

    const validation = validateSolutionCreateForm(
      new FormData(event.currentTarget),
      {
        description,
        isSolved,
        memoryUsage: memoryUsageInput,
        timeElapsed: timeElapsedInput,
      },
    )

    resetFeedback()

    if (!validation.ok) {
      setFormError(validation.error)
      requestAnimationFrame(() => {
        focusInvalidField(validation.error)
      })
      return
    }

    createMutation.mutate(validation.request, {
      onSuccess: ({ id }) => {
        void navigate({
          to: '/solutions/$solutionId',
          params: { solutionId: id },
        })
      },
    })
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
        <VStack gap={2} maxWidth={672}>
          <PageBackLink href="/solutions" label={copy.backToList} />
          <Heading level={1}>{copy.title}</Heading>
          <Text type="body" color="secondary">
            {copy.description}
          </Text>
        </VStack>

        <form noValidate onSubmit={handleSubmit}>
          <VStack gap={5} hAlign="stretch">
            {createMutation.isError ? (
              <Banner
                status={isAuthRequired ? 'info' : 'error'}
                title={isAuthRequired ? copy.authRequired : copy.genericError}
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
              <Field
                label={`${copy.problemLabel} (${copy.requiredLabel})`}
                inputID="solution-problem-picker"
                description={copy.problemSelectionDescription}
                {...(problemFieldError
                  ? {
                      status: {
                        type: 'error' as const,
                        message: problemFieldError,
                      },
                    }
                  : {})}
              >
                <input
                  id="solution-problem-id"
                  type="hidden"
                  name="problemId"
                  value={selectedProblem?.id ?? ''}
                />
                {selectedProblem ? (
                  <HStack
                    width="100%"
                    gap={3}
                    hAlign="between"
                    vAlign="center"
                    wrap="wrap"
                  >
                    <VStack gap={1}>
                      <Text type="label">{selectedProblem.name}</Text>
                      <Text type="supporting" color="secondary">
                        {selectedProblem.provider} {selectedProblem.externalId}
                        {selectedProblem.difficulty
                          ? ` · ${selectedProblem.difficulty}`
                          : ''}
                      </Text>
                    </VStack>
                    <Button
                      ref={problemPickerTriggerRef}
                      id="solution-problem-picker"
                      label={copy.problemChange}
                      aria-label={copy.problemChange}
                      aria-describedby={`solution-problem-picker-desc${problemFieldError ? ' solution-problem-picker-status' : ''}`}
                      aria-invalid={problemFieldError ? 'true' : undefined}
                      variant="secondary"
                      isDisabled={isSubmitting}
                      onClick={() => {
                        setIsProblemPickerOpen(true)
                      }}
                    />
                  </HStack>
                ) : (
                  <Button
                    ref={problemPickerTriggerRef}
                    id="solution-problem-picker"
                    label={
                      isInitialProblemPending
                        ? copy.problemPrefillLoading
                        : copy.problemSelect
                    }
                    variant="secondary"
                    size="lg"
                    aria-label={copy.problemSelect}
                    aria-describedby={`solution-problem-picker-desc${problemFieldError ? ' solution-problem-picker-status' : ''}`}
                    aria-invalid={problemFieldError ? 'true' : undefined}
                    isLoading={isInitialProblemPending}
                    isDisabled={isSubmitting || isInitialProblemPending}
                    onClick={() => {
                      setIsProblemPickerOpen(true)
                    }}
                    className="w-full"
                  />
                )}
              </Field>

              <Selector
                label={`${copy.languageLabel} (${copy.requiredLabel})`}
                htmlName="language"
                value={language}
                onChange={(nextLanguage) => {
                  setLanguage(nextLanguage)
                  clearFeedback('languageRequired')
                }}
                options={languageOptions}
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
                  label={`${copy.codeLabel} (${copy.requiredLabel})`}
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
                label={`${copy.solutionDescriptionLabel} (${copy.optionalLabel})`}
                value={description}
                onChange={(nextDescription) => {
                  setDescription(nextDescription)
                  clearFeedback()
                }}
                description={copy.solutionDescriptionDescription}
                placeholder={copy.solutionDescriptionPlaceholder}
                editLabel={copy.solutionDescriptionEdit}
                previewLabel={copy.solutionDescriptionPreview}
                modeLabel={copy.solutionDescriptionModeLabel}
                emptyPreview={copy.solutionDescriptionPreviewEmpty}
                isDisabled={isSubmitting}
              />

              <CheckboxInput
                label={copy.solvedLabel}
                description={copy.solvedDescription}
                value={isSolved}
                onChange={(nextValue) => {
                  setIsSolved(nextValue)
                  clearFeedback()
                }}
                isDisabled={isSubmitting}
              />

              <FormLayout direction="horizontal">
                <NumberInput
                  ref={memoryUsageInputRef}
                  label={`${copy.memoryUsageLabel} (${copy.optionalLabel})`}
                  htmlName="memoryUsage"
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
                    setMemoryUsageInput(
                      (event.currentTarget as HTMLInputElement).value,
                    )
                    clearFeedback('memoryUsageInvalid')
                  }}
                  min={0}
                  max={2_147_483_647}
                  units="KB"
                  isIntegerOnly
                  hasClear
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
                  label={`${copy.timeElapsedLabel} (${copy.optionalLabel})`}
                  htmlName="timeElapsed"
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
                    setTimeElapsedInput(
                      (event.currentTarget as HTMLInputElement).value,
                    )
                    clearFeedback('timeElapsedInvalid')
                  }}
                  min={0}
                  max={2_147_483_647}
                  units="ms"
                  isIntegerOnly
                  hasClear
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
              isDisabled={isSubmitting || isInitialProblemPending}
              icon={<Icon icon={FilePlus2} color="inherit" />}
              className="w-full"
            />
          </VStack>
        </form>

        <ProblemPickerDialog
          isOpen={isProblemPickerOpen}
          onOpenChange={setIsProblemPickerOpen}
          selectedProblem={selectedProblem}
          onSelect={selectProblem}
        />
      </VStack>
    </Center>
  )
}
