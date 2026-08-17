import { beforeEach, describe, expect, it } from 'vitest'

import { serializeProgress, tryRestoreProgress, useAuraStore } from '@/state/store'

describe('Sound and voice settings', () => {
  beforeEach(() => {
    useAuraStore.setState({ soundEnabled: true, ttsEnabled: true })
  })

  it('defaults to enabled sounds and narration', () => {
    expect(useAuraStore.getState().soundEnabled).toBe(true)
    expect(useAuraStore.getState().ttsEnabled).toBe(true)
  })

  it('toggles sound effects and narration', () => {
    useAuraStore.getState().setSoundEnabled(false)
    useAuraStore.getState().setTtsEnabled(false)
    expect(useAuraStore.getState().soundEnabled).toBe(false)
    expect(useAuraStore.getState().ttsEnabled).toBe(false)
  })
})

describe('Profile', () => {
  it('defaults to Learner with the bird avatar', () => {
    const profile = useAuraStore.getState().profile
    expect(profile.name).toBe('Learner')
    expect(profile.avatar).toBe('Bird')
    expect(profile.avatarColor).toBe('#58cc02')
    expect(profile.joinedAt.length).toBeGreaterThan(0)
  })

  it('updates the name, avatar and avatar color', () => {
    useAuraStore.getState().setProfileName('Maria')
    useAuraStore.getState().setProfileAvatar('Cat')
    useAuraStore.getState().setProfileAvatarColor('#8b5cf6')
    expect(useAuraStore.getState().profile.name).toBe('Maria')
    expect(useAuraStore.getState().profile.avatar).toBe('Cat')
    expect(useAuraStore.getState().profile.avatarColor).toBe('#8b5cf6')
  })
})

describe('Practice metrics', () => {
  beforeEach(() => {
    useAuraStore.setState({
      speakingSessions: 0,
      speakingPrompts: 0,
      speakingGood: 0,
      writingAttempts: 0,
      writingBest: 0,
      writingTotalScore: 0,
    })
  })

  it('records speaking sessions', () => {
    useAuraStore.getState().recordSpeakingSession(6, 5)
    useAuraStore.getState().recordSpeakingSession(6, 3)
    expect(useAuraStore.getState().speakingSessions).toBe(2)
    expect(useAuraStore.getState().speakingPrompts).toBe(12)
    expect(useAuraStore.getState().speakingGood).toBe(8)
  })

  it('records writing scores and keeps the best', () => {
    useAuraStore.getState().recordWriting(6)
    useAuraStore.getState().recordWriting(9)
    expect(useAuraStore.getState().writingAttempts).toBe(2)
    expect(useAuraStore.getState().writingTotalScore).toBe(15)
    expect(useAuraStore.getState().writingBest).toBe(9)
  })

  it('adds reading seconds to the current day', () => {
    const before = useAuraStore.getState().daily.readSeconds
    useAuraStore.getState().recordReading(90, 200)
    expect(useAuraStore.getState().readingSeconds).toBeGreaterThanOrEqual(90)
    expect(useAuraStore.getState().daily.readSeconds).toBe(before + 90)
  })
})

describe('Dark mode and daily quests', () => {
  it('defaults to the system theme and changes it', () => {
    expect(useAuraStore.getState().themeMode).toBe('system')
    useAuraStore.getState().setThemeMode('dark')
    expect(useAuraStore.getState().themeMode).toBe('dark')
  })

  it('defaults to the forest accent and changes it', () => {
    expect(useAuraStore.getState().accent).toBe('forest')
    useAuraStore.getState().setAccent('ocean')
    expect(useAuraStore.getState().accent).toBe('ocean')
  })

  it('claims the daily bonus only once per day', () => {
    useAuraStore.setState({ questBonusClaimed: {} })
    const before = useAuraStore.getState().xp
    useAuraStore.getState().claimDailyBonus(20)
    expect(useAuraStore.getState().xp).toBe(before + 20)
    const afterClaim = useAuraStore.getState().xp
    useAuraStore.getState().claimDailyBonus(20)
    expect(useAuraStore.getState().xp).toBe(afterClaim)
  })
})

describe('Progress backup', () => {
  it('serializes and restores the whole progress', () => {
    useAuraStore.getState().setProfileName('Backup User')
    useAuraStore.getState().awardXp(50)
    const json = serializeProgress()
    expect(json).toContain('"state"')

    useAuraStore.getState().setProfileName('Someone Else')
    expect(tryRestoreProgress(json)).toBe(true)
    expect(useAuraStore.getState().profile.name).toBe('Backup User')
    expect(useAuraStore.getState().xp).toBeGreaterThanOrEqual(50)
  })

  it('rejects invalid backups', () => {
    expect(tryRestoreProgress('not json')).toBe(false)
    expect(tryRestoreProgress('{"hello":1}')).toBe(false)
  })
})

describe('Guided tour', () => {
  beforeEach(() => {
    useAuraStore.setState({ guidedActive: false, guidedActions: {}, onboardingDone: true })
  })

  it('tracks actions only while the tour is active', () => {
    useAuraStore.getState().markGuidedAction('dictionary')
    expect(useAuraStore.getState().guidedActions['dictionary']).toBeUndefined()

    useAuraStore.getState().startGuidedTour()
    expect(useAuraStore.getState().guidedActive).toBe(true)
    useAuraStore.getState().markGuidedAction('dictionary')
    expect(useAuraStore.getState().guidedActions['dictionary']).toBe(true)

    useAuraStore.getState().completeOnboarding()
    expect(useAuraStore.getState().guidedActive).toBe(false)
  })
})

describe('Hidden books', () => {
  beforeEach(() => {
    useAuraStore.setState({ hiddenBooks: [] })
  })

  it('hides, restores and shows all books', () => {
    useAuraStore.getState().hideBook('alice-in-wonderland')
    useAuraStore.getState().hideBook('alice-in-wonderland')
    expect(useAuraStore.getState().hiddenBooks).toEqual(['alice-in-wonderland'])

    useAuraStore.getState().unhideBook('alice-in-wonderland')
    expect(useAuraStore.getState().hiddenBooks).toEqual([])

    useAuraStore.getState().hideBook('a')
    useAuraStore.getState().hideBook('b')
    useAuraStore.getState().showAllBooks()
    expect(useAuraStore.getState().hiddenBooks).toEqual([])
  })
})
