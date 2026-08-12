# Aura — Design System

This document defines how Aura should look, feel and behave. It is the single
source of truth for the design: brand, icons, typography, color palette,
design tokens and component specifications.

Everything here is **offline-first and language-agnostic**: fonts and icons are
bundled with the app (no CDNs), and all copy is English.

---

## 1. Brand

- **Name**: Aura
- **Tagline**: Learn English at full power.
- **Mascot**: 🦉 an owl (the "teacher"). Used decoratively in greetings/empty states.

### Logo

A minimalist, elegant mark: a **soaring bird** (the Lucide `Bird` icon) —
**wings taking flight**, echoing the owl mascot and the idea of learning to
soar. One icon from our own set, nothing else.

- **App icon** (`assets/aura-logo.svg`): green gradient rounded square
  (`#5ece0b → #3f9300`, rx 232), white bird, stroke 2.2.
- **Brand mark** (in-app, `src/components/logo.tsx`): the `Bird` icon in
  `--aura-green` on transparent; optional solid-green rounded background
  (radius 22% of size).
- Used in: top bar (26px), home hero (56px, with background), favicon,
  web manifest icons, OG image. Wordmark "Aura" in Nunito 800.
- **Personality**: playful but serious about learning. Encouraging, warm,
  never condescending. Think Duolingo energy, cleaner execution.
- **Shape language**: rounded and friendly. Large radii, chunky bold buttons
  with a subtle 3D press, soft shadows, generous white space.

### Design principles

1. **Encouragement first** — every interaction should feel rewarding.
   Correct answers are green and celebratory; mistakes are never punishing.
2. **Clarity over decoration** — one primary action per screen, obvious
   affordances, no dead-end empty states.
3. **Consistent & calm** — a small, disciplined token set. Nothing ad hoc.
4. **Offline & fast** — design must never depend on network fonts, images or
   icons; everything is bundled and the main bundle stays small.
5. **Accessible** — readable contrast, 44px touch targets, full keyboard/AT
   support, no flashing.

---

## 2. Iconography

### Icon package (adopt): **Lucide**

- Package: `lucide-react` (MIT, tree-shakable, stroke-based).
- **Use Lucide for all functional/UI icons** (navigation, close, mic, speaker,
  search, heart, flame, lightning, check, x, etc.).
- Specs: default **24×24** viewBox, **2px stroke**, `currentColor`, rounded
  line caps. Size via the typography scale (`--icon-sm` 16 / `--icon-md` 20 /
  `--icon-lg` 24 / `--icon-xl` 32).
- Icons inherit color from text color; never hard-code icon color.

### Emoji policy

Emojis are **decorative/content only**, never functional affordances:

| Where                                            | Emoji allowed       | Replaced by Lucide |
| ------------------------------------------------ | ------------------- | ------------------ |
| Unit icons (course map)                          | ✅ `👋` `🍎` `✈️` … | —                  |
| Achievement emojis                               | ✅                  | —                  |
| Greeting / empty states                          | ✅                  | —                  |
| Close (✕), speaker (🔈/🔊), mic (🎙), nav, badges | ❌                  | ✅                 |

> Implementation: install `lucide-react` and swap the functional emoji usages
> (`speech-button`, `bottom-nav`, `top-bar`, close buttons, etc.). Keep the
> content emojis.

---

## 3. Typography

### Font (adopt): **Nunito** (variable)

- Rounded, friendly geometric sans — matches the Duolingo-inspired brand.
- **Self-hosted**: bundle `Nunito[wght].woff2` (OFL license) in
  `src/assets/fonts/` and load via `@font-face` (no CDN — CSP + offline).
- Fallback stack: `-apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`.

### Scale (design tokens)

| Token         | Size / weight     | Used for                       |
| ------------- | ----------------- | ------------------------------ |
| `--font-xs`   | 11–12px / 600     | badges, meta labels            |
| `--font-sm`   | 13–14px / 400–600 | secondary text, hints          |
| `--font-base` | 15–16px / 400–600 | body, buttons                  |
| `--font-lg`   | 18–20px / 700     | sub-headings, prompts          |
| `--font-xl`   | 24–28px / 800     | screen titles, word displays   |
| `--font-2xl`  | 32–36px / 800     | review card word, hero numbers |

### Rules

- Headings use **800** weight, tight line-height (1.1–1.25).
- Body uses **1.5** line-height.
- Buttons/labels: **800** weight, medium letter-spacing.
- Numerals (XP, streaks, scores) use the display weight for emphasis.
- `text-transform: uppercase` only for micro-labels (unit lesson labels, badges).

---

## 4. Color palette

### Base palette (already in `:root`)

| Token               | Value     | Use                                     |
| ------------------- | --------- | --------------------------------------- |
| `--aura-green`      | `#58cc02` | primary action, success, correct        |
| `--aura-green-dark` | `#46a302` | green press shadow, text on light green |
| `--aura-blue`       | `#1cb0f6` | info, links, secondary actions          |
| `--aura-blue-dark`  | `#1899d6` | blue press shadow                       |
| `--aura-orange`     | `#ff9600` | alerts, readability warnings            |
| `--aura-red`        | `#ff4b4b` | errors, hearts, wrong answers           |
| `--aura-red-dark`   | `#d33131` | red press shadow                        |
| `--aura-purple`     | `#ce82ff` | unit accent, part-of-speech bars        |
| `--aura-pink`       | `#ff86e8` | unit accent                             |
| `--aura-yellow`     | `#ffc800` | streak/goal accents, progress fill      |
| `--aura-ink`        | `#3c3c3c` | headings, highest-contrast text         |
| `--aura-text`       | `#4b4b4b` | body text                               |
| `--aura-muted`      | `#8a8a8a` | secondary/meta text (see contrast note) |
| `--aura-bg`         | `#f0f4ef` | app background                          |
| `--aura-card`       | `#ffffff` | surfaces, cards                         |
| `--aura-border`     | `#e5e5e5` | borders, dividers, tracks               |

### Semantic usage rules

- **Green = correct / primary.** Correct answers use `#d7ffb8` fills; wrong uses
  `#ffdfe0` fills. (Both exist as "soft" variants — formalize as
  `--aura-green-soft` / `--aura-red-soft`.)
- **Hearts** always red; **streak/goal** always yellow/orange.
- Text-on-color buttons are always white; colored text uses the `-dark` variant.
- Do not use purple/pink/orange for state feedback — they are accents only.
- Background tint of `--aura-bg` is a soft green-grey; surfaces are white.

### Contrast (WCAG AA)

| Pair                               | Ratio | Status                                                                                                         |
| ---------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------- |
| `--aura-ink` on white              | ~12:1 | ✅                                                                                                             |
| `--aura-text` on `--aura-bg`/white | ~7:1  | ✅                                                                                                             |
| `--aura-muted` (#8a8a8a) on white  | ~3:1  | ⚠️ only for large/decorative text                                                                              |
| white on `--aura-green`            | ~2:1  | ⚠️ buttons rely on the `-dark` shadow for shape; ensure ≥3:1 for text by using `--aura-green-dark` when needed |

> Rule: never use `--aura-muted` for text smaller than 13px on `--aura-bg`.

---

## 5. Spacing

4px base grid. Use spacing tokens, never magic numbers:

`--space-1: 4px` · `--space-2: 8px` · `--space-3: 12px` · `--space-4: 16px` ·
`--space-5: 20px` · `--space-6: 24px` · `--space-8: 32px` · `--space-12: 48px`

Guidelines:

- Screen content padding: `--space-4` (16px) sides; bottom nav reserves 96px.
- Card padding: `--space-3`–`--space-4`.
- Component gaps: `--space-2`–`--space-3`; section gaps: `--space-5`+.
- Touch targets: **≥ 44px** minimum hit area (icon buttons pad to 44px).

---

## 6. Radii

| Token           | Value | Use                                             |
| --------------- | ----- | ----------------------------------------------- |
| `--radius-sm`   | 10px  | pills, small buttons, inputs                    |
| `--radius-md`   | 12px  | list items, match cards, sense blocks           |
| `--radius-lg`   | 14px  | primary buttons, option cards (`--aura-radius`) |
| `--radius-xl`   | 18px  | flip cards, review card, result screens         |
| `--radius-full` | 999px | progress bars, badges, speech buttons           |

---

## 7. Elevation & shadows

| Token         | Value                         | Use                     |
| ------------- | ----------------------------- | ----------------------- |
| `--shadow-xs` | `0 1px 2px rgb(0 0 0 / 6%)`   | subtle rows             |
| `--shadow-sm` | `0 2px 4px rgb(0 0 0 / 8%)`   | cards (`--aura-shadow`) |
| `--shadow-md` | `0 6px 16px rgb(0 0 0 / 12%)` | popovers, toasts        |

### The "3D press" button pattern (signature)

Primary/secondary buttons use a bottom edge of the same hue:

```css
.aura-button--primary {
  background: var(--aura-green);
  box-shadow: 0 4px 0 var(--aura-green-dark);
}
.aura-button:active {
  transform: translateY(2px);
  box-shadow: none;
}
```

---

## 8. Motion

- Interaction: **80–100ms** ease-out (press, taps).
- Feedback transitions (progress, toast, feedback flash): **150–300ms** ease.
- Toast entrance: 250ms ease, slide down + fade; exit: fade.
- Respect `prefers-reduced-motion`: disable the slide, keep fades.
- No infinite animations except a subtle, optional pulse for streak/XP (avoid).

---

## 9. Component design system

### Buttons (`Button`, variants: primary / secondary / ghost / danger / success)

- Base: 800 weight, `--radius-lg`, padding `13px 18px`, letter-spacing 0.5px.
- Primary = green, secondary = blue, danger = red, success = green, ghost =
  outlined blue. `--block` = full width.
- Disabled: opacity 0.5, no press. Active: 2px press (see §7).
- Sizes: `sm` (compact), `md` (default), `lg` (full rows, e.g. lesson footer).

### Progress bar

- Track `--aura-border`, fill `--aura-green` (goal/lesson) or `--aura-yellow`
  (daily goal), `--radius-full`, height 8–14px, width animates 300ms.

### Top bar

- Sticky, white, 2px `--aura-border` bottom. Stats (streak 🔥, XP ⚡, hearts ❤️)
  in `--aura-ink` 15px; daily-goal mini progress at right.

### Bottom navigation

- Fixed, max-width 720px, 4 items (Home / Dictionary / Analyzer / Review).
- Active item: `--aura-green-dark`, 700 weight + icon tint.
- Badge (due-count): red pill, min 18px.

### Cards

- White surface, `--radius-lg`–`xl`, `--shadow-sm`. Hover: subtle lift only for
  clickable cards.

### Exercise elements

- **Options**: white, 2px `--aura-border`, `--radius-lg`; hover border-green;
  correct = green fill `#d7ffb8`; wrong = red fill `#ffdfe0`.
- **Inputs**: white, 2px border, focus ring `--aura-blue`.
- **Match cards**: 2×2 grid; selected blue fill, matched green, error red flash
  (600ms).
- **Flip card**: large white card, tap to flip, `--radius-xl`.
- **Hint card**: soft green tint, shows sentence + meaning after answering.

### Badges / tiers

- Pill `--radius-full`, 12px/600. Frequency tiers: very-common/common green,
  uncommon amber, rare/very-rare red.

### Feedback & states

- Correct: green flash + auto-advance (900ms). Wrong: red flash + "Continue".
- Hearts lost: hearts turn red. Out of hearts: dedicated failure screen.
- Toast (achievement): dark `--aura-ink` surface, white text, top-center.

### Empty states

Always include a friendly icon (emoji allowed), one line of guidance and a
clear next action (e.g. "Finish lessons to fill your review queue" + CTA).

---

## 10. Layout

- App shell: **max-width 720px**, centered, `min-height 100vh`.
- Sticky top bar; fixed bottom nav (content reserves 96px bottom padding).
- Lesson player: full-height column, header (close + progress + hearts),
  exercise body, footer (Continue / progress count).
- Result screens: centered stack, 64px hero emoji, stat cards, actions.
- Content column: 1 column on mobile; never requires landscape.

---

## 11. Accessibility

- All interactive elements: 44px hit area, visible focus ring (2px, `--aura-blue`),
  `aria-label` where text is not present.
- Icons are `aria-hidden` when decorative; never a sole affordance without text.
- Contrast: see §4. No text under 13px at `--aura-muted`.
- Semantic HTML (`button`, `nav`, `section`, `details/summary`), one `h1` per screen.
- Speech alternatives: speak exercises self-grade when recognition is unavailable.
- `prefers-reduced-motion` honored.

---

## 12. Implementation status & roadmap

**Already implemented** (`src/styles/global.css`):

- Base palette tokens in `:root`; layout shell; 3D press buttons; progress bars;
  top bar / bottom nav; exercise options, match/flip cards; tier badges; toast.

**To adopt (per this doc):**

1. `lucide-react` for all functional icons (replace speaker 🔈/🔊, close ✕, nav
   emojis, mic, search). Keep content emojis.
2. Bundle **Nunito** variable woff2; `@font-face` in CSS; apply scale tokens.
3. Formalize the token set into semantic names + add missing tokens
   (spacing, radii, shadow, font scale, `-soft` colors, focus ring).
4. Contrast pass: darken `--aura-muted` for small text or gate its usage.
5. Dark mode (future): tokens are the single switch point.
6. Extract `tokens.css` + `components.css` from `global.css` as the design
   system grows.

**File ownership**

- Design tokens & base styles: `src/styles/global.css` (`:root` + layout).
- Component classes follow **BEM** (`block`, `block__element`, `block--modifier`).
- This document is the source of truth; component code must stay in sync.
