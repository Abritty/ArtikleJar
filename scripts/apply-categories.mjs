#!/usr/bin/env node
/**
 * apply-categories.mjs
 *
 * Merges the user-edited categorisation CSV back into words-intermediate.json
 * and writes the final src/data/words.json and src/data/categories.ts.
 *
 * Run this after you have filled in the "category" column in the CSV.
 *
 * Usage:
 *   node scripts/apply-categories.mjs \
 *     [--intermediate  src/data/words-intermediate.json]
 *     [--csv           scripts/categorisation-template.csv]
 *     [--output        src/data/words.json]
 *     [--categories    src/data/categories.ts]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const result = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) { result[argv[i].slice(2)] = argv[i + 1] ?? true; i++; }
  }
  return result;
}

const args = parseArgs(process.argv);
const INTERMEDIATE  = resolve(args.intermediate ?? 'src/data/words-intermediate.json');
const CSV_PATH      = resolve(args.csv          ?? 'scripts/categorisation-template.csv');
const OUTPUT_JSON   = resolve(args.output       ?? 'src/data/words.json');
const CATEGORIES_TS = resolve(args.categories   ?? 'src/data/categories.ts');

// ── Category definitions ──────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'food',          name: 'Food & Drink',        emoji: '🍎' },
  { id: 'body',          name: 'Body & Health',       emoji: '✋' },
  { id: 'home',          name: 'Home & Furniture',    emoji: '🪑' },
  { id: 'transport',     name: 'Transport & Travel',  emoji: '🚌' },
  { id: 'people',        name: 'People & Family',     emoji: '👪' },
  { id: 'work',          name: 'Work & School',       emoji: '💼' },
  { id: 'communication', name: 'Communication',       emoji: '📱' },
  { id: 'time',          name: 'Time & Calendar',     emoji: '📅' },
  { id: 'clothing',      name: 'Clothing',            emoji: '👕' },
  { id: 'places',        name: 'Places & Buildings',  emoji: '🏛️' },
  { id: 'money',         name: 'Money & Shopping',    emoji: '💶' },
  { id: 'nature',        name: 'Nature & Weather',    emoji: '🌿' },
  { id: 'leisure',       name: 'Leisure & Objects',   emoji: '🎯' },
];

const VALID_IDS    = new Set(CATEGORIES.map(c => c.id));
const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

// ── RFC 4180 CSV parser ───────────────────────────────────────────────────────

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuote) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else field += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        row.push(field); field = '';
        rows.push(row); row = [];
      } else field += ch;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateCSV(headers, dataRows) {
  const idIdx       = headers.indexOf('id');
  const categoryIdx = headers.indexOf('category');

  if (idIdx === -1 || categoryIdx === -1) {
    console.error('Error: CSV must have "id" and "category" columns.');
    process.exit(1);
  }

  const errors = [];
  for (const row of dataRows) {
    const id       = row[idIdx]?.trim() ?? '';
    const category = row[categoryIdx]?.trim() ?? '';
    if (!id) continue;
    if (!category) {
      errors.push(`  ✗  "${id}": category is empty`);
    } else if (!VALID_IDS.has(category)) {
      errors.push(`  ✗  "${id}": unknown category "${category}"`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} validation error(s):\n`);
    errors.forEach(e => console.error(e));
    console.error('\nValid category ids:');
    CATEGORIES.forEach(c => console.error(`  ${c.id.padEnd(16)} ${c.name}`));
    console.error('\nFix the CSV and re-run.\n');
    process.exit(1);
  }

  return { idIdx, categoryIdx, emojiIdx: headers.indexOf('emoji') };
}

// ── categories.ts writer ──────────────────────────────────────────────────────

function buildCategoriesTs() {
  const PAD_ID   = Math.max(...CATEGORIES.map(c => c.id.length)) + 2;
  const PAD_NAME = Math.max(...CATEGORIES.map(c => c.name.length)) + 2;

  const entries = CATEGORIES
    .map(c =>
      `  { id: '${c.id}',${' '.repeat(PAD_ID - c.id.length)}` +
      `name: '${c.name}',${' '.repeat(PAD_NAME - c.name.length)}` +
      `emoji: '${c.emoji}' },`
    )
    .join('\n');

  return `import type { Category } from '../types';

export const CATEGORIES: Category[] = [
${entries}
];

export const GENDER_CONFIG = {
  der: { label: 'der', tag: 'masculine', color: '#3360D2', tint: '#E6ECFB', deep: '#21407F' },
  die: { label: 'die', tag: 'feminine',  color: '#D6519A', tint: '#FBE6F0', deep: '#92335F' },
  das: { label: 'das', tag: 'neuter',    color: '#A66F3C', tint: '#F4E8D6', deep: '#6E4926' },
} as const;
`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

for (const [label, path] of [['intermediate JSON', INTERMEDIATE], ['CSV', CSV_PATH]]) {
  if (!existsSync(path)) {
    console.error(`Error: ${label} not found: ${path}`);
    process.exit(1);
  }
}

const words  = JSON.parse(readFileSync(INTERMEDIATE, 'utf8'));
const rows   = parseCSV(readFileSync(CSV_PATH, 'utf8'));
const [headerRow, ...dataRows] = rows;
const headers = headerRow.map(h => h.trim());

const { idIdx, categoryIdx, emojiIdx } = validateCSV(headers, dataRows);

// Build lookup map: id → { category, emoji }
const csvMap = new Map();
for (const row of dataRows) {
  const id = row[idIdx]?.trim();
  if (!id) continue;
  csvMap.set(id, {
    category: row[categoryIdx]?.trim() ?? '',
    emoji:    emojiIdx > -1 ? (row[emojiIdx]?.trim() ?? '') : '',
  });
}

// Merge CSV data into words
const finalWords = words.map(word => {
  const override = csvMap.get(word.id);
  if (!override) {
    console.warn(`Warning: no CSV row found for id "${word.id}" (${word.de}) — skipping.`);
    return word;
  }

  const category = override.category;
  // Use per-word emoji if provided; fall back to category emoji
  const emoji = override.emoji || CATEGORY_MAP[category]?.emoji || '';

  return { ...word, category, emoji };
});

writeFileSync(OUTPUT_JSON,   JSON.stringify(finalWords, null, 2), 'utf8');
writeFileSync(CATEGORIES_TS, buildCategoriesTs(),                 'utf8');

// Summary
const byCategory = {};
const byArticle  = { der: 0, die: 0, das: 0 };
let audioCount   = 0;

for (const w of finalWords) {
  byCategory[w.category] = (byCategory[w.category] ?? 0) + 1;
  byArticle[w.article]++;
  if (w.audio) audioCount++;
}

const catSummary = Object.entries(byCategory)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `   ${k.padEnd(16)} ${v}`)
  .join('\n');

console.log(`\n✓  Merged ${finalWords.length} words`);
console.log(`   der: ${byArticle.der}   die: ${byArticle.die}   das: ${byArticle.das}`);
console.log(`   Audio linked: ${audioCount}/${finalWords.length}`);
console.log(`\nCategory breakdown:\n${catSummary}`);
console.log(`\n→  ${OUTPUT_JSON}`);
console.log(`→  ${CATEGORIES_TS}`);
console.log('\nDone. Push to main to trigger a new deploy.\n');
