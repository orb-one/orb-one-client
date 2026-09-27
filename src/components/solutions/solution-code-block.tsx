import { Collapsible } from '@astryxdesign/core/Collapsible'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { useAnnounce } from '@astryxdesign/core/hooks'
import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { SolutionCodeMirror } from '@/components/solutions/solution-code-mirror'
import { useI18n } from '@/lib/i18n/use-translations'

export function SolutionCodeBlock({
  code,
  language,
  ariaLabel,
  hasLineNumbers = false,
  isCollapsible = false,
  collapsibleThreshold = 10,
  size = 'viewer-md',
  'data-testid': testID,
}: SolutionCodeBlockProps) {
  const { t } = useI18n()
  const announce = useAnnounce()
  const [isCopied, setIsCopied] = useState(false)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
    },
    [],
  )

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      return
    }

    setIsCopied(true)
    announce(t.solutions.code.copied)

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
    }

    resetTimerRef.current = setTimeout(() => {
      setIsCopied(false)
    }, 2_000)
  }

  const codeViewer = (
    <section className="solution-code-viewer">
      <SolutionCodeMirror
        value={code}
        language={language}
        ariaLabel={ariaLabel}
        hasLineNumbers={hasLineNumbers}
        size={size}
        {...(testID ? { testID } : {})}
      />
      <span className="solution-code-viewer__copy">
        <IconButton
          label={isCopied ? t.solutions.code.copied : t.solutions.code.copy}
          tooltip={isCopied ? t.solutions.code.copied : t.solutions.code.copy}
          icon={<Icon icon={isCopied ? Check : Copy} />}
          variant="ghost"
          size="sm"
          clickAction={copyCode}
        />
      </span>
    </section>
  )

  const lineCount = code.replace(/\r?\n$/, '').split(/\r?\n/).length

  if (isCollapsible && lineCount >= collapsibleThreshold) {
    return (
      <Collapsible trigger={language ?? ariaLabel}>{codeViewer}</Collapsible>
    )
  }

  return codeViewer
}

interface SolutionCodeBlockProps {
  code: string
  language: string | null
  ariaLabel: string
  hasLineNumbers?: boolean
  isCollapsible?: boolean
  collapsibleThreshold?: number
  size?: 'viewer-md' | 'viewer-lg'
  'data-testid'?: string
}
