import { Field, type FieldStatusInput } from '@astryxdesign/core/Field'
import { Code2 } from 'lucide-react'
import { useId, useImperativeHandle, useRef, type Ref } from 'react'

import {
  SolutionCodeMirror,
  type SolutionCodeMirrorHandle,
} from '@/components/solutions/solution-code-mirror'

interface SolutionCodeEditorProps {
  ref?: Ref<SolutionCodeEditorHandle>
  label: string
  description: string
  htmlName: string
  value: string
  language: string
  placeholder?: string
  isDisabled?: boolean
  status?: FieldStatusInput
  onChange: (value: string) => void
}

export interface SolutionCodeEditorHandle {
  focus: () => void
}

export function SolutionCodeEditor({
  ref,
  label,
  description,
  htmlName,
  value,
  language,
  placeholder,
  isDisabled = false,
  status,
  onChange,
}: SolutionCodeEditorProps) {
  const generatedID = useId()
  const inputID = `${generatedID}-input`
  const labelID = `${generatedID}-label`
  const descriptionID = `${generatedID}-description`
  const statusID = `${generatedID}-status`
  const editorRef = useRef<SolutionCodeMirrorHandle>(null)
  const describedBy = [
    description ? descriptionID : null,
    status?.message ? statusID : null,
  ]
    .filter(Boolean)
    .join(' ')

  useImperativeHandle(ref, () => ({
    focus() {
      editorRef.current?.focus()
    },
  }))

  return (
    <Field
      label={label}
      labelID={labelID}
      isGroupLabel
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
      <input type="hidden" name={htmlName} value={value} />
      <SolutionCodeMirror
        ref={editorRef}
        value={value}
        language={language}
        ariaLabelledBy={labelID}
        isEditable
        isDisabled={isDisabled}
        isInvalid={status?.type === 'error'}
        isRequired
        hasLineNumbers
        size="editor"
        onChange={onChange}
        {...(placeholder ? { placeholder } : {})}
        {...(describedBy ? { ariaDescribedBy: describedBy } : {})}
      />
    </Field>
  )
}
