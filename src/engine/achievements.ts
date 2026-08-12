export interface AchievementDef {
  id: string
  name: string
  description: string
  emoji: string
}

export interface ProgressSnapshot {
  xp: number
  totalLessons: number
  streak: number
  learnedWords: number
  totalCorrect: number
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'primeros-pasos', name: 'Primeros pasos', description: 'Gana 100 XP', emoji: '🌱' },
  { id: 'xp-500', name: 'En racha', description: 'Gana 500 XP', emoji: '⚡' },
  { id: 'xp-1000', name: 'Imparable', description: 'Gana 1.000 XP', emoji: '🔥' },
  { id: 'xp-5000', name: 'Leyenda de Aura', description: 'Gana 5.000 XP', emoji: '👑' },
  {
    id: 'primera-leccion',
    name: 'Primera lección',
    description: 'Completa tu primera lección',
    emoji: '🎓',
  },
  { id: 'lecciones-5', name: 'Estudiante', description: 'Completa 5 lecciones', emoji: '📚' },
  { id: 'lecciones-25', name: 'Erudito', description: 'Completa 25 lecciones', emoji: '🏛️' },
  { id: 'racha-3', name: 'Tres días', description: 'Racha de 3 días', emoji: '🔥' },
  { id: 'racha-7', name: 'Una semana', description: 'Racha de 7 días', emoji: '⚡' },
  { id: 'racha-30', name: 'Mes completo', description: 'Racha de 30 días', emoji: '🌙' },
  { id: 'palabras-50', name: 'Vocabulario', description: 'Aprende 50 palabras', emoji: '📖' },
  {
    id: 'palabras-200',
    name: 'Palabras poderosas',
    description: 'Aprende 200 palabras',
    emoji: '🗺️',
  },
  { id: 'palabras-500', name: 'Biblioteca viva', description: 'Aprende 500 palabras', emoji: '🌌' },
  {
    id: 'correcciones-100',
    name: 'Precisión',
    description: '100 respuestas correctas',
    emoji: '🎯',
  },
  {
    id: 'correcciones-1000',
    name: 'Maestro',
    description: '1.000 respuestas correctas',
    emoji: '🏆',
  },
]

const RULES: readonly { id: string; check: (snapshot: ProgressSnapshot) => boolean }[] = [
  { id: 'primeros-pasos', check: (s) => s.xp >= 100 },
  { id: 'xp-500', check: (s) => s.xp >= 500 },
  { id: 'xp-1000', check: (s) => s.xp >= 1000 },
  { id: 'xp-5000', check: (s) => s.xp >= 5000 },
  { id: 'primera-leccion', check: (s) => s.totalLessons >= 1 },
  { id: 'lecciones-5', check: (s) => s.totalLessons >= 5 },
  { id: 'lecciones-25', check: (s) => s.totalLessons >= 25 },
  { id: 'racha-3', check: (s) => s.streak >= 3 },
  { id: 'racha-7', check: (s) => s.streak >= 7 },
  { id: 'racha-30', check: (s) => s.streak >= 30 },
  { id: 'palabras-50', check: (s) => s.learnedWords >= 50 },
  { id: 'palabras-200', check: (s) => s.learnedWords >= 200 },
  { id: 'palabras-500', check: (s) => s.learnedWords >= 500 },
  { id: 'correcciones-100', check: (s) => s.totalCorrect >= 100 },
  { id: 'correcciones-1000', check: (s) => s.totalCorrect >= 1000 },
]

/**
Logros que deberían desbloquearse ahora pero aún no están en `current`.
 */
export function newlyUnlocked(
  current: Readonly<Record<string, string>>,
  snapshot: ProgressSnapshot,
): string[] {
  return RULES.filter((rule) => current[rule.id] === undefined && rule.check(snapshot)).map(
    (rule) => rule.id,
  )
}

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id)
}
