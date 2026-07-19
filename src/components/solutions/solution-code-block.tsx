import { CodeBlock, type CodeBlockProps } from '@astryxdesign/core/CodeBlock'
import { useEffect, useState } from 'react'

import {
  hasExtendedSyntaxHighlighting,
  loadSolutionCodeTokenizer,
  normalizeSolutionCodeLanguage,
  type SolutionCodeTokenizer,
} from '@/lib/solutions/solution-code-tokenizer'

export function SolutionCodeBlock({
  language,
  ...props
}: SolutionCodeBlockProps) {
  const normalizedLanguage = normalizeSolutionCodeLanguage(language)
  const [loadedTokenizer, setLoadedTokenizer] =
    useState<LoadedTokenizer | null>(null)
  const tokenizer =
    loadedTokenizer?.language === normalizedLanguage
      ? loadedTokenizer.tokenizer
      : undefined

  useEffect(() => {
    if (!hasExtendedSyntaxHighlighting(normalizedLanguage)) {
      return
    }

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
        // 네트워크나 grammar 초기화 실패 시 Astryx의 일반 코드 표시로 안전하게 유지한다.
      })

    return () => {
      isActive = false
    }
  }, [normalizedLanguage])

  return (
    <CodeBlock
      {...props}
      language={normalizedLanguage}
      {...(tokenizer ? { tokenizer } : {})}
    />
  )
}

interface LoadedTokenizer {
  language: string
  tokenizer: SolutionCodeTokenizer
}

interface SolutionCodeBlockProps extends Omit<
  CodeBlockProps,
  'language' | 'tokenizer'
> {
  language: string | null
}
