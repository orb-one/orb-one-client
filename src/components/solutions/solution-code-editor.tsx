import { Field, type FieldStatusInput } from '@astryxdesign/core/Field'
import { Code2 } from 'lucide-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Ref,
} from 'react'

import {
  loadSolutionCodeTokenizer,
  normalizeSolutionCodeLanguage,
  type SolutionCodeTokenizer,
  type SyntaxToken,
} from '@/lib/solutions/solution-code-tokenizer'

import './solution-code-editor.css'

interface SolutionCodeEditorProps {
  ref?: Ref<HTMLTextAreaElement>
  label: string
  description: string
  htmlName: string
  value: string
  language: string
  placeholder?: string
  rows?: number
  isDisabled?: boolean
  status?: FieldStatusInput
  onChange: (value: string, event: ChangeEvent<HTMLTextAreaElement>) => void
}

interface LoadedTokenizer {
  language: string
  tokenizer: SolutionCodeTokenizer
}

const tokenTypes = new Set([
  'attribute',
  'comment',
  'constant',
  'function',
  'keyword',
  'number',
  'operator',
  'property',
  'punctuation',
  'string',
  'tag',
  'type',
])

export function SolutionCodeEditor({
  ref,
  label,
  description,
  htmlName,
  value,
  language,
  placeholder,
  rows = 18,
  isDisabled = false,
  status,
  onChange,
}: SolutionCodeEditorProps) {
  const generatedID = useId()
  const inputID = `${generatedID}-input`
  const descriptionID = `${generatedID}-description`
  const statusID = `${generatedID}-status`
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const normalizedLanguage = normalizeSolutionCodeLanguage(language)
  const [loadedTokenizer, setLoadedTokenizer] =
    useState<LoadedTokenizer | null>(null)
  const tokenizer =
    loadedTokenizer?.language === normalizedLanguage
      ? loadedTokenizer.tokenizer
      : undefined

  useEffect(() => {
    let isActive = true

    void loadSolutionCodeTokenizer(normalizedLanguage)
      .then((nextTokenizer) => {
        if (isActive && nextTokenizer) {
          setLoadedTokenizer({
            language: normalizedLanguage,
            tokenizer: nextTokenizer,
          })
        }
      })
      .catch(() => {
        // Grammar 초기화에 실패해도 입력은 일반 텍스트 편집기로 유지한다.
      })

    return () => {
      isActive = false
    }
  }, [normalizedLanguage])

  const tokens = useMemo(
    () => tokenizer?.(value, normalizedLanguage) ?? [],
    [normalizedLanguage, tokenizer, value],
  )
  const describedBy = [
    description ? descriptionID : null,
    status?.message ? statusID : null,
  ]
    .filter(Boolean)
    .join(' ')

  function syncScroll() {
    if (!textareaRef.current || !highlightRef.current) {
      return
    }

    highlightRef.current.scrollTop = textareaRef.current.scrollTop
    highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
  }

  function setTextareaRef(node: HTMLTextAreaElement | null) {
    textareaRef.current = node

    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }

  return (
    <Field
      label={label}
      description={description}
      inputID={inputID}
      descriptionID={descriptionID}
      labelIcon={Code2}
      isDisabled={isDisabled}
      statusVariant="detached"
      width="100%"
      {...(status
        ? {
            status: {
              ...status,
              messageID: statusID,
            },
          }
        : {})}
    >
      <section
        className="solution-code-editor"
        data-disabled={isDisabled || undefined}
        data-invalid={status?.type === 'error' || undefined}
      >
        <pre
          ref={highlightRef}
          className="solution-code-editor__highlight"
          aria-hidden="true"
        >
          <code>{renderHighlightedCode(value, tokens)}</code>
        </pre>
        <textarea
          ref={setTextareaRef}
          id={inputID}
          name={htmlName}
          className="solution-code-editor__input"
          value={value}
          placeholder={placeholder}
          rows={rows}
          disabled={isDisabled}
          required
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-describedby={describedBy || undefined}
          aria-invalid={status?.type === 'error' || undefined}
          onChange={(event) => {
            onChange(event.currentTarget.value, event)
          }}
          onScroll={syncScroll}
        />
      </section>
    </Field>
  )
}

function renderHighlightedCode(code: string, tokens: SyntaxToken[]) {
  const content = []
  let cursor = 0

  for (const token of tokens) {
    const start = Math.max(cursor, token.start)
    const end = Math.min(code.length, token.end)

    if (start >= end || !tokenTypes.has(token.type)) {
      continue
    }

    if (start > cursor) {
      content.push(code.slice(cursor, start))
    }

    content.push(
      <span
        key={`${String(start)}-${String(end)}`}
        data-syntax-token={token.type}
      >
        {code.slice(start, end)}
      </span>,
    )
    cursor = end
  }

  if (cursor < code.length) {
    content.push(code.slice(cursor))
  }

  return content
}
