import { z } from 'zod'

export const lessonWordSchema = z.object({
  word: z.string().min(1),
  meaning: z.string().min(1),
  sentence: z.string().min(1),
})

export const lessonSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['lesson', 'quiz']),
  words: z.array(lessonWordSchema).min(1),
})

export const unitSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  icon: z.string().min(1),
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
            message: `Invalid course: duplicate lesson id "${lesson.id}"`,
          })
        }
        lessonIds.add(lesson.id)
        for (const word of lesson.words) {
          const key = word.word.toLowerCase()
          if (wordIds.has(key)) {
            context.addIssue({
              code: 'custom',
              message: `Invalid course: duplicate word "${word.word}"`,
            })
          }
          wordIds.add(key)
        }
      }
    }
  })

export const professionLessonsSchema = z
  .record(z.string(), z.array(lessonSchema).min(1))
  .superRefine((packs, context) => {
    const ids = new Set<string>()
    for (const lessons of Object.values(packs)) {
      for (const lesson of lessons) {
        if (ids.has(lesson.id)) {
          context.addIssue({
            code: 'custom',
            message: `Invalid profession lessons: duplicate id "${lesson.id}"`,
          })
        }
        ids.add(lesson.id)
      }
    }
  })

export const achievementDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
})

export const achievementsSchema = z.array(achievementDefSchema).min(1)

export const vocabularyEntrySchema = z.object({
  word: z.string().min(1),
  meaning: z.string().min(1),
  example: z.string().optional(),
  pos: z.string().min(1),
  synonyms: z.array(z.string()),
  rank: z.number().int().positive(),
  tier: z.enum(['very-common', 'common', 'uncommon', 'rare', 'very-rare']),
})

export const vocabularySchema = z.array(vocabularyEntrySchema).min(1)

export const librarySectionSchema = z.object({
  id: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
})

export const libraryChapterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sections: z.array(librarySectionSchema).min(1),
})

export const libraryBookSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  author: z.string().min(1),
  year: z.number().int(),
  genre: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  description: z.string().min(1),
  source: z.string().min(1),
  words: z.number().int().positive(),
  tags: z.array(z.string()).min(1),
  gutenbergId: z.number().int().positive().optional(),
  firstLine: z.string().min(1).optional(),
  quotes: z.array(z.string().min(1)).optional(),
  chapters: z.array(libraryChapterSchema).min(1),
})

export const libraryIndexBookSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  author: z.string().min(1),
  year: z.number().int(),
  genre: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  description: z.string().min(1),
  source: z.string().min(1),
  words: z.number().int().positive(),
  tags: z.array(z.string()).min(1),
  chapters: z.number().int().positive(),
  sections: z.number().int().positive(),
  gutenbergId: z.number().int().positive().optional(),
})

export const libraryIndexSchema = z.array(libraryIndexBookSchema).min(1)

export const librarySchema = z
  .array(libraryBookSchema)
  .min(1)
  .superRefine((library, context) => {
    const bookIds = new Set<string>()
    for (const book of library) {
      if (bookIds.has(book.id)) {
        context.addIssue({
          code: 'custom',
          message: `Invalid library: duplicate book id "${book.id}"`,
        })
      }
      bookIds.add(book.id)

      const localIds = new Set<string>()
      for (const chapter of book.chapters) {
        for (const id of [chapter.id, ...chapter.sections.map((section) => section.id)]) {
          if (localIds.has(id)) {
            context.addIssue({
              code: 'custom',
              message: `Invalid library: duplicate id "${id}" in book "${book.id}"`,
            })
          }
          localIds.add(id)
        }
      }
    }
  })

export const grammarExampleSchema = z.object({
  text: z.string().min(1),
  note: z.string().min(1),
})

export const grammarExerciseSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string().min(1),
    kind: z.literal('choice'),
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    answer: z.string().min(1),
    explanation: z.string().min(1),
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal('fill'),
    prompt: z.string().min(1),
    answer: z.string().min(1),
    explanation: z.string().min(1),
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal('reorder'),
    prompt: z.string().min(1),
    words: z.array(z.string().min(1)).min(2),
    answer: z.string().min(1),
    explanation: z.string().min(1),
  }),
])

export const grammarLessonSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['rule', 'quiz']),
  explanation: z.string(),
  examples: z.array(grammarExampleSchema),
  exercises: z.array(grammarExerciseSchema).min(1),
})

export const grammarUnitSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  icon: z.string().min(1),
  color: z.string().min(1),
  summary: z.string().min(1),
  lessons: z.array(grammarLessonSchema).min(1),
})

export const grammarSchema = z
  .array(grammarUnitSchema)
  .min(1)
  .superRefine((grammar, context) => {
    const ids = new Set<string>()
    for (const unit of grammar) {
      if (ids.has(unit.id)) {
        context.addIssue({ code: 'custom', message: `Invalid grammar: duplicate id "${unit.id}"` })
      }
      ids.add(unit.id)
      for (const lesson of unit.lessons) {
        for (const id of [lesson.id, ...lesson.exercises.map((exercise) => exercise.id)]) {
          if (ids.has(id)) {
            context.addIssue({ code: 'custom', message: `Invalid grammar: duplicate id "${id}"` })
          }
          ids.add(id)
        }
      }
    }
  })

export const dialogueLineSchema = z.object({
  id: z.string().min(1),
  speaker: z.string().min(1),
  text: z.string().min(1),
  options: z
    .array(
      z.object({
        text: z.string().min(1),
        correct: z.boolean(),
        reply: z.string().min(1),
      }),
    )
    .min(2)
    .optional(),
})

export const dialogueSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  icon: z.string().min(1),
  lines: z.array(dialogueLineSchema).min(2),
})

export const dialoguesSchema = z
  .array(dialogueSchema)
  .min(1)
  .superRefine((dialogues, context) => {
    const ids = new Set<string>()
    for (const dialogue of dialogues) {
      for (const id of [dialogue.id, ...dialogue.lines.map((line) => line.id)]) {
        if (ids.has(id)) {
          context.addIssue({ code: 'custom', message: `Invalid dialogue: duplicate id "${id}"` })
        }
        ids.add(id)
      }
    }
  })

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
export type ProfessionLessons = z.infer<typeof professionLessonsSchema>
export type AchievementDef = z.infer<typeof achievementDefSchema>
export type VocabularyEntry = z.infer<typeof vocabularyEntrySchema>
export type LibrarySection = z.infer<typeof librarySectionSchema>
export type LibraryChapter = z.infer<typeof libraryChapterSchema>
export type LibraryBook = z.infer<typeof libraryBookSchema>
export type Library = z.infer<typeof librarySchema>
export type LibraryIndexBook = z.infer<typeof libraryIndexBookSchema>
export type LibraryIndex = z.infer<typeof libraryIndexSchema>
export type GrammarExercise = z.infer<typeof grammarExerciseSchema>
export type GrammarLesson = z.infer<typeof grammarLessonSchema>
export type GrammarUnit = z.infer<typeof grammarUnitSchema>
export type Grammar = z.infer<typeof grammarSchema>
export type DialogueLine = z.infer<typeof dialogueLineSchema>
export type Dialogue = z.infer<typeof dialogueSchema>
export type Dialogues = z.infer<typeof dialoguesSchema>
export type AppConfig = z.infer<typeof appConfigSchema>
export type DailyGoalConfig = AppConfig['gamification']['dailyGoal']
export type GamificationConfig = AppConfig['gamification']
export type LevelCurve = AppConfig['gamification']['levelCurve']
export type SrsConfig = AppConfig['srs']
