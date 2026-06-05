import { CATEGORIES } from '../data/categories';
import { IconSearch } from './icons';

interface ControlsProps {
  activeCat: string;
  showAll: boolean;
  onPickCat: (id: string) => void;
  onToggleAll: () => void;
  query: string;
  onQuery: (q: string) => void;
  counts: Record<string, number>;
  totalShown: number;
}

export default function Controls({
  activeCat, showAll, onPickCat, onToggleAll,
  query, onQuery, counts, totalShown,
}: ControlsProps) {
  return (
    <div className="aj-controls">
      <div className="aj-tabs">
        {CATEGORIES.map((cat) => {
          const active = !showAll && activeCat === cat.id;
          return (
            <button
              key={cat.id}
              className={`aj-tab${active ? ' active' : ''}${showAll ? ' dim' : ''}`}
              onClick={() => onPickCat(cat.id)}
            >
              <span className="em">{cat.emoji}</span>
              {cat.name}
              <span className="ct">{counts[cat.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="aj-controls-row">
        <label className="aj-search">
          <IconSearch />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search German or English…"
            aria-label="Search words"
          />
          {query && (
            <span className="clr" onClick={() => onQuery('')} role="button" aria-label="Clear search">
              ×
            </span>
          )}
        </label>

        <div
          className={`aj-toggle${showAll ? ' on' : ''}`}
          onClick={onToggleAll}
          role="switch"
          aria-checked={showAll}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? onToggleAll() : undefined}
        >
          <span className="aj-switch"><i /></span>
          <span className="hl-word">show all categories</span>
        </div>

        <span className="aj-meta">
          {totalShown} {totalShown === 1 ? 'word' : 'words'} shown
        </span>
      </div>
    </div>
  );
}
