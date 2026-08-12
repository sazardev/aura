# Aura data

All content lives here, outside the code, as readable JSON. The engine
(`src/engine/`) loads it with runtime validation and **fails fast** if
something is wrong, so you can edit these files safely.

## `course.json` — the course

```jsonc
{
  "id": "greetings", // unique unit id
  "title": "Greetings & Introductions",
  "emoji": "👋", // unit icon
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

Each lesson carries 5 words (the exercise generator uses them to build
choice, listen, type, tap, speak, match and flashcard exercises). Words and
ids must be unique across the whole course.

## `achievements.json` — achievements

A list of `{ id, name, description, emoji }` objects. The `id`s must match
the rules defined in `src/engine/achievements.ts`.

## `config.json` — game balance

Gamification numbers (XP per exercise/lesson, hearts, daily goals, level
curve) and the SM-2 spaced-repetition parameters. Edit it to rebalance the
app without touching code.
