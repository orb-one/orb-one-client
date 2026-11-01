import { defineTheme } from '@astryxdesign/core/theme'
import {
  neutralIconRegistry,
  neutralTheme,
} from '@astryxdesign/theme-neutral/built'

import { problemDifficultyColors } from '../lib/problems/problem-difficulty-colors'

export const orbTheme = defineTheme({
  name: 'orb',
  extends: neutralTheme,
  icons: neutralIconRegistry,
  components: {
    token: Object.fromEntries(
      Object.entries(problemDifficultyColors).map(([name, colors]) => [
        `color:${name}`,
        { backgroundColor: colors.background, color: colors.text },
      ]),
    ),
  },
})
