import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from '@/App'

describe('App', () => {
  it('renders the home screen', () => {
    render(<App />)
    expect(screen.getByText(/day streak/)).toBeInTheDocument()
    expect(screen.getByText(/hearts/)).toBeInTheDocument()
  })

  it('shows the English course', () => {
    render(<App />)
    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.length).toBeGreaterThanOrEqual(6)
    expect(screen.getAllByText('Essential Verbs').length).toBeGreaterThanOrEqual(1)
  })
})
