import { z } from 'zod'

export const lessonWordSchema = z.object({
  word: z.string().min(1),
  translation: z.string().min(1),
  meaning: z.string().min(1),
  sentence: z.string().min(1),
  sentenceTranslation: z.string().min(1),
})

export const lessonSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['leccion', 'cuestionario']),
  words: z.array(lessonWordSchema).min(1),
})

export const unitSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  emoji: z.string().min(1),
  color: z.string().min(1),
  lessons: z.array(lessonSchema).min(1),
})

export const courseSchema = z
  .array(unitSchema)
  .min(1)
  .superRefine((course, context) => {
    const lessonIds = new Set<string>()
    const wordIds = new Set<string>()
    for (const unit of course) {
      for (const lesson of unit.lessons) {
        if (lessonIds.has(lesson.id)) {
          context.addIssue({
            code: 'custom',
            message: `Curso inválido: lección duplicada "${lesson.id}"`,
          })
        }
        lessonIds.add(lesson.id)
        for (const word of lesson.words) {
          const key = word.word.toLowerCase()
          if (wordIds.has(key)) {
            context.addIssue({
              code: 'custom',
              message: `Curso inválido: palabra duplicada "${word.word}"`,
            })
          }
          wordIds.add(key)
        }
      }
    }
  })

export const achievementDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  emoji: z.string().min(1),
})

export const achievementsSchema = z.array(achievementDefSchema).min(1)

export const appConfigSchema = z.object({
  gamification: z.object({
    xpPerCorrect: z.number().int().positive(),
    xpPerLesson: z.number().int().positive(),
    xpPerPerfectLesson: z.number().int().positive(),
    xpPerReviewCard: z.number().int().positive(),
    maxHearts: z.number().int().positive(),
    dailyGoal: z.object({
      default: z.number().int().positive(),
      options: z.array(z.number().int().positive()).min(1),
    }),
    levelCurve: z.object({
      baseXp: z.number().int().positive(),
      incrementPerLevel: z.number(),
    }),
  }),
  srs: z.object({
    initialEfactor: z.number().min(1.3).max(3),
    initialInterval: z.number().min(0),
    initialRepetition: z.number().min(0),
  }),
})

export type LessonWord = z.infer<typeof lessonWordSchema>
export type LessonType = z.infer<typeof lessonSchema>['type']
export type Lesson = z.infer<typeof lessonSchema>
export type Unit = z.infer<typeof unitSchema>
export type Course = z.infer<typeof courseSchema>
export type AchievementDef = z.infer<typeof achievementDefSchema>
export type AppConfig = z.infer<typeof appConfigSchema>
export type DailyGoalConfig = AppConfig['gamification']['dailyGoal']
export type GamificationConfig = AppConfig['gamification']
export type LevelCurve = AppConfig['gamification']['levelCurve']
export type SrsConfig = AppConfig['srs']
