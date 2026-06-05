# ArtikleJar — Build Brief

> A web app that sorts German A1 nouns into three colour-coded boxes by grammatical gender (**der / die / das**), so learners can revise each gender as a visual set. Per word: reveal an example sentence + meaning, and hear pronunciation.

This document is the single source of truth for building the app. Hand it to Claude Code as-is.

---

## 1. Project identity

- **Working name:** ArtikleJar (repo + package name). Display tagline: *"Sort German nouns into der · die · das."*
- **Rename later:** the name appears only in `package.json`, the `<title>`, and the header component — keep it isolated so it's a 3-line change.
- **Audience:** German A1 learners (Goethe/TELC/ÖSD self-study). Mobile-first; many users revise on a phone.
- **Core mental model:** three boxes, one per gender. Blue = der (masculine), pink = die (feminine), green = das (neuter). This colour mapping is fixed and must be consistent everywhere.

---

## 2. Tech stack

- **Framework:** React + **Vite** (not CRA). TypeScript.
- **Styling:** plain CSS with CSS variables, or Tailwind — builder's choice, but the design tokens in §6 are mandatory either way.
- **No backend.** Fully static. All data ships as a bundled JSON file. All audio ships as static files.
- **Routing:** none needed for v1 (single page). If added later, use hash routing so GitHub Pages works without server config.
- **Hosting:** GitHub Pages via GitHub Actions. Vite `base` must be set to the repo name (e.g. `/ArtikleJar/`) or the build will 404 on Pages.
- **Node:** target Node 18+.

---

## 3. Data

### 3.1 Source
Vocabulary derives from the Goethe-Institut A1 wordlist via `patsytau/anki_german_a1_vocab` (CC-licensed — keep attribution in the footer and a NOTICE/LICENSE reference). **326 nouns** total.

### 3.2 Schema
A single `src/data/words.json` — a flat array of word objects. Grouping by category/gender happens in code, not in the file.

```ts
interface Word {
  id: string;          // stable, e.g. the source note id "84886454461"
  de: string;          // "Apfel"
  article: "der" | "die" | "das";
  plural: string | null;   // "Äpfel"  (null if none / plural-only handled separately)
  en: string;          // "apple"
  sentenceDe: string | null;   // "Ein Pfund Äpfel bitte."
  sentenceEn: string | null;   // "One pound of apples, please."
  audio: string | null;        // "tts-84886454461.mp3"  (null when no file exists)
  category: string;    // one of the 13 categories in §3.3
  emoji: string;       // "🍎"  (may be empty string "")
}
```

> **NOTE TO BUILDER:** the enriched `words.json` will be supplied separately (generated from the source repo joined with category + emoji assignments). Do **not** re-scrape. If it is not yet present, scaffold against a 5-item mock matching the schema and leave a clear `TODO: drop in real words.json`.

### 3.3 Categories (13, fixed order)
Food & Drink · Body & Health · Home & Furniture · Transport & Travel · People & Family · Work & School · Communication · Time & Calendar · Clothing · Places & Buildings · Money & Shopping · Nature & Weather · Leisure & Objects

Each category has a tab emoji (supplied in the data/UI map). Counts are uneven (Clothing has 4, Leisure & Objects has ~45) — the layout must tolerate that.

### 3.4 Audio files
- Bundled in `public/audio/tts-<id>.mp3` (~326 files, ~5 MB total). Reference via `import.meta.env.BASE_URL + 'audio/' + word.audio`.
- Audio speaks the **example sentence** (sometimes the word in context), not always the bare word. UI copy should say "Listen" / "Hear it", not "Hear the word."
- Some words have `audio: null` (the source had no audio for certain pre-list extras). For those, the speak button uses the **SpeechSynthesis fallback** (§5.3).

---

## 4. Layout & screens (v1 = one screen)

### 4.1 Header
- App name + tagline. Small, not a hero. Mobile users want to get to words fast.

### 4.2 Controls row
- **Category tabs** (horizontal scroll on mobile): one button per category, emoji + name + count badge. Active state clearly marked.
- **Search input**: filters the current category by German or English substring (live).
- (Optional, nice-to-have) a "show all categories" toggle.

### 4.3 Three columns
- `der` (blue) | `die` (pink) | `das` (green), side by side on desktop, **stacked** on mobile (<760px).
- Each column: coloured header with article, gender label, live count badge.
- Below: a list of **word cards** for that gender within the active category.

### 4.4 Word card (the heart of the app — see §5)
Collapsed state shows: emoji (or blank slot), the noun, English gloss.
Two controls per card: a **reveal toggle** and a **speak button**.

---

## 5. Word card behaviour (features 5–7)

### 5.1 Reveal toggle
- Each card has a toggle (chevron / "Show sentence" affordance).
- Collapsed: emoji · **Wort** · english gloss · [reveal] · [speak].
- Expanded (animated, ~200ms): reveals
  - the **German example sentence** (with the target word emphasised if feasible),
  - the **English translation** of the sentence,
  - the **plural form** if present (e.g. "pl. die Äpfel").
- If `sentenceDe` is null, the expanded panel shows "No example sentence" gracefully (don't render an empty box).
- State is **per-card** and local. Toggling one card does not affect others. (Optional: an "expand all / collapse all" per column.)

### 5.2 Speak button — primary path
- On click, play `public/audio/<word.audio>` via an `<audio>` element or `new Audio()`.
- Show a playing state (icon change / subtle pulse). Handle the case where the user clicks rapidly (stop previous before starting next — only one audio at a time globally).

### 5.3 Speak button — fallback
- If `word.audio` is `null` **or** the file fails to load, fall back to the Web Speech API:
  ```ts
  const u = new SpeechSynthesisUtterance(word.sentenceDe ?? `${word.article} ${word.de}`);
  u.lang = "de-DE";
  speechSynthesis.speak(u);
  ```
- Pick a German voice if available (`speechSynthesis.getVoices().find(v => v.lang.startsWith("de"))`). Voice quality varies by OS — acceptable for fallback.
- Never show an error to the user for audio; degrade silently to fallback.

### 5.4 Accessibility
- Cards keyboard-operable (toggle + speak reachable via Tab/Enter).
- `aria-expanded` on the toggle, `aria-label` on the speak button ("Listen to: <word>").
- Colour is **not** the only gender signal — the article word ("der") is always shown as text too (colour-blind safety).

---

## 6. Design tokens (mandatory)

Carry over the existing draft's aesthetic: **cozy but professional, neobrutalist accents, pastel-on-cream**. Distinct, not generic-AI.

```css
:root{
  --cream:#fbf7ef;     /* page background */
  --ink:#2b2622;       /* text + hard borders/shadows */
  --der:#2563a8;  --der-bg:#e7f0fa;  --der-line:#a7c6e8;  /* blue / masculine */
  --die:#c2407a;  --die-bg:#fbe8f0;  --die-line:#eaaecb;  /* pink / feminine */
  --das:#3d8a5f;  --das-bg:#e6f4ec;  --das-line:#a8d6bd;  /* green / neuter */
  --shadow:4px 4px 0 var(--ink);     /* hard offset shadow, no blur */
}
```

- **Fonts:** Fraunces (display / the German words), Nunito (UI / body). JetBrains Mono optional for any code-ish labels. Load via Google Fonts.
- **Borders:** 2.5–3px solid `--ink`, generous radius (11–18px), hard offset shadows (no soft blur).
- **Motion:** subtle. Card hover nudges sideways; reveal animates height/opacity ~200ms. One tasteful page-load stagger is welcome; avoid scattered micro-animations.
- **Texture:** faint dot-grid background already in the draft — keep or refine.
- **Do NOT** use Inter/Roboto/system fonts, purple-on-white gradients, or default Material/AI-slop styling.

The current single-file draft (`index.html`) is the visual reference — match and refine it, don't regress it.

---

## 7. Project structure (suggested)

```
ArtikleJar/
  public/
    audio/                 # tts-*.mp3  (bundled)
  src/
    data/words.json        # the 326-word dataset (supplied)
    data/categories.ts     # category order + tab emoji map
    components/
      Header.tsx
      Controls.tsx         # tabs + search
      GenderColumn.tsx     # one of der/die/das
      WordCard.tsx         # collapsed/expanded + speak
    hooks/
      useAudio.ts          # single-instance playback + SpeechSynthesis fallback
    App.tsx
    main.tsx
    styles/ (or tailwind config)
  .github/workflows/deploy.yml   # build + deploy to Pages
  vite.config.ts                 # base: '/ArtikleJar/'
```

---

## 8. Deployment (GitHub Pages)

- GitHub Actions workflow: on push to `main`, `npm ci && npm run build`, deploy `dist/` to Pages.
- **Critical:** `vite.config.ts` `base` must equal `/<repo-name>/`. Most Pages bugs are a wrong `base`.
- Audio paths and the words.json import must use `import.meta.env.BASE_URL`, not hard-coded `/`.

---

## 9. Build order (for Claude Code)

1. Scaffold Vite + React + TS. Set `base`. Get a hello-world deploying to Pages first (de-risks hosting early).
2. Add design tokens + fonts + Header.
3. Build static layout: Controls + three GenderColumns + WordCard, against the 5-item **mock** data.
4. Wire category switching + search filtering.
5. Implement WordCard reveal toggle.
6. Implement `useAudio` (file playback + SpeechSynthesis fallback) and the speak button.
7. Drop in real `words.json` + `public/audio/`. Verify counts (der≈130, die≈105, das≈84) and a few audio files.
8. Accessibility pass (§5.4). Mobile pass (stacked columns, scrollable tabs).
9. Polish: animations, empty states, attribution footer.

---

## 10. Explicit non-goals for v1 (don't build yet)

- Quiz / test mode (guess the gender). *Planned v2.*
- User accounts, progress tracking, spaced repetition.
- Levels beyond A1.
- Editing words in-app.
- Dark mode (nice-to-have, not required).

Keep v1 tight: browse → reveal → listen. Ship that well first.

---

## 11. Known data caveats (tell the builder)

- Category assignments are hand-made judgment calls; "Leisure & Objects" is a catch-all and is the messiest bucket. Acceptable for v1; don't try to "fix" it in code.
- ~11 abstract nouns have an empty emoji string — render a blank fixed-width slot so alignment holds.
- A handful of nouns lack audio (`audio: null`) — that's expected; fallback covers them.
- Plurals were parsed from notation like `der Apfel, -Ä`; some may be imperfect. Show them, but they're not guaranteed exam-perfect.
