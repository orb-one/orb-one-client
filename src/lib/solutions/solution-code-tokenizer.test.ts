import { expect, it } from 'vitest'

import {
  loadSolutionCodeTokenizer,
  normalizeSolutionCodeLanguage,
} from '@/lib/solutions/solution-code-tokenizer'

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

it('creates Astryx-compatible syntax tokens for Java code', async () => {
  const code = [
    'public class Main {',
    '  public static void main(String[] args) {',
    '    System.out.println(42);',
    '  }',
    '}',
  ].join('\n')
  const tokenizer = await loadSolutionCodeTokenizer('java')

  expect(tokenizer).toBeDefined()

  const tokens = tokenizer?.(code, 'java') ?? []
  const tokenTypes = new Set(tokens.map((token) => token.type))

  expect([...tokenTypes]).toEqual(
    expect.arrayContaining(['function', 'keyword', 'number', 'type']),
  )
  expect(tokens.every((token) => token.end > token.start)).toBe(true)
})

it('creates tokens for languages supported by the solution editor', async () => {
  await expect(loadSolutionCodeTokenizer('python')).resolves.toBeDefined()
  await expect(loadSolutionCodeTokenizer('javascript')).resolves.toBeDefined()
  await expect(loadSolutionCodeTokenizer('typescript')).resolves.toBeDefined()
})

it('leaves unknown languages without a tokenizer', async () => {
  await expect(loadSolutionCodeTokenizer('brainfuck')).resolves.toBeUndefined()
})
