import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { App } from '@/App'
import { createCard } from '@/engine/srs'
import { useAuraStore } from '@/state/store'

describe('Review screen', () => {
  beforeEach(() => {
    window.location.hash = '#/review'
    useAuraStore.setState({ onboardingDone: true, cards: {}, weakWords: {}, xp: 0 })
  })

  it('quizzes due words and reiterates a failed word until it is right', async () => {
    const card = createCard('apple', 'a fruit')
    useAuraStore.setState({ cards: { [card.id]: card } })
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      await screen.findByRole('button', { name: /start review/i }, { timeout: 5000 }),
    )

    // A fresh word opens as a multiple-choice meaning question.
    expect(await screen.findByText(/which word means/i)).toBeInTheDocument()
    const wrongOption = screen
      .getAllByRole('button')
      .find(
        (button) => button.classList.contains('exercise-option') && button.textContent !== 'apple',
      )
    expect(wrongOption).toBeDefined()
    await user.click(wrongOption!)

    // Failure: the word comes back as a harder listening question (the quiz
    // auto-advances after the wrong answer, no continue click needed).
    expect(
      await screen.findByText(/listen and choose/i, undefined, { timeout: 3000 }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'a fruit' }))

    // Session ends and the failed word gets a lesson recommendation.
    expect(
      await screen.findByText(/review complete/i, undefined, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(screen.getByText(/words to revisit/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /lesson: at the table/i })).toBeInTheDocument()
  })

  it('rewards correct answers with XP', async () => {
    const card = createCard('apple', 'a fruit')
    useAuraStore.setState({ cards: { [card.id]: card } })
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      await screen.findByRole('button', { name: /start review/i }, { timeout: 5000 }),
    )
    await screen.findByText(/which word means/i)
    await user.click(screen.getByRole('button', { name: 'apple' }))

    await screen.findByText(/review complete/i, undefined, { timeout: 3000 })
    expect(useAuraStore.getState().xp).toBeGreaterThan(0)
    expect(useAuraStore.getState().weakWords['apple']).toBeUndefined()
  })
})
