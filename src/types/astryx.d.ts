import '@astryxdesign/core/TextInput'

declare module '@astryxdesign/core/TextInput' {
  interface TextInputProps {
    /**
     * Astryx forwards remaining props to its native input, but 0.1.6 does not
     * expose these standard input attributes in TextInputProps yet.
     */
    autoComplete?: string
    minLength?: number
    required?: boolean
  }
}
