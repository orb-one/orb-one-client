import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'

import { Button } from '@/components/ui/button'

it('renders a button with its label', () => {
  render(<Button type="button">Save</Button>)

  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
})
