import { expect, it } from 'vitest'

import {
  loadSolutionCodeLanguage,
  normalizeSolutionCodeLanguage,
} from '@/lib/solutions/solution-code-language'

it.each([
  ['Java 17', 'java'],
  ['GNU C++17', 'cpp'],
  ['C#', 'csharp'],
  ['PyPy3', 'python'],
  ['Node.js', 'javascript'],
  [null, 'plaintext'],
])('normalizes the solution language %s to %s', (language, expected) => {
  expect(normalizeSolutionCodeLanguage(language)).toBe(expected)
})

it.each([
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
])('loads CodeMirror support for %s', async (language) => {
  await expect(loadSolutionCodeLanguage(language)).resolves.toBeDefined()
})

it('leaves unknown languages in plain text', async () => {
  await expect(loadSolutionCodeLanguage('brainfuck')).resolves.toBeUndefined()
})
