import { Grid } from '@astryxdesign/core/Grid'
import { Section } from '@astryxdesign/core/Section'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Tab, TabList } from '@astryxdesign/core/TabList'
import { Text } from '@astryxdesign/core/Text'
import { TextArea } from '@astryxdesign/core/TextArea'
import { VStack } from '@astryxdesign/core/VStack'
import { lazy, Suspense, useId, useRef, useState } from 'react'

import './solution-markdown-editor.css'

type MarkdownEditorMode = 'edit' | 'preview'

const SolutionMarkdownPreviewContent = lazy(() =>
  import('@/components/solutions/solution-markdown-preview-content').then(
    ({ SolutionMarkdownPreviewContent }) => ({
      default: SolutionMarkdownPreviewContent,
    }),
  ),
)

export function SolutionMarkdownEditor({
  label,
  description,
  placeholder,
  editLabel,
  previewLabel,
  modeLabel,
  emptyPreview,
  value,
  onChange,
  isDisabled = false,
}: SolutionMarkdownEditorProps) {
  const [mode, setMode] = useState<MarkdownEditorMode>('edit')
  const id = useId()
  const editPanelID = `${id}-edit-panel`
  const previewPanelID = `${id}-preview-panel`
  const sourceRef = useRef<HTMLTextAreaElement>(null)
  const previewScrollRef = useRef<HTMLElement>(null)

  return (
    <VStack gap={2} width="100%">
      <VStack gap={1} width="100%">
        <Grid columns={{ minWidth: 280, max: 2 }} gap={0} width="100%">
          <Text type="label">{label}</Text>
          <Text
            type="supporting"
            color="secondary"
            className="hidden lg:block lg:pl-2"
          >
            {previewLabel}
          </Text>
        </Grid>
        <Text type="supporting" color="secondary">
          {description}
        </Text>
      </VStack>

      <Section
        width="100%"
        padding={0}
        variant="section"
        className="overflow-hidden rounded-lg border border-[var(--color-border-emphasized)]"
      >
        <TabList
          aria-label={modeLabel}
          value={mode}
          onChange={(nextMode) => {
            setMode(nextMode as MarkdownEditorMode)
          }}
          layout="fill"
          hasDivider
          className="lg:hidden"
        >
          <Tab value="edit" label={editLabel} aria-controls={editPanelID} />
          <Tab
            value="preview"
            label={previewLabel}
            aria-controls={previewPanelID}
          />
        </TabList>

        <Grid columns={{ minWidth: 280, max: 2 }} gap={0} width="100%">
          <VStack
            gap={0}
            width="100%"
            className={`min-w-0 max-lg:col-span-full lg:border-r lg:border-[var(--color-border)] ${mode === 'edit' ? '' : 'max-lg:hidden'}`}
          >
            <Section
              id={editPanelID}
              role="region"
              aria-label={editLabel}
              width="100%"
              height={360}
              padding={0}
              variant="transparent"
              className="solution-markdown-editor__source min-w-0"
            >
              <TextArea
                ref={sourceRef}
                label={label}
                isLabelHidden
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={16}
                isDisabled={isDisabled}
                hasSpellCheck={false}
                size="lg"
                onScroll={() => {
                  syncPreviewScroll(sourceRef.current, previewScrollRef.current)
                }}
              />
            </Section>
          </VStack>

          <VStack
            gap={0}
            width="100%"
            className={`min-w-0 max-lg:col-span-full ${mode === 'preview' ? '' : 'max-lg:hidden'}`}
          >
            <Section
              id={previewPanelID}
              role="region"
              aria-label={previewLabel}
              width="100%"
              height={360}
              padding={0}
              variant="transparent"
              className="min-w-0"
            >
              <VStack
                ref={previewScrollRef}
                width="100%"
                height="100%"
                padding={2}
                isScrollable
                className="min-w-0"
                data-testid="solution-markdown-preview-scroll"
              >
                {value.trim() ? (
                  <Suspense
                    fallback={<Skeleton width="100%" height={160} radius={3} />}
                  >
                    <SolutionMarkdownPreviewContent
                      value={value}
                      onRendered={() => {
                        syncPreviewScroll(
                          sourceRef.current,
                          previewScrollRef.current,
                        )
                      }}
                    />
                  </Suspense>
                ) : (
                  <Text type="supporting" color="secondary">
                    {emptyPreview}
                  </Text>
                )}
              </VStack>
            </Section>
          </VStack>
        </Grid>
      </Section>
    </VStack>
  )
}

function syncPreviewScroll(
  source: HTMLTextAreaElement | null,
  preview: HTMLElement | null,
) {
  if (!source || !preview || preview.clientHeight === 0) {
    return
  }

  const sourceRange = source.scrollHeight - source.clientHeight
  const previewRange = preview.scrollHeight - preview.clientHeight
  const progress =
    sourceRange > 0
      ? source.scrollTop / sourceRange
      : source.value.length > 0
        ? source.selectionStart / source.value.length
        : 0

  preview.scrollTop = Math.max(0, Math.min(1, progress)) * previewRange
}

interface SolutionMarkdownEditorProps {
  label: string
  description: string
  placeholder: string
  editLabel: string
  previewLabel: string
  modeLabel: string
  emptyPreview: string
  value: string
  onChange: (value: string) => void
  isDisabled?: boolean
}
