# ArtikelJar — Project Roadmap

> German A1 noun gender-sorting app. Core app is built. This file tracks the remaining steps to ship a data-complete, quiz-enabled app on GitHub Pages.

---

## Status

| Step | What | Status |
|------|------|--------|
| 1 | GitHub repo + first push | ✅ Repo initialised locally, awaiting remote |
| 2 | Real data: parse → categorise → audio | ⏳ Pending |
| 3 | UI fixes | ⏳ Pending |
| 4 | Quiz feature | ⏳ Pending |
| 5 | Host on GitHub Pages | ⏳ Pending |

---

## Step 1 — Create GitHub Repo & Push
**Estimate: ~15 min**

**Claude Code does:**
- [x] `.gitignore` created
- [x] `git init` + initial commit (24 files, all source)
- [ ] `git remote add origin` + `git push` (needs repo URL from you)

**You do:**
1. Create a **public** repo named exactly `ArtikleJar` on GitHub (no README, no .gitignore)
2. Copy the remote URL and give it to Claude Code to push
3. In repo Settings → Pages → Source: **GitHub Actions**

---

## Step 2 — Real Data: Parse, Categorise, Sort, Audio
**Estimate: Claude Code ~90 min | You ~2.5–4.5 hrs**

Source: [`patsytau/anki_german_a1_vocab`](https://github.com/patsytau/anki_german_a1_vocab) (CC BY-SA 4.0)

### 2A — Parse script (Claude Code, autonomous)
- `scripts/parse-anki.mjs` — reads tab-separated wordlist, extracts nouns, reconstructs plurals, sorts A–Z per gender, outputs `src/data/words-intermediate.json`
- `scripts/categorisation-template.csv` — pre-filled with ~60% suggested categories for your review
- `scripts/apply-categories.mjs` — merges your corrected CSV back into final `src/data/words.json`

### 2B — You categorise (USER only — cannot be automated)
Assign each of the ~326 nouns to one of these 13 categories in the CSV:

| id | Category |
|----|----------|
| `food` | Food & Drink |
| `body` | Body & Health |
| `home` | Home & Furniture |
| `transport` | Transport & Travel |
| `people` | People & Family |
| `work` | Work & School |
| `communication` | Communication |
| `time` | Time & Calendar |
| `clothing` | Clothing |
| `places` | Places & Buildings |
| `money` | Money & Shopping |
| `nature` | Nature & Weather |
| `leisure` | Leisure & Objects |

### 2C — Audio files (You copy files)
1. `git clone https://github.com/patsytau/anki_german_a1_vocab`
2. Copy all `audio/tts-*.mp3` → `public/audio/` in this project (~31.7 MB, ~326 files)
3. Claude Code re-runs parse script to link audio filenames

**Files changed:** `scripts/parse-anki.mjs`, `scripts/apply-categories.mjs`, `src/data/words.json`, `src/data/categories.ts`, `public/audio/tts-*.mp3`

---

## Step 3 — UI Fixes
**Estimate: ~60 min Claude Code | ~10 min you**

> Let Claude Code know if you've spotted specific visual issues beyond these.

| # | Issue | File |
|---|-------|------|
| 1 | Breakpoints inconsistent (860/820/760px) | `index.css` |
| 2 | `maxHeight: 400px` clips long sentences | `WordCard.tsx` |
| 3 | Search input too narrow on iPhone SE (375px) | `index.css` |
| 4 | Controls row wraps awkwardly on medium screens | `Controls.tsx` + `index.css` |

---

## Step 4 — Quiz Feature
**Estimate: ~3–4 hrs Claude Code | ~30 min you**

**Format:** One word at a time → tap `der` / `die` / `das` → immediate feedback + sentence reveal.

**Progress:** `localStorage` key `"artikeljar_progress"` — persists across sessions.

```
A word is "mastered" when: accuracy ≥ 80% AND attempts ≥ 3
```

**New files:**
- `src/hooks/useProgress.ts` — localStorage read/write
- `src/components/QuizCard.tsx` — noun + 3 article buttons + feedback
- `src/components/QuizStats.tsx` — accuracy %, mastered count, reset

**Modified files:** `App.tsx`, `Controls.tsx`, `index.css`, `types.ts`

---

## Step 5 — Host on GitHub Pages
**Estimate: ~20 min | Mostly automatic**

The deploy workflow (`.github/workflows/deploy.yml`) already fires on every push to `main`. Just:
1. Confirm `vite.config.ts` `base: '/ArtikleJar/'` matches your repo name
2. Push → Actions builds and deploys automatically
3. Spot-check the live URL

---

## Total Estimate

| | Claude Code | You |
|--|-------------|-----|
| All steps | ~6–7 hrs | ~3–5 hrs |
| Wall-clock | **1–2 days** | (categorisation is the pacing item) |

---

## Verification Checklist

- [ ] Step 1: GitHub Actions green; live URL loads the app
- [ ] Step 2: `words.json` has ~326 nouns (der≈130, die≈105, das≈84); audio plays for 3 spot-checked words
- [ ] Step 3: Mobile emulator at 375px/390px/768px — no layout breaks, reveal doesn't clip
- [ ] Step 4: 10-word quiz session works; localStorage persists on refresh; reset clears it
- [ ] Step 5: Live URL works; no 404s in Network tab; audio plays on device
