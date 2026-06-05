import { useState, useMemo } from 'react';
import wordsData from './data/words.json';
import { CATEGORIES } from './data/categories';
import type { Word, Gender } from './types';
import Header from './components/Header';
import Controls from './components/Controls';
import GenderColumn from './components/GenderColumn';
import { useAudio } from './hooks/useAudio';

const WORDS = wordsData as Word[];
const GENDERS: Gender[] = ['der', 'die', 'das'];

export default function App() {
  const [activeCat, setActiveCat] = useState(CATEGORIES[0].id);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const { playingId, play } = useAudio();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    CATEGORIES.forEach((cat) => (c[cat.id] = 0));
    WORDS.forEach((w) => { if (c[w.category] !== undefined) c[w.category]++; });
    return c;
  }, []);

  const groups = useMemo(() => {
    const pool = showAll ? WORDS : WORDS.filter((w) => w.category === activeCat);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? pool.filter((w) => w.de.toLowerCase().includes(q) || w.en.toLowerCase().includes(q))
      : pool;
    return {
      der: filtered.filter((w) => w.article === 'der'),
      die: filtered.filter((w) => w.article === 'die'),
      das: filtered.filter((w) => w.article === 'das'),
      total: filtered.length,
    };
  }, [showAll, activeCat, query]);

  function toggleCard(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function expandAll(keys: string[], open: boolean) {
    setExpanded((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (open ? next.add(k) : next.delete(k)));
      return next;
    });
  }

  function pickCat(id: string) {
    setShowAll(false);
    setActiveCat(id);
  }

  return (
    <div className="aj-shell">
      <div className="aj-page">
        <Header />
        <Controls
          activeCat={activeCat}
          showAll={showAll}
          onPickCat={pickCat}
          onToggleAll={() => setShowAll((v) => !v)}
          query={query}
          onQuery={setQuery}
          counts={counts}
          totalShown={groups.total}
        />
        <div className="aj-cols l-columns">
          {GENDERS.map((g) => (
            <GenderColumn
              key={g}
              gender={g}
              words={groups[g]}
              expanded={expanded}
              onToggle={toggleCard}
              onExpandAll={expandAll}
              playingId={playingId}
              onSpeak={play}
            />
          ))}
        </div>
        <footer className="aj-foot">
          A1 starter set · {WORDS.length} nouns · der die das, sorted by colour ·{' '}
          <a
            href="https://github.com/patsytau/anki_german_a1_vocab"
            target="_blank"
            rel="noreferrer"
          >
            vocab source (CC)
          </a>
        </footer>
      </div>
    </div>
  );
}
