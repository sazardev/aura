import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from '@/App'

describe('App', () => {
  it('renderiza la pantalla de inicio', () => {
    render(<App />)
    expect(screen.getByText(/días de racha/)).toBeInTheDocument()
    expect(screen.getByText(/corazones/)).toBeInTheDocument()
  })

  it('muestra el curso de inglés', () => {
    render(<App />)
    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.length).toBeGreaterThanOrEqual(6)
    expect(screen.getAllByText('Verbos esenciales').length).toBeGreaterThanOrEqual(1)
  })
})
