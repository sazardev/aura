import { afinn165 } from 'afinn-165'
import { automatedReadability } from 'automated-readability'
import { colemanLiau } from 'coleman-liau'
import nlp from 'compromise'
import { daleChall } from 'dale-chall'
import { daleChallFormula } from 'dale-chall-formula'
import { flesch } from 'flesch'
import { fleschKincaid } from 'flesch-kincaid'
import { gunningFog } from 'gunning-fog'
import { retext } from 'retext'
import retextContractions from 'retext-contractions'
import retextEquality from 'retext-equality'
import retextIndefiniteArticle from 'retext-indefinite-article'
import retextIntensify from 'retext-intensify'
import retextReadability from 'retext-readability'
import retextRedundantAcronyms from 'retext-redundant-acronyms'
import retextRepeatedWords from 'retext-repeated-words'
import retextSimplify from 'retext-simplify'
import { smogFormula } from 'smog-formula'
import { syllable } from 'syllable'
import { lemmatizeAdjective, lemmatizeNoun, lemmatizeVerb } from 'wink-lemmatizer'

import type { FrequencyTier } from '@/engine/frequency'

import { frequencyOf, frequencyTierOf } from '@/engine/frequency'
import { normalizeText } from '@/lib/strings'

export interface AnalyzerNote {
  source: string
  ruleId: string
  message: string
  actual: string | undefined
  expected: string[]
  line: number | undefined
  column: number | undefined
}

export interface ReadabilityScore {
  name: string
  value: number
  unit: 'puntos' | 'grado' | 'edad' | 'porcentaje'
}

export interface AnalyzerWordStat {
  word: string
  count: number
  pos: string
  tier: FrequencyTier | undefined
}

export interface AnalyzerResult {
  totalWords: number
  uniqueWords: number
  sentences: number
  syllables: number
  averageWordLength: number
  posDistribution: Record<string, number>
  topWords: AnalyzerWordStat[]
  readability: ReadabilityScore[]
  readingAge: number | undefined
  sentiment: number | undefined
  unknownWords: string[]
  notes: AnalyzerNote[]
  suggestions: string[]
}

const AFINN = new Map(Object.entries(afinn165))

const TAG_TO_POS: Record<string, string> = {
  Adjective: 'adjective',
  Adverb: 'adverb',
  Auxiliary: 'auxiliary',
  Cardinal: 'number',
  Conjunction: 'conjunction',
  Determiner: 'determiner',
  Expression: 'interjection',
  Modal: 'modal',
  Noun: 'noun',
  Possessive: 'possessive',
  Preposition: 'preposition',
  Pronoun: 'pronoun',
  ProperNoun: 'proper noun',
  QuestionWord: 'question word',
  Value: 'number',
  Verb: 'verb',
}

const DEFAULT_POS = 'other'

function coarsePos(tags: readonly string[]): string {
  for (const tag of tags) {
    const mapped = TAG_TO_POS[tag]
    if (mapped !== undefined) return mapped
  }
  return DEFAULT_POS
}

function lemmatize(input: string): string {
  const candidates = [lemmatizeNoun(input), lemmatizeVerb(input), lemmatizeAdjective(input)].filter(
    (candidate) => candidate !== input && candidate.length > 0,
  )
  if (candidates.length === 0) return input
  return candidates.toSorted((a, b) => a.length - b.length)[0] ?? input
}

function isUnfamiliar(word: string, easyWords: ReadonlySet<string>): boolean {
  const lemma = lemmatize(word).toLowerCase()
  if (easyWords.has(lemma)) return false
  if (lemma.endsWith('s') && easyWords.has(lemma.slice(0, -1))) return false
  return true
}

const EASY_WORDS = new Set(daleChall.map((word) => word.toLowerCase()))

function computeReadability(counts: {
  word: number
  sentence: number
  syllable: number
  character: number
  letter: number
  complexword: number
  unfamiliarword: number
}): ReadabilityScore[] {
  const scores: ReadabilityScore[] = [
    {
      name: 'Flesch Reading Ease',
      value: flesch(counts),
      unit: 'puntos',
    },
    {
      name: 'Flesch-Kincaid',
      value: fleschKincaid(counts),
      unit: 'grado',
    },
    {
      name: 'ARI',
      value: automatedReadability(counts),
      unit: 'grado',
    },
    {
      name: 'Coleman-Liau',
      value: colemanLiau(counts),
      unit: 'grado',
    },
    {
      name: 'Dale-Chall',
      value: daleChallFormula(counts),
      unit: 'grado',
    },
    {
      name: 'Gunning Fog',
      value: gunningFog(counts),
      unit: 'grado',
    },
    {
      name: 'SMOG',
      value: smogFormula(counts),
      unit: 'grado',
    },
  ]
  return scores.filter((score) => Number.isFinite(score.value))
}

/**
 * Runs the retext pipeline and collects style/grammar notes.
 */
async function runNotes(text: string): Promise<AnalyzerNote[]> {
  const processor = retext()
    .use(retextContractions)
    .use(retextIndefiniteArticle)
    .use(retextRedundantAcronyms)
    .use(retextRepeatedWords)
    .use(retextIntensify)
    .use(retextEquality)
    .use(retextSimplify)
    .use(retextReadability, { age: 16 })

  const file = await processor.process(text)

  return file.messages.map((message) => ({
    source: message.source ?? 'retext',
    ruleId: message.ruleId ?? '',
    message: message.reason,
    actual: message.actual,
    expected: message.expected ?? [],
    line: message.line,
    column: message.column,
  }))
}

/**
 * Analyzes a full text: readability, grammar, sentiment, word frequency
 * and learning opportunities.
 */
export async function analyzeText(text: string): Promise<AnalyzerResult> {
  const trimmed = text.trim()
  const document = nlp(trimmed)
  const sentences = document.sentences().length
  const tagRows = document.terms().out('tags') as Record<string, string[]>[]

  let syllables = 0
  let letters = 0
  let characters = 0
  let complexWordCount = 0
  const counts = new Map<string, number>()
  const posCounts = new Map<string, number>()

  for (const row of tagRows) {
    for (const [rawWord, tags] of Object.entries(row)) {
      const word = normalizeText(rawWord)
      if (word.length > 0) {
        counts.set(word, (counts.get(word) ?? 0) + 1)
        const wordSyllables = syllable(word)
        syllables += wordSyllables
        if (wordSyllables >= 3) complexWordCount += 1
        letters += word.length
        characters += word.length
        const pos = coarsePos(tags)
        posCounts.set(pos, (posCounts.get(pos) ?? 0) + 1)
      }
    }
  }

  const totalWords = [...counts.values()].reduce((sum, count) => sum + count, 0)
  const uniqueWords = counts.size
  const unfamiliarWordCount = [...counts.keys()].filter((word) =>
    isUnfamiliar(word, EASY_WORDS),
  ).length

  const readability = computeReadability({
    word: totalWords,
    sentence: sentences,
    syllable: syllables,
    character: characters,
    letter: letters,
    complexword: complexWordCount,
    unfamiliarword: unfamiliarWordCount,
  })

  const gradeScores = readability.filter((score) => score.unit === 'grado')
  const readingAge =
    gradeScores.length > 0
      ? gradeScores.reduce((sum, score) => sum + score.value, 0) / gradeScores.length + 5
      : undefined

  let sentiment = 0
  for (const word of counts.keys()) {
    sentiment += AFINN.get(word) ?? 0
  }
  const sentimentScore = totalWords > 0 ? sentiment / totalWords : undefined

  const topWords = [...counts]
    .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([word, count]) => ({
      word,
      count,
      pos: coarsePos(tagsFor(tagRows, word)),
      tier: frequencyTierOf(word),
    }))

  const unknownWords = [...counts.keys()]
    .filter((word) => frequencyOf(word) === undefined && lemmatize(word) !== word)
    .toSorted((a, b) => a.localeCompare(b))

  const notes = await runNotes(trimmed)
  const suggestions = notes.flatMap((note) => note.expected).slice(0, 20)

  return {
    totalWords,
    uniqueWords,
    sentences,
    syllables,
    averageWordLength: totalWords > 0 ? letters / totalWords : 0,
    posDistribution: Object.fromEntries([...posCounts].toSorted((a, b) => b[1] - a[1])),
    topWords,
    readability,
    readingAge,
    sentiment: sentimentScore,
    unknownWords,
    notes,
    suggestions,
  }
}

function tagsFor(tagRows: Record<string, string[]>[], word: string): string[] {
  const row = tagRows.find((entry) => Object.keys(entry)[0] === word)
  if (row === undefined) return []
  return row[Object.keys(row)[0] ?? ''] ?? []
}
