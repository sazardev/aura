# Aura data

All content lives here, outside the code, as readable JSON. The engine
(`src/engine/`) loads it with runtime validation and **fails fast** if
something is wrong, so you can edit these files safely.

## `course.json` — the hand-authored course

The guided curriculum (9 units, 27 lessons, 135 words). Each lesson carries
5 words; words and ids must be unique across the whole course. Topics span
A1→A2: greetings, food, travel, work, body, verbs, home & family, shopping and
weather.

```jsonc
{
  "id": "greetings", // unique unit id
  "title": "Greetings & Introductions",
  "icon": "MessageCircle", // unit icon
  "color": "#58cc02", // color of the unit's lesson nodes
  "lessons": [
    {
      "id": "greetings-1", // unique lesson id (exercises are deterministic by id)
      "title": "Hello and Goodbye",
      "type": "lesson", // "lesson" | "quiz"
      "words": [
        {
          "word": "hello", // the English word
          "meaning": "a greeting you say when you meet someone", // short English definition
          "sentence": "Hello!", // example sentence in English
        },
      ],
    },
  ],
}
```

## `course-expansion.json` — generated course units

More units (6 units, 18 lessons, 90 words) generated from the real engines
(WordNet + SUBTLEX-US) with `npm run gen:vocab`. Same schema as `course.json`.
It is merged with `course.json` at load time (`src/engine/lessons.ts`).

## `vocabulary.json` — the giant vocabulary bank

**3,884 high-frequency words** generated from WordNet + SUBTLEX-US
(`npm run gen:vocab`), each with an English definition, a WordNet example
(when available), part of speech, synonyms, frequency rank and tier. It powers
instant offline lookups in the Dictionary (plus a "Surprise me" explorer) and
enriches the Analyzer's "words to learn". Loaded lazily by the Dictionary and
Analyzer screens, so it never slows down startup.

```jsonc
{
  "word": "walk",
  "meaning": "use one's feet to advance",
  "example": "Let's go for a walk in the park.",
  "pos": "noun",
  "synonyms": ["walking", "march"],
  "rank": 148,
  "tier": "very-common",
}
```

## `achievements.json` — achievements

A list of `{ id, name, description, icon }` objects (icon = Lucide icon name). The `id`s must match
the rules defined in `src/engine/achievements.ts`.

## `library.json` — the classics library (index)

**Public-domain books** (Project Gutenberg), split into chapters and reading
sections, generated with `npm run gen:library` from raw texts in
`scripts/books/` (gitignored — download them and re-run the generator to add
more books). `library.json` is a lightweight **index** used by the Library
grid and progress bars; each full book lives in its own `library/<id>.json`,
code-split and loaded on demand when the book is opened.

```jsonc
// src/data/library.json — index entry (no chapter text)
{
  "id": "alice-in-wonderland",
  "title": "Alice's Adventures in Wonderland",
  "author": "Lewis Carroll",
  "year": 1865,
  "genre": "Fantasy",
  "difficulty": 3, // 1..5
  "description": "…",
  "tags": ["Children", "Fantasy", "Classic"],
  "source": "Project Gutenberg",
  "words": 27261,
  "chapters": 12, // count
  "sections": 163, // count
  "gutenbergId": 11,
}
```

```jsonc
// src/data/library/alice-in-wonderland.json — full book (chapters)
{
  "id": "alice-in-wonderland",
  "title": "…",
  "author": "…",
  "year": 1865,
  "genre": "Fantasy",
  "difficulty": 3,
  "description": "…",
  "tags": ["…"],
  "source": "Project Gutenberg",
  "words": 27261,
  "gutenbergId": 11,
  "firstLine": "Alice was beginning to get very tired…",
  "quotes": ["\"Curiouser and curiouser!\" cried Alice.", "…"],
  "chapters": [
    {
      "id": "c1",
      "title": "Down the Rabbit-Hole",
      "sections": [{ "id": "s1-1", "paragraphs": ["…"] }],
    },
  ],
}
```

Book/chapter/section ids must be unique within a book. The reader also stores
imported documents (PDF/TXT/MD) as `LibraryBook` objects in `localStorage`.

## `config.json` — game balance

Gamification numbers (XP per exercise/lesson, hearts, daily goals, level
curve) and the SM-2 spaced-repetition parameters. Edit it to rebalance the
app without touching code.

## Regenerating the generated data

```bash
npm run gen:vocab   # rebuilds vocabulary.json and course-expansion.json
```
