import { indentWithTab } from '@codemirror/commands'
import {
  HighlightStyle,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import {
  EditorView,
  keymap,
  placeholder as codePlaceholder,
} from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { basicSetup } from 'codemirror'
import { useEffect, useId, useImperativeHandle, useRef, type Ref } from 'react'

import { loadSolutionCodeLanguage } from '@/lib/solutions/solution-code-language'

import './solution-code-mirror.css'

export interface SolutionCodeMirrorHandle {
  focus: () => void
}

interface SolutionCodeMirrorProps {
  ref?: Ref<SolutionCodeMirrorHandle>
  value: string
  language: string | null
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  placeholder?: string
  isEditable?: boolean
  isDisabled?: boolean
  isInvalid?: boolean
  isRequired?: boolean
  hasLineNumbers?: boolean
  size?: 'editor' | 'viewer-md' | 'viewer-lg'
  testID?: string
  onChange?: (value: string) => void
}

const languageCompartment = new Compartment()
const editableCompartment = new Compartment()
const attributesCompartment = new Compartment()

const solutionHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, class: 'solution-code-syntax-keyword' },
  {
    tag: [tags.string, tags.special(tags.string)],
    class: 'solution-code-syntax-string',
  },
  {
    tag: [tags.lineComment, tags.blockComment, tags.docComment],
    class: 'solution-code-syntax-comment',
  },
  { tag: tags.number, class: 'solution-code-syntax-number' },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    class: 'solution-code-syntax-function',
  },
  {
    tag: [tags.typeName, tags.className, tags.namespace],
    class: 'solution-code-syntax-type',
  },
  { tag: tags.operator, class: 'solution-code-syntax-operator' },
  {
    tag: [tags.bool, tags.null, tags.atom, tags.constant(tags.name)],
    class: 'solution-code-syntax-constant',
  },
  { tag: tags.tagName, class: 'solution-code-syntax-tag' },
  { tag: tags.attributeName, class: 'solution-code-syntax-attribute' },
  { tag: tags.propertyName, class: 'solution-code-syntax-property' },
  {
    tag: [tags.punctuation, tags.bracket, tags.separator],
    class: 'solution-code-syntax-punctuation',
  },
])

const solutionCodeMirrorTheme = EditorView.theme({
  '&': {
    width: '100%',
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-syntax-background)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-family-code)',
    fontSize: 'var(--text-code-size)',
    lineHeight: 'var(--text-code-leading)',
  },
  '.cm-content': {
    padding: 'var(--spacing-3)',
    caretColor: 'var(--color-text-primary)',
  },
  '.cm-line': {
    paddingInline: 'var(--spacing-0)',
  },
  '.cm-gutters': {
    color: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-syntax-background)',
    borderInlineEnd: 'var(--border-width) solid var(--color-border)',
  },
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: 'var(--color-overlay-hover)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderInlineStartColor: 'var(--color-text-primary)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection':
    {
      backgroundColor: 'var(--color-accent-muted)',
    },
  '.cm-placeholder': {
    color: 'var(--color-text-secondary)',
  },
})

const hideLineNumbersTheme = EditorView.theme({
  '.cm-gutters': {
    display: 'none',
  },
})

export function SolutionCodeMirror({
  ref,
  value,
  language,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  placeholder,
  isEditable = false,
  isDisabled = false,
  isInvalid = false,
  isRequired = false,
  hasLineNumbers = false,
  size = 'viewer-lg',
  testID,
  onChange,
}: SolutionCodeMirrorProps) {
  const generatedID = useId()
  const parentRef = useRef<HTMLElement>(null)
  const editorViewRef = useRef<EditorView>(null)
  const onChangeRef = useRef(onChange)
  const initialConfigRef = useRef({
    value,
    language,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    placeholder,
    isEditable,
    isDisabled,
    isInvalid,
    isRequired,
    hasLineNumbers,
  })

  useImperativeHandle(ref, () => ({
    focus() {
      editorViewRef.current?.focus()
    },
  }))

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!parentRef.current) {
      return
    }

    const initialConfig = initialConfigRef.current
    const extensions: Extension[] = [
      basicSetup,
      EditorState.tabSize.of(2),
      indentUnit.of('  '),
      keymap.of([indentWithTab]),
      solutionCodeMirrorTheme,
      syntaxHighlighting(solutionHighlightStyle),
      languageCompartment.of([]),
      editableCompartment.of(
        getEditableExtensions(
          initialConfig.isEditable,
          initialConfig.isDisabled,
        ),
      ),
      attributesCompartment.of(
        getAttributeExtension({
          id: generatedID,
          ariaLabel: initialConfig.ariaLabel,
          ariaLabelledBy: initialConfig.ariaLabelledBy,
          ariaDescribedBy: initialConfig.ariaDescribedBy,
          isEditable: initialConfig.isEditable,
          isDisabled: initialConfig.isDisabled,
          isInvalid: initialConfig.isInvalid,
          isRequired: initialConfig.isRequired,
        }),
      ),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current?.(update.state.doc.toString())
        }
      }),
    ]

    if (!initialConfig.hasLineNumbers) {
      extensions.push(hideLineNumbersTheme)
    }

    if (initialConfig.placeholder) {
      extensions.push(codePlaceholder(initialConfig.placeholder))
    }

    const editorView = new EditorView({
      parent: parentRef.current,
      doc: initialConfig.value,
      extensions,
    })
    editorViewRef.current = editorView

    return () => {
      editorView.destroy()
      editorViewRef.current = null
    }
  }, [generatedID])

  useEffect(() => {
    const editorView = editorViewRef.current
    if (!editorView || editorView.state.doc.toString() === value) {
      return
    }

    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: value,
      },
    })
  }, [value])

  useEffect(() => {
    const editorView = editorViewRef.current
    if (!editorView) {
      return
    }

    let isActive = true

    editorView.dispatch({
      effects: languageCompartment.reconfigure([]),
    })

    void loadSolutionCodeLanguage(language)
      .then((languageSupport) => {
        const currentEditorView = editorViewRef.current

        if (isActive && currentEditorView) {
          currentEditorView.dispatch({
            effects: languageCompartment.reconfigure(
              languageSupport ? [languageSupport] : [],
            ),
          })
        }
      })
      .catch(() => {
        // 언어 모듈을 불러오지 못해도 일반 텍스트 편집과 표시는 유지한다.
      })

    return () => {
      isActive = false
    }
  }, [language])

  useEffect(() => {
    const editorView = editorViewRef.current

    if (editorView) {
      editorView.dispatch({
        effects: editableCompartment.reconfigure(
          getEditableExtensions(isEditable, isDisabled),
        ),
      })
    }
  }, [isDisabled, isEditable])

  useEffect(() => {
    const editorView = editorViewRef.current

    if (editorView) {
      editorView.dispatch({
        effects: attributesCompartment.reconfigure(
          getAttributeExtension({
            id: generatedID,
            ariaLabel,
            ariaLabelledBy,
            ariaDescribedBy,
            isEditable,
            isDisabled,
            isInvalid,
            isRequired,
          }),
        ),
      })
    }
  }, [
    ariaDescribedBy,
    ariaLabel,
    ariaLabelledBy,
    generatedID,
    isDisabled,
    isEditable,
    isInvalid,
    isRequired,
  ])

  return (
    <section
      ref={parentRef}
      className="solution-code-mirror"
      data-disabled={isDisabled || undefined}
      data-editable={isEditable || undefined}
      data-invalid={isInvalid || undefined}
      data-size={size}
      data-testid={testID}
    />
  )
}

function getEditableExtensions(isEditable: boolean, isDisabled: boolean) {
  const canEdit = isEditable && !isDisabled

  return [EditorState.readOnly.of(!canEdit), EditorView.editable.of(canEdit)]
}

function getAttributeExtension({
  id,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  isEditable,
  isDisabled,
  isInvalid,
  isRequired,
}: {
  id: string
  ariaLabel: string | undefined
  ariaLabelledBy: string | undefined
  ariaDescribedBy: string | undefined
  isEditable: boolean
  isDisabled: boolean
  isInvalid: boolean
  isRequired: boolean
}) {
  return EditorView.contentAttributes.of({
    id,
    ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
    ...(ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : {}),
    ...(ariaDescribedBy ? { 'aria-describedby': ariaDescribedBy } : {}),
    ...(!isEditable || isDisabled ? { 'aria-readonly': 'true' } : {}),
    ...(isDisabled ? { 'aria-disabled': 'true' } : {}),
    ...(isInvalid ? { 'aria-invalid': 'true' } : {}),
    ...(isRequired ? { 'aria-required': 'true' } : {}),
    spellcheck: 'false',
    autocapitalize: 'off',
    autocorrect: 'off',
  })
}
