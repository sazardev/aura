# Datos de Aura

Todo el contenido se mantiene aquí, fuera del código, en JSON legible. El motor
(`src/engine/`) lo carga con validación en runtime y **falla rápido** si algo
está mal, así que puedes editar estos archivos con seguridad.

## `course.json` — el curso

```jsonc
{
  "id": "saludos", // id único de la unidad
  "title": "Saludos y presentaciones",
  "emoji": "👋", // icono de la unidad
  "color": "#58cc02", // color de los nodos de la unidad
  "lessons": [
    {
      "id": "saludos-1", // id único de la lección (los ejercicios son deterministas por id)
      "title": "Hola y adiós",
      "type": "leccion", // "leccion" | "cuestionario"
      "words": [
        {
          "word": "hello", // palabra en inglés
          "translation": "hola", // traducción al español (andamiaje)
          "meaning": "saludo…", // definición breve en español
          "sentence": "Hello!", // ejemplo en inglés
          "sentenceTranslation": "¡Hola!", // traducción del ejemplo
        },
      ],
    },
  ],
}
```

Cada lección lleva 5 palabras (el generador de ejercicios las usa para crear
choice, listen, type, tap, speak, match y flashcards). Palabras e ids deben
ser únicos en todo el curso.

## `achievements.json` — logros

Lista de objetos `{ id, name, description, emoji }`. Los `id` deben coincidir
con las reglas definidas en `src/engine/achievements.ts`.

## `config.json` — equilibrio del juego

Números de gamificación (XP por ejercicio/lección, corazones, metas diarias,
curva de niveles) y parámetros del algoritmo de repaso SM-2. Edítalo para
rebalancear la app sin tocar código.
