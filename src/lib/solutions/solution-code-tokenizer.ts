import type {
  HighlighterCore,
  LanguageInput,
  ThemedToken,
  ThemeRegistration,
} from '@shikijs/core'

export interface SyntaxToken {
  type: string
  start: number
  end: number
}

export type SolutionCodeTokenizer = (
  code: string,
  language: string,
) => SyntaxToken[]

type LanguageLoader = () => Promise<LanguageInput>

const languageAliases: Record<string, string> = {
  'c#': 'csharp',
  'c++': 'cpp',
  'c++14': 'cpp',
  'c++17': 'cpp',
  'c++20': 'cpp',
  cs: 'csharp',
  golang: 'go',
  'gnu c': 'c',
  'gnu c++': 'cpp',
  'gnu c++14': 'cpp',
  'gnu c++17': 'cpp',
  'gnu c++20': 'cpp',
  js: 'javascript',
  'node.js': 'javascript',
  py: 'python',
  pypy: 'python',
  pypy3: 'python',
  python3: 'python',
  ts: 'typescript',
}

// 풀이 조회와 편집 화면이 같은 문법 색상을 사용하도록 언어 grammar를 필요할 때 내려받는다.
const languageLoaders: Record<string, LanguageLoader> = {
  c: async () => (await import('@shikijs/langs/c')).default,
  cpp: async () => (await import('@shikijs/langs/cpp')).default,
  csharp: async () => (await import('@shikijs/langs/csharp')).default,
  dart: async () => (await import('@shikijs/langs/dart')).default,
  go: async () => (await import('@shikijs/langs/go')).default,
  java: async () => (await import('@shikijs/langs/java')).default,
  javascript: async () => (await import('@shikijs/langs/javascript')).default,
  kotlin: async () => (await import('@shikijs/langs/kotlin')).default,
  python: async () => (await import('@shikijs/langs/python')).default,
  r: async () => (await import('@shikijs/langs/r')).default,
  ruby: async () => (await import('@shikijs/langs/ruby')).default,
  rust: async () => (await import('@shikijs/langs/rust')).default,
  scala: async () => (await import('@shikijs/langs/scala')).default,
  swift: async () => (await import('@shikijs/langs/swift')).default,
  typescript: async () => (await import('@shikijs/langs/typescript')).default,
}

const semanticColors = {
  attribute: '#00000a',
  comment: '#000001',
  constant: '#00000d',
  function: '#000006',
  keyword: '#000004',
  number: '#000003',
  operator: '#000009',
  property: '#00000b',
  punctuation: '#00000c',
  string: '#000002',
  tag: '#000008',
  type: '#000007',
  variable: '#000005',
} as const

const semanticTheme: ThemeRegistration = {
  name: 'astryx-semantic-tokens',
  type: 'light',
  settings: [
    { settings: { foreground: semanticColors.variable } },
    { scope: ['comment'], settings: { foreground: semanticColors.comment } },
    { scope: ['string'], settings: { foreground: semanticColors.string } },
    {
      scope: ['constant.numeric'],
      settings: { foreground: semanticColors.number },
    },
    {
      scope: ['keyword.operator'],
      settings: { foreground: semanticColors.operator },
    },
    {
      scope: ['keyword', 'storage.modifier'],
      settings: { foreground: semanticColors.keyword },
    },
    {
      scope: ['entity.name.function', 'support.function'],
      settings: { foreground: semanticColors.function },
    },
    {
      scope: [
        'entity.name.type',
        'entity.other.inherited-class',
        'storage.type',
        'support.type',
      ],
      settings: { foreground: semanticColors.type },
    },
    {
      scope: ['entity.name.tag'],
      settings: { foreground: semanticColors.tag },
    },
    {
      scope: ['entity.other.attribute-name'],
      settings: { foreground: semanticColors.attribute },
    },
    {
      scope: [
        'meta.object-literal.key',
        'support.type.property-name',
        'variable.other.property',
      ],
      settings: { foreground: semanticColors.property },
    },
    {
      scope: ['constant', 'variable.language'],
      settings: { foreground: semanticColors.constant },
    },
    {
      scope: ['punctuation'],
      settings: { foreground: semanticColors.punctuation },
    },
    {
      scope: ['variable'],
      settings: { foreground: semanticColors.variable },
    },
  ],
}

const colorToTokenType = new Map<string, string>(
  Object.entries(semanticColors).map(([type, color]) => [color, type]),
)

let highlighterPromise: Promise<HighlighterCore> | null = null
const tokenizerPromises = new Map<
  string,
  Promise<SolutionCodeTokenizer | undefined>
>()

export function normalizeSolutionCodeLanguage(language: string | null) {
  const normalized = language?.trim().toLowerCase().replaceAll(/\s+/g, ' ')

  if (!normalized) {
    return 'plaintext'
  }

  const alias = languageAliases[normalized]
  if (alias) {
    return alias
  }

  if (/^java(?:\s|\d)/.test(normalized)) {
    return 'java'
  }

  if (/^(?:gnu\s+)?c\+\+/.test(normalized)) {
    return 'cpp'
  }

  if (/^python\s*\d/.test(normalized)) {
    return 'python'
  }

  return normalized
}

export function hasExtendedSyntaxHighlighting(language: string) {
  return language in languageLoaders
}

// 비동기 Shiki 초기화를 한 번만 수행한 뒤 Astryx가 요구하는 동기 tokenizer를 캐시한다.
export function loadSolutionCodeTokenizer(language: string) {
  const normalizedLanguage = normalizeSolutionCodeLanguage(language)
  const languageLoader = languageLoaders[normalizedLanguage]

  if (!languageLoader) {
    return Promise.resolve(undefined)
  }

  const cached = tokenizerPromises.get(normalizedLanguage)
  if (cached) {
    return cached
  }

  const tokenizerPromise = createSolutionCodeTokenizer(
    normalizedLanguage,
    languageLoader,
  )
  tokenizerPromises.set(normalizedLanguage, tokenizerPromise)

  return tokenizerPromise
}

async function createSolutionCodeTokenizer(
  language: string,
  loadLanguage: LanguageLoader,
): Promise<SolutionCodeTokenizer> {
  const highlighter = await getHighlighter()
  const grammar = await loadLanguage()

  if (!highlighter.getLoadedLanguages().includes(language)) {
    await highlighter.loadLanguage(grammar)
  }

  return (code) =>
    toAstryxTokens(
      highlighter.codeToTokensBase(code, {
        lang: language,
        theme: semanticTheme.name ?? 'astryx-semantic-tokens',
      }),
    )
}

function getHighlighter() {
  highlighterPromise ??= Promise.all([
    import('@shikijs/core'),
    import('@shikijs/engine-javascript'),
  ]).then(([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
    createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      langs: [],
      themes: [semanticTheme],
    }),
  )

  return highlighterPromise
}

export function toAstryxTokens(tokenLines: ThemedToken[][]): SyntaxToken[] {
  return tokenLines.flatMap((line) =>
    line.flatMap((token) => {
      const type = token.color
        ? colorToTokenType.get(token.color.toLowerCase())
        : undefined

      // 기본 색상 영역은 별도 DOM range가 필요하지 않다.
      if (!type || type === 'variable' || token.content.length === 0) {
        return []
      }

      return [
        {
          type,
          start: token.offset,
          end: token.offset + token.content.length,
        },
      ]
    }),
  )
}
