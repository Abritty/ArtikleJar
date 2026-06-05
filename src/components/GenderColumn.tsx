import type { Word, Gender } from '../types';
import { GENDER_CONFIG } from '../data/categories';
import WordCard from './WordCard';

const wordKey = (w: Word) => `${w.article}-${w.id}`;

interface GenderColumnProps {
  gender: Gender;
  words: Word[];
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onExpandAll: (keys: string[], open: boolean) => void;
  playingId: string | null;
  onSpeak: (id: string, word: Word) => void;
}

export default function GenderColumn({
  gender, words, expanded, onToggle, onExpandAll, playingId, onSpeak,
}: GenderColumnProps) {
  const g = GENDER_CONFIG[gender];
  const visKeys = words.map(wordKey);
  const allOpen = visKeys.length > 0 && visKeys.every((k) => expanded.has(k));

  const colStyle = {
    '--gcol': g.color,
    '--gtint': g.tint,
    '--gdeep': g.deep,
  } as React.CSSProperties;

  return (
    <section className="aj-col" style={colStyle} aria-label={`${g.label} — ${g.tag}`}>
      <header className="aj-col-head">
        <div className="aj-rings"><i /><i /><i /></div>
        <div className="aj-col-title">
          <div>
            <span className="aj-col-der">{g.label}</span>
            <span className="aj-col-tag">{g.tag}</span>
          </div>
          <div className="aj-col-actions">
            {words.length > 0 && (
              <button
                className="aj-expand-all"
                onClick={() => onExpandAll(visKeys, !allOpen)}
              >
                {allOpen ? 'close all' : 'open all'}
              </button>
            )}
            <span className="aj-count">{words.length}</span>
          </div>
        </div>
      </header>

      <div className="aj-col-body">
        {words.length === 0
          ? <div className="aj-empty">nothing here yet</div>
          : words.map((word) => {
              const key = wordKey(word);
              return (
                <WordCard
                  key={key}
                  word={word}
                  open={expanded.has(key)}
                  onToggle={() => onToggle(key)}
                  playing={playingId === key}
                  onSpeak={() => onSpeak(key, word)}
                />
              );
            })}
      </div>
    </section>
  );
}
