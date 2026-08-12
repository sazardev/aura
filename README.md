# 🦉 Aura — Aprende inglés al máximo

**Aura no es un traductor: es una forma de aprender inglés.** Un curso estilo Duolingo,
**100% local, gratuito, libre y open source**, con diccionario completo, analizador de
textos y repaso espaciado. Tus datos nunca salen de tu dispositivo.

Construida con **Tauri 2 + React 19 + TypeScript 7** (compilador nativo `tsgo`) y un stack
de calidad al máximo: ESLint type-aware, Prettier, Stylelint, Vitest, Clippy y rustfmt.

---

## ✨ Funcionalidades

| Módulo                      | Qué hace                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 📚 **Curso**                | 18 lecciones en 6 unidades temáticas con 7 tipos de ejercicios: opción múltiple, escucha, escribir, construir frases, hablar, emparejar y tarjetas.                                         |
| 🧠 **Repaso espaciado**     | Algoritmo **SM-2** (SuperMemo) para memorizar vocabulario de forma científica.                                                                                                              |
| 📖 **Diccionario WordNet**  | Base completa de WordNet 3.0 (~35 MB) embebida en la app: definiciones, ejemplos, sinónimos, antónimos, hiperónimos e hipónimos.                                                            |
| 🔤 **Frecuencias reales**   | Corpus **SUBTLEX-US** (74.286 palabras) para saber si una palabra es común, rara o extraña.                                                                                                 |
| 🧪 **Analizador de textos** | Legibilidad (Flesch, Gunning Fog, SMOG, ARI, Dale–Chall, Coleman-Liau…), gramática y estilo (ecosistema retext), sentimiento (AFINN-165), categorías gramaticales y palabras para aprender. |
| 🔊 **Voz y pronunciación**  | Síntesis de voz (TTS) en cada palabra y ejercicio de hablar con reconocimiento de voz cuando el sistema lo soporta.                                                                         |
| 🎮 **Gamificación**         | XP, niveles, rachas, corazones, metas diarias y 15 logros.                                                                                                                                  |
| 🔒 **Privacidad total**     | Sin cuenta, sin internet, sin telemetría. Todo vive en tu máquina.                                                                                                                          |

> Aura usa traducciones al español como _andamiaje pedagógico_, igual que Duolingo,
> pero su objetivo es que **pienses y produzcas en inglés**.

---

## 🚀 Empezar

Requisitos: [Node.js ≥ 22](https://nodejs.org), [Rust ≥ 1.77](https://rustup.rs) y las
dependencias de [Tauri](https://tauri.app/start/prerequisites/).

```bash
npm install          # instala dependencias
npm run tauri:dev    # abre la app de escritorio en modo desarrollo
npm run dev          # solo el frontend (sin diccionario WordNet)
```

El diccionario WordNet se copia automáticamente desde `node_modules/wordnet-db` a
`src-tauri/resources/wn/` antes de compilar (`npm run copy:wn`).

---

## 🛠 Scripts

| Comando                 | Descripción                                                     |
| ----------------------- | --------------------------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo Vite (puerto 1420).                      |
| `npm run tauri:dev`     | App Tauri en modo desarrollo.                                   |
| `npm run tauri:build`   | Build release de escritorio (deb, AppImage, etc.).              |
| `npm run typecheck`     | TypeScript 7 (`tsgo`, nativo) — typecheck de todo el proyecto.  |
| `npm run lint`          | ESLint 10 con rulesets type-aware máximos (strict + stylistic). |
| `npm run format`        | Prettier (escribe).                                             |
| `npm run stylelint`     | Stylelint (orden y estilo del CSS).                             |
| `npm run lint:rust`     | Clippy con `-D warnings`.                                       |
| `npm run format:rust`   | rustfmt en modo check.                                          |
| `npm run test`          | Vitest (37+ tests del motor).                                   |
| `npm run test:coverage` | Cobertura de código.                                            |
| `npm run docs`          | TypeDoc de la API interna en `docs/`.                           |
| `npm run analyze`       | `typecheck` + `lint` + `stylelint` + `format:check`.            |
| `npm run ci`            | Todo: análisis, Rust, tests y build.                            |

---

## 🧱 Arquitectura

```
src/
├── engine/          # Motor puro y testeable (sin React)
│   ├── lessons.ts       # Curso: 6 unidades, 18 lecciones, 90 palabras
│   ├── exercises.ts     # Generador determinista de ejercicios (RNG con semilla)
│   ├── srs.ts           # Repaso espaciado SM-2
│   ├── xp.ts            # XP, niveles y rachas
│   ├── achievements.ts  # 15 logros
│   ├── frequency.ts     # SUBTLEX-US: frecuencias y dificultad
│   ├── dictionary.ts    # Cliente del diccionario WordNet (vía Rust)
│   ├── analyzer.ts      # Legibilidad + retext + sentimiento + POS
│   └── speech.ts        # TTS y reconocimiento de voz
├── components/       # UI reutilizable (botones, barras, ejercicios…)
├── screens/          # Pantallas: inicio, lección, diccionario, analizador, repaso
├── state/store.ts    # Estado global (zustand + persistencia local)
├── hooks/            # useSpeech, useDebouncedValue
└── lib/              # tauri, fechas, RNG, strings
src-tauri/
├── src/lib.rs        # Comandos Rust: lookup_word (WordNet), read_text_file
├── resources/wn/     # Datos de WordNet 3.0 (generados en build)
└── capabilities/     # Permisos mínimos
```

**Decisiones técnicas clave**

- **TypeScript 7 + 6 en paralelo**: el compilador nativo (`tsc`, 10× más rápido)
  hace el typecheck; `typescript-eslint` usa el API de TS 6.0 vía el paquete
  de compatibilidad `@typescript/typescript6` (el enfoque recomendado por el equipo de TS).
- **WordNet en Rust**: el crate `wordnet` hace búsqueda binaria perezosa sobre los
  ficheros `index.*`/`data.*`, cargándolos solo la primera vez que buscas una palabra.
- **Ejercicios deterministas**: cada lección genera siempre los mismos ejercicios
  (RNG con semilla por id), ideal para testear y rehacer lecciones.
- **Sin acceso a red**: `connect-src` está restringido por CSP a la IPC de Tauri.

---

## 🧪 Calidad

- **37 tests** de Vitest sobre el motor (SM-2, rachas, frecuencias, ejercicios,
  analizador de textos, strings) más un smoke test de la UI.
- **ESLint 10** con `recommended` + `recommendedTypeChecked` + `strictTypeChecked` +
  `stylisticTypeChecked`, react-hooks, react-refresh, unicorn, jsdoc y perfectionist.
- **Stylelint** con orden de propiedades estándar.
- **Clippy** estricto y **rustfmt** en el backend.
- CI en GitHub Actions: análisis, tests, build de frontend y `cargo check`.

---

## 📄 Licencia

**MIT** — libre, gratuita y para todos. Usa WordNet (Princeton), datos de frecuencia
SUBTLEX-US y AFINN-165, todos con licencias permisivas.

---

## 🗺 Roadmap

- [ ] Más unidades y lecciones (curso completo hasta nivel B1)
- [ ] Historias interactivas y retos por tiempo
- [ ] Exportar/importar progreso (JSON)
- [ ] Módulo de verbos irregulares
- [ ] Práctica de escritura libre con corrección

Hecho con ❤️ para quien quiere dominar el inglés, sin pagar, sin internet y sin
entregar sus datos.
