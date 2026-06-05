#!/usr/bin/env node
/**
 * parse-anki.mjs
 *
 * Reads the Goethe Institute A1 Wordlist TSV, extracts nouns, parses their
 * plural notation, and writes two output files:
 *
 *   words-intermediate.json  —  all nouns with category: "UNASSIGNED"
 *   categorisation-template.csv  —  pre-filled spreadsheet for manual review
 *
 * Usage:
 *   node scripts/parse-anki.mjs \
 *     --input  "path/to/Goethe Institute A1 Wordlist.txt" \
 *     [--audio-dir  public/audio]
 *     [--output     src/data/words-intermediate.json]
 *     [--csv        scripts/categorisation-template.csv]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const result = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) { result[argv[i].slice(2)] = argv[i + 1] ?? true; i++; }
  }
  return result;
}

const args = parseArgs(process.argv);

if (!args.input) {
  console.error('Error: --input is required\n');
  console.error('Usage: node scripts/parse-anki.mjs --input "path/to/Goethe Institute A1 Wordlist.txt"');
  process.exit(1);
}

const INPUT_PATH  = resolve(args.input);
const AUDIO_DIR   = args['audio-dir'] ? resolve(args['audio-dir']) : null;
const OUTPUT_JSON = resolve(args.output ?? 'src/data/words-intermediate.json');
const OUTPUT_CSV  = resolve(args.csv    ?? 'scripts/categorisation-template.csv');

// ── TSV column indices ────────────────────────────────────────────────────────

const COL = { id: 0, de: 1, sentDe: 2, en: 3, sentEn: 4 };

// ── Plural notation parser ────────────────────────────────────────────────────

const ARTICLES     = new Set(['der', 'die', 'das']);
const EM_DASH      = '–'; // – used in the source for unchanged plurals

// Maps an umlaut indicator char (ä/ö/ü/Ä/Ö/Ü) → the base vowel it targets
const UMLAUT_BASE = { ä: 'a', Ä: 'a', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u' };

/**
 * Replaces the last occurrence of a vowel in `word` with its umlaut form.
 * Pass the umlaut indicator char from the notation (e.g. 'Ä', 'ü').
 * 'a' → 'ä' also handles 'au' → 'äu' (takes precedence over bare 'a').
 */
function applyUmlaut(word, umChar) {
  const lower = UMLAUT_BASE[umChar] ?? umChar.toLowerCase();

  if (lower === 'a') {
    // 'au' and 'Au' take precedence
    const auIdx = Math.max(word.lastIndexOf('au'), word.lastIndexOf('Au'));
    if (auIdx > -1) {
      const replacement = word[auIdx] === 'A' ? 'Äu' : 'äu';
      return word.slice(0, auIdx) + replacement + word.slice(auIdx + 2);
    }
    const pos = Math.max(word.lastIndexOf('a'), word.lastIndexOf('A'));
    if (pos === -1) return word;
    return word.slice(0, pos) + (word[pos] === 'A' ? 'Ä' : 'ä') + word.slice(pos + 1);
  }

  if (lower === 'o') {
    const pos = Math.max(word.lastIndexOf('o'), word.lastIndexOf('O'));
    if (pos === -1) return word;
    return word.slice(0, pos) + (word[pos] === 'O' ? 'Ö' : 'ö') + word.slice(pos + 1);
  }

  if (lower === 'u') {
    const pos = Math.max(word.lastIndexOf('u'), word.lastIndexOf('U'));
    if (pos === -1) return word;
    return word.slice(0, pos) + (word[pos] === 'U' ? 'Ü' : 'ü') + word.slice(pos + 1);
  }

  return word;
}

/**
 * Parses the German field (e.g. "der Apfel, -Ä") into { article, de, plural }.
 *
 * The source uses two notations:
 *   simple suffix   "die Arbeit, -en"       → die Arbeiten
 *   umlaut + suffix "der Aufzug, -ü, e"     → die Aufzüge
 *   no-dash umlaut  "der Ehemann, ä, er"    → die Ehemänner  (rare)
 *   unchanged       "der Ausländer, -"      → die Ausländer
 *   unchanged (em)  "das Brötchen, –"       → die Brötchen
 *   slash variants  "das Wort, -ö, er/-e"   → die Wörter (first variant taken)
 */
function parseNounField(deField) {
  const parts = deField.split(', ');
  const [articleToken, ...nounTokens] = parts[0].trim().split(' ');

  if (!ARTICLES.has(articleToken)) return null;

  const noun = nounTokens.join(' ');
  if (!noun) return null;

  if (parts.length === 1) return { article: articleToken, de: noun, plural: null };

  const s1 = parts[1].trim();
  // Take only the first option when slash-variants are given (e.g. "er/-e" → "er")
  const s2 = (parts[2] ?? '').trim().split('/')[0].trim();

  if (s1 === EM_DASH || s1 === '-') return { article: articleToken, de: noun, plural: `die ${noun}` };

  const umVowelMatch = s1.match(/[äöüÄÖÜ]/);
  let stem = noun;
  if (umVowelMatch) stem = applyUmlaut(noun, umVowelMatch[0]);

  // Any letters in s1 that are not the dash or umlaut marker are appended to the stem
  const endingFromS1 = s1.replace(/^-/, '').replace(/[äöüÄÖÜ]/g, '');

  return { article: articleToken, de: noun, plural: `die ${stem}${endingFromS1}${s2}` };
}

// ── ID generation ─────────────────────────────────────────────────────────────

const UMLAUT_MAP = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss' };

function slugify(str) {
  return str
    .replace(/[äöüÄÖÜß]/g, c => UMLAUT_MAP[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Generates a readable ID like "der-apfel". Falls back to appending source suffix on collision. */
function makeId(article, de, sourceId, usedIds) {
  const base = `${article}-${slugify(de)}`;
  if (!usedIds.has(base)) { usedIds.add(base); return base; }
  const fallback = `${base}-${sourceId.slice(-4)}`;
  usedIds.add(fallback);
  return fallback;
}

// ── Category suggestions (keyword match on English translation) ───────────────

const CATEGORY_RULES = [
  { id: 'food',          kw: ['food', 'drink', 'eat', 'bread', 'meat', 'fruit', 'apple', 'banana', 'vegetable', 'meal', 'dish', 'cake', 'cookie', 'coffee', 'tea', 'milk', 'water', 'juice', 'wine', 'beer', 'sugar', 'salt', 'butter', 'cheese', 'egg', 'fish', 'chicken', 'soup', 'salad', 'sausage', 'sauce', 'potato', 'rice', 'bakery', 'appetit', 'cook', 'barbecue', 'snack', 'jam', 'oil', 'pepper', 'flour', 'cream'] },
  { id: 'body',          kw: ['body', 'head', 'arm', 'leg', 'hand', 'foot', 'feet', 'eye', 'ear', 'nose', 'mouth', 'tooth', 'teeth', 'hair', 'neck', 'back', 'heart', 'stomach', 'blood', 'doctor', 'hospital', 'health', 'pain', 'medicine', 'pharmacy', 'cold', 'cough', 'fever', 'lung', 'bone', 'skin', 'finger', 'lip', 'chest', 'knee', 'shoulder', 'throat'] },
  { id: 'home',          kw: ['house', 'home', 'room', 'apartment', 'flat', 'furniture', 'bed', 'table', 'chair', 'sofa', 'door', 'window', 'floor', 'wall', 'roof', 'cellar', 'lamp', 'carpet', 'cupboard', 'shelf', 'oven', 'fridge', 'balcony', 'shower', 'hallway', 'attic', 'radiator', 'bin', 'sink', 'tap', 'towel', 'pillow', 'blanket', 'kitchen'] },
  { id: 'transport',     kw: ['car', 'bus', 'train', 'plane', 'bike', 'bicycle', 'station', 'airport', 'street', 'road', 'ticket', 'journey', 'travel', 'ship', 'boat', 'taxi', 'subway', 'tram', 'platform', 'motorway', 'vehicle', 'parking', 'traffic', 'connection', 'seat', 'compartment', 'escalator', 'exit', 'lift', 'alight', 'depart', 'arrive'] },
  { id: 'people',        kw: ['man', 'woman', 'child', 'person', 'family', 'mother', 'father', 'sister', 'brother', 'friend', 'neighbour', 'husband', 'wife', 'baby', 'girl', 'boy', 'adult', 'foreigner', 'couple', 'partner', 'aunt', 'uncle', 'grandma', 'grandpa', 'colleague', 'son', 'daughter', 'parents', 'guest', 'customer', 'tenant', 'citizen', 'resident'] },
  { id: 'work',          kw: ['work', 'job', 'office', 'teacher', 'student', 'class', 'lesson', 'exam', 'course', 'university', 'school', 'pen', 'notebook', 'printer', 'workplace', 'profession', 'salary', 'employee', 'boss', 'meeting', 'task', 'project', 'unemployed', 'degree', 'apprenticeship', 'training', 'subject', 'grade', 'headmaster'] },
  { id: 'communication', kw: ['phone', 'computer', 'internet', 'email', 'letter', 'newspaper', 'radio', 'television', 'message', 'answer', 'question', 'announcement', 'advert', 'statement', 'application', 'form', 'sign', 'text', 'mobile', 'address', 'post', 'envelope', 'package', 'fax'] },
  { id: 'time',          kw: ['time', 'day', 'week', 'month', 'year', 'morning', 'evening', 'night', 'hour', 'minute', 'second', 'calendar', 'date', 'holiday', 'birthday', 'appointment', 'spring', 'summer', 'autumn', 'winter', 'weekend', 'tuesday', 'monday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'] },
  { id: 'clothing',      kw: ['clothes', 'shirt', 'jacket', 'trousers', 'pants', 'dress', 'shoe', 'hat', 'coat', 'pullover', 'skirt', 'tie', 'sock', 'underwear', 'scarf', 'glove', 'belt', 'suit', 'uniform', 'fashion', 'fabric', 'blouse', 'sweater', 'cap', 'boot'] },
  { id: 'places',        kw: ['city', 'town', 'country', 'square', 'park', 'shop', 'market', 'museum', 'church', 'hospital', 'hotel', 'bank', 'supermarket', 'pharmacy', 'entrance', 'gym', 'cinema', 'theatre', 'stadium', 'embassy', 'police', 'zoo', 'library', 'center', 'centre', 'building', 'village', 'region', 'district', 'border', 'capital', 'state', 'land'] },
  { id: 'money',         kw: ['money', 'price', 'cost', 'euro', 'cent', 'bill', 'coin', 'pay', 'buy', 'sell', 'discount', 'receipt', 'invoice', 'cashier', 'wallet', 'account', 'fee', 'tax', 'cash', 'card', 'tip', 'change'] },
  { id: 'nature',        kw: ['nature', 'tree', 'flower', 'grass', 'forest', 'mountain', 'river', 'sea', 'lake', 'weather', 'sun', 'rain', 'snow', 'wind', 'cloud', 'plant', 'animal', 'dog', 'cat', 'bird', 'fish', 'earth', 'stone', 'sand', 'garden', 'field', 'sky', 'star', 'moon', 'storm', 'temperature', 'air', 'leaf', 'wood', 'landscape'] },
  { id: 'leisure',       kw: ['sport', 'music', 'film', 'game', 'hobby', 'holiday', 'party', 'gift', 'photo', 'art', 'dance', 'ball', 'swim', 'run', 'concert', 'exhibition', 'festival', 'vacation', 'trip', 'excursion', 'camping', 'theatre', 'fun', 'toy', 'instrument', 'guitar', 'painting', 'draw'] },
];

function suggestCategory(en) {
  const lower = en.toLowerCase();
  for (const { id, kw } of CATEGORY_RULES) {
    if (kw.some(w => lower.includes(w))) return id;
  }
  return '';
}

// ── Audio lookup ──────────────────────────────────────────────────────────────

function audioFilename(sourceId) {
  if (!AUDIO_DIR) return null;
  const filename = `tts-${sourceId}.mp3`;
  return existsSync(join(AUDIO_DIR, filename)) ? filename : null;
}

// ── CSV escaping ──────────────────────────────────────────────────────────────

function csvEscape(value) {
  const s = String(value ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

// ── Main ──────────────────────────────────────────────────────────────────────

if (!existsSync(INPUT_PATH)) {
  console.error(`Error: input file not found: ${INPUT_PATH}`);
  process.exit(1);
}

const raw   = readFileSync(INPUT_PATH, 'utf8');
const lines = raw.split('\n').filter(l => l.trim());

const usedIds = new Set();
const seen    = new Set();   // dedup key: "{article}:{de.lower}"
const words   = [];

for (const line of lines) {
  const cols = line.split('\t');
  if (cols.length < 5) continue;

  const sourceId = cols[COL.id].trim();
  const deField  = cols[COL.de].trim();
  const parsed   = parseNounField(deField);
  if (!parsed) continue;

  // Keep first occurrence when the same noun appears with multiple example sentences
  const dedupKey = `${parsed.article}:${parsed.de.toLowerCase()}`;
  if (seen.has(dedupKey)) continue;
  seen.add(dedupKey);

  words.push({
    id:         makeId(parsed.article, parsed.de, sourceId, usedIds),
    de:         parsed.de,
    article:    /** @type {'der'|'die'|'das'} */ (parsed.article),
    plural:     parsed.plural,
    en:         cols[COL.en].trim(),
    sentenceDe: cols[COL.sentDe].trim() || null,
    sentenceEn: cols[COL.sentEn].trim() || null,
    audio:      audioFilename(sourceId),
    category:   'UNASSIGNED',
    emoji:      '',
  });
}

// Sort A–Z within each gender (der → die → das)
const ARTICLE_ORDER = { der: 0, die: 1, das: 2 };
words.sort((a, b) => {
  const diff = ARTICLE_ORDER[a.article] - ARTICLE_ORDER[b.article];
  return diff !== 0 ? diff : a.de.localeCompare(b.de, 'de');
});

writeFileSync(OUTPUT_JSON, JSON.stringify(words, null, 2), 'utf8');

// Write categorisation CSV — pre-fill with keyword suggestions
const csvHeader = 'id,de,article,en,plural,category,emoji';
const csvRows   = words.map(w => [
  w.id,
  csvEscape(w.de),
  w.article,
  csvEscape(w.en),
  csvEscape(w.plural ?? ''),
  suggestCategory(w.en),
  '',
].join(','));

writeFileSync(OUTPUT_CSV, [csvHeader, ...csvRows].join('\n') + '\n', 'utf8');

// Summary
const count = { der: 0, die: 0, das: 0, audio: 0, suggested: 0 };
for (const w of words) {
  count[w.article]++;
  if (w.audio) count.audio++;
  if (suggestCategory(w.en)) count.suggested++;
}

console.log(`\n✓  Parsed ${words.length} unique nouns`);
console.log(`   der: ${count.der}   die: ${count.die}   das: ${count.das}`);
console.log(`   Audio linked: ${count.audio}/${words.length}`);
console.log(`   Category pre-filled: ${count.suggested}/${words.length} (~${Math.round(count.suggested / words.length * 100)}%)`);
console.log(`\n→  ${OUTPUT_JSON}`);
console.log(`→  ${OUTPUT_CSV}`);
console.log('\nNext step: open the CSV in a spreadsheet, review/fill the "category" column,');
console.log('then run: node scripts/apply-categories.mjs\n');
