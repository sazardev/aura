import type { LearningGoal } from '@/state/store'

export const LEARNING_GOALS: readonly { id: LearningGoal; label: string; hint: string }[] = [
  { id: 'travel', label: 'Travel', hint: 'Get by abroad, order food, ask for help' },
  { id: 'work', label: 'Work', hint: 'Emails, meetings and career growth' },
  { id: 'study', label: 'Study', hint: 'Read, understand and take notes in English' },
  { id: 'exams', label: 'Exams', hint: 'Pass a test — TOEFL, IELTS, Cambridge and more' },
  { id: 'move', label: 'Moving abroad', hint: 'Feel at home in an English-speaking country' },
  { id: 'fun', label: 'Just for fun', hint: 'Enjoy books, films and conversations' },
]

export const AGE_BUCKETS: readonly { value: number; label: string }[] = [
  { value: 13, label: 'Under 18' },
  { value: 18, label: '18–25' },
  { value: 26, label: '26–35' },
  { value: 36, label: '36–50' },
  { value: 50, label: '50+' },
]

export const NATIVE_LANGUAGES: readonly string[] = [
  'Spanish',
  'English',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Chinese',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
  'Turkish',
  'Polish',
  'Dutch',
  'Vietnamese',
  'Thai',
  'Indonesian',
  'Greek',
  'Swedish',
  'Czech',
  'Hungarian',
  'Romanian',
  'Ukrainian',
  'Persian',
  'Hebrew',
  'Other',
]

export const PROFESSIONS: readonly { id: string; label: string }[] = [
  { id: 'business', label: 'Business & office' },
  { id: 'tech', label: 'Technology & IT' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'education', label: 'Education' },
  { id: 'hospitality', label: 'Hospitality & tourism' },
  { id: 'sales', label: 'Sales & customer service' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'law', label: 'Law & legal' },
]

export function professionLabel(id: string | undefined): string {
  const found = PROFESSIONS.find((candidate) => candidate.id === id)
  return found?.label ?? ''
}

export function goalLabel(goal: LearningGoal | undefined): string {
  const found = LEARNING_GOALS.find((candidate) => candidate.id === goal)
  return found?.label ?? ''
}

export function ageBucketLabel(age: number | undefined): string {
  const found = AGE_BUCKETS.find((candidate) => candidate.value === age)
  return found?.label ?? ''
}
