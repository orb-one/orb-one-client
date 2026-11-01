import { expect, it } from 'vitest'

import { problemDifficultyColors } from './problem-difficulty-colors'

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const srgb = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  })
  const [red = 0, green = 0, blue = 0] = channels
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

it.each(Object.entries(problemDifficultyColors))(
  '%s keeps a text contrast ratio of at least 4.5:1',
  (_, colors) => {
    const background = luminance(colors.background)
    const text = luminance(colors.text)
    const ratio =
      (Math.max(background, text) + 0.05) / (Math.min(background, text) + 0.05)
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  },
)
