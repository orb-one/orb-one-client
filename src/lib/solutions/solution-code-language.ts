import {
  LanguageSupport,
  StreamLanguage,
  type StreamParser,
} from '@codemirror/language'

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

type LanguageLoader = () => Promise<LanguageSupport>

const languageLoaders: Record<string, LanguageLoader> = {
  c: async () => (await import('@codemirror/lang-cpp')).cpp(),
  cpp: async () => (await import('@codemirror/lang-cpp')).cpp(),
  csharp: async () =>
    legacy((await import('@codemirror/legacy-modes/mode/clike')).csharp),
  dart: async () =>
    legacy((await import('@codemirror/legacy-modes/mode/clike')).dart),
  go: async () => (await import('@codemirror/lang-go')).go(),
  java: async () => (await import('@codemirror/lang-java')).java(),
  javascript: async () =>
    (await import('@codemirror/lang-javascript')).javascript(),
  kotlin: async () =>
    legacy((await import('@codemirror/legacy-modes/mode/clike')).kotlin),
  python: async () => (await import('@codemirror/lang-python')).python(),
  r: async () => legacy((await import('@codemirror/legacy-modes/mode/r')).r),
  ruby: async () =>
    legacy((await import('@codemirror/legacy-modes/mode/ruby')).ruby),
  rust: async () => (await import('@codemirror/lang-rust')).rust(),
  scala: async () =>
    legacy((await import('@codemirror/legacy-modes/mode/clike')).scala),
  swift: async () =>
    legacy((await import('@codemirror/legacy-modes/mode/swift')).swift),
  typescript: async () =>
    (await import('@codemirror/lang-javascript')).javascript({
      typescript: true,
    }),
}

const languagePromises = new Map<string, Promise<LanguageSupport | undefined>>()

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

export function loadSolutionCodeLanguage(language: string | null) {
  const normalizedLanguage = normalizeSolutionCodeLanguage(language)
  const cached = languagePromises.get(normalizedLanguage)

  if (cached) {
    return cached
  }

  const languageLoader = languageLoaders[normalizedLanguage]
  const languagePromise = languageLoader
    ? languageLoader().then((support) => support)
    : Promise.resolve(undefined)

  languagePromises.set(normalizedLanguage, languagePromise)
  return languagePromise
}

function legacy<State>(parser: StreamParser<State>) {
  return new LanguageSupport(StreamLanguage.define(parser))
}
