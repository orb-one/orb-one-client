import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { Selector } from '@astryxdesign/core/Selector'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { createFileRoute } from '@tanstack/react-router'
import { FilePlus2, Hash } from 'lucide-react'
import { lazy, Suspense, useRef, useState, type ComponentProps } from 'react'

import { AuthSessionExpiredError } from '@/lib/api/client'
import type { SolutionCodeEditorHandle } from '@/components/solutions/solution-code-editor'
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
  component: SolutionCreatePage,
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

export function SolutionCreatePage() {
  const { t } = useI18n()
  const copy = t.solutions.create
  const navigate = Route.useNavigate()
  const [problemId, setProblemId] = useState('')
  const [language, setLanguage] = useState('')
  const [code, setCode] = useState('')
  const [formError, setFormError] = useState<SolutionCreateFormError | null>(
    null,
  )
  const problemIdInputRef = useRef<HTMLInputElement>(null)
  const codeInputRef = useRef<SolutionCodeEditorHandle>(null)
  const createMutation = useCreateSolution()
  const isSubmitting = createMutation.isPending
  const formErrorMessage = formError ? copy[formError] : null
  const isAuthRequired = createMutation.error instanceof AuthSessionExpiredError

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
      problemIdRequired: problemIdInputRef,
      languageRequired: null,
      codeRequired: codeInputRef,
    }[error]

    inputRef?.current?.focus()
  }

  const handleSubmit: FormSubmitHandler = (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const validation = validateSolutionCreateForm(
      new FormData(event.currentTarget),
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
        maxWidth={800}
        gap={5}
        paddingInline={4}
        paddingBlock={10}
      >
        <VStack gap={2} maxWidth={672}>
          <Heading level={1}>{copy.title}</Heading>
          <Text type="body" color="secondary">
            {copy.description}
          </Text>
          <Link href="/solutions" isStandalone>
            {copy.backToList}
          </Link>
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
              <TextInput
                ref={problemIdInputRef}
                label={copy.problemIdLabel}
                htmlName="problemId"
                value={problemId}
                onChange={(nextProblemId) => {
                  setProblemId(nextProblemId)
                  clearFeedback('problemIdRequired')
                }}
                startIcon={Hash}
                required
                isDisabled={isSubmitting}
                placeholder={copy.problemIdPlaceholder}
                description={copy.problemIdDescription}
                size="lg"
                width="100%"
                autoComplete="off"
                {...(formError === 'problemIdRequired' && formErrorMessage
                  ? {
                      status: {
                        type: 'error' as const,
                        message: formErrorMessage,
                      },
                    }
                  : {})}
              />

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
            </FormLayout>

            <Button
              label={isSubmitting ? copy.submitting : copy.submit}
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
              icon={<Icon icon={FilePlus2} color="inherit" />}
              className="w-full"
            />
          </VStack>
        </form>
      </VStack>
    </Center>
  )
}
