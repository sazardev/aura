import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { App } from '@/App'
import { useAuraStore } from '@/state/store'

const INTRO_STEPS = [
  'Your course path',
  'Earn XP, keep your streak',
  'A full dictionary, offline',
  'Understand any text',
  'Remember what you learn',
]

describe('Onboarding', () => {
  beforeEach(() => {
    window.location.hash = '#/home'
    useAuraStore.setState({ onboardingDone: false })
  })

  it('shows the tour on first launch', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Aura')
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
    expect(screen.getByText(/1 of 12/)).toBeInTheDocument()
  })

  it('walks through the tour, sets up the profile and starts', async () => {
    const user = userEvent.setup()
    render(<App />)

    for (const title of INTRO_STEPS) {
      await user.click(screen.getByRole('button', { name: /continue/i }))
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title)
    }

    // Who are you? (name + age) — continue is enabled without a selection.
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Who are you?')

    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Why are you learning English?',
    )

    // Pick a goal so the continue button unlocks.
    await user.click(screen.getByRole('button', { name: /travel/i }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What do you do?')

    // Profession is optional — continue through it.
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your native language')

    await user.selectOptions(screen.getByRole('combobox'), 'Spanish')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pick your avatar')

    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pick your color theme')

    await user.click(screen.getByRole('button', { name: /start learning/i }))
    expect(useAuraStore.getState().onboardingDone).toBe(true)
    expect(useAuraStore.getState().guidedActive).toBe(true)
    expect(useAuraStore.getState().profile.goal).toBe('travel')
    expect(useAuraStore.getState().profile.nativeLanguage).toBe('Spanish')
    expect(
      await screen.findByText(/Try it yourself/, undefined, { timeout: 8000 }),
    ).toBeInTheDocument()
  }, 20_000)

  it('goes back to the previous step', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your course path')

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Aura')
  })

  it('skips the tour', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /skip/i }))
    expect(useAuraStore.getState().onboardingDone).toBe(true)
    expect(screen.getByText(/day streak/)).toBeInTheDocument()
  })
})

describe('App', () => {
  beforeEach(() => {
    window.location.hash = '#/home'
    useAuraStore.setState({ onboardingDone: true })
  })

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

  it('opens the library with the classics', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /library/i }))
    expect(
      await screen.findByText("Alice's Adventures in Wonderland", undefined, { timeout: 8000 }),
    ).toBeInTheDocument()
    expect(screen.getByText('The Wonderful Wizard of Oz')).toBeInTheDocument()
  })

  it('hides and restores a default book without losing progress', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /library/i }))
    await screen.findByText("Alice's Adventures in Wonderland", undefined, { timeout: 8000 })

    await user.click(screen.getByRole('button', { name: /hide alice's adventures in wonderland/i }))
    expect(screen.getByText(/hidden \(1\)/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /restore all/i }))
    expect(screen.queryByText(/hidden \(1\)/i)).not.toBeInTheDocument()
    expect(screen.getByText("Alice's Adventures in Wonderland")).toBeInTheDocument()
  })

  it('opens the profile hub from the home hero', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Learner')
    await user.click(screen.getByRole('button', { name: /open your profile/i }))
    expect(await screen.findByRole('button', { name: /history/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /achievements/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument()
  })

  it('deep links restore the exact profile tab', async () => {
    window.location.hash = '#/profile/history'
    render(<App />)
    expect(await screen.findByRole('button', { name: /^overview/i })).toBeInTheDocument()
    expect(screen.getByText(/No activity yet/)).toBeInTheDocument()
  })

  it('deep links open a grammar lesson', async () => {
    window.location.hash = '#/grammar/articles-rule'
    render(<App />)
    expect(await screen.findByText(/The rule/i)).toBeInTheDocument()
    expect(screen.getByText(/Use a before consonant sounds/)).toBeInTheDocument()
  })

  it('opens the settings page from the top bar', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /open settings/i }))
    expect(await screen.findByRole('heading', { name: /settings/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /dark mode/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /sound effects/i })).toBeInTheDocument()
  })

  it('switches the accent theme from settings', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /open settings/i }))
    await user.click(await screen.findByRole('button', { name: /ocean theme/i }))
    expect(useAuraStore.getState().accent).toBe('ocean')
    expect(document.documentElement.dataset['accent']).toBe('ocean')
  })

  it('repeats the guided tour from settings', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /open settings/i }))
    await user.click(await screen.findByRole('button', { name: /repeat the guided tour/i }))
    expect(await screen.findByText(/Try it yourself/)).toBeInTheDocument()
    expect(useAuraStore.getState().guidedActive).toBe(true)
  })

  it('opens the roadmap with its stages', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /all sections/i }))
    await user.click(await screen.findByRole('button', { name: /roadmap/i }))
    expect(await screen.findByText(/Your roadmap/)).toBeInTheDocument()
    expect(screen.getByText(/Foundations/)).toBeInTheDocument()
    expect(screen.getByText(/Everyday English/)).toBeInTheDocument()
    expect(screen.getByText(/Growing fluency/)).toBeInTheDocument()
  })

  it('opens the about screen with the version and changelog', async () => {
    window.location.hash = '#/about'
    render(<App />)
    expect(await screen.findByRole('heading', { name: /about aura/i })).toBeInTheDocument()
    expect(screen.getByText(/Version 0\.0\.0-test/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /changelog/i })).toBeInTheDocument()
  })
})
