import type { Word } from '../types';
import { IconSpeaker, IconChevron } from './icons';

function Sentence({ word }: { word: Word }) {
  const sentence = word.sentenceDe!;
  const parts = sentence.split(word.de);
  if (parts.length === 1) {
    return <span className="aj-sentence">{sentence}</span>;
  }
  return (
    <span className="aj-sentence">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span className="hi">{word.de}</span>}
        </span>
      ))}
    </span>
  );
}

interface WordCardProps {
  word: Word;
  open: boolean;
  onToggle: () => void;
  playing: boolean;
  onSpeak: () => void;
}

export default function WordCard({ word, open, onToggle, playing, onSpeak }: WordCardProps) {
  return (
    <div className={`aj-card${open ? ' open' : ''}`}>
      <div className="aj-card-top" onClick={onToggle}>
        <span className={`aj-emoji${word.emoji ? '' : ' blank'}`} aria-hidden="true">
          {word.emoji}
        </span>

        <div className="aj-word">
          <div className="aj-de">
            <span className="aj-art">{word.article}</span>
            {word.de}
          </div>
          <div className="aj-en">{word.en}</div>
        </div>

        <div className="aj-card-btns">
          <button
            className={`aj-iconbtn aj-speak${playing ? ' playing' : ''}`}
            aria-label={`Listen to: ${word.de}`}
            onClick={(e) => { e.stopPropagation(); onSpeak(); }}
          >
            <IconSpeaker />
          </button>
          <button
            className="aj-iconbtn aj-chev"
            aria-label={open ? 'Hide details' : 'Show sentence'}
            aria-expanded={open}
          >
            <IconChevron />
          </button>
        </div>
      </div>

      <div className="aj-reveal" style={{ maxHeight: open ? 400 : 0 }}>
        <div className="aj-reveal-inner">
          <hr className="aj-divider" />
          <div className="aj-gloss">
            <span className="lead">means</span>
            {word.en}
          </div>
          {word.sentenceDe ? (
            <div className="aj-ex">
              <Sentence word={word} />
              {word.sentenceEn && <div className="aj-trans">{word.sentenceEn}</div>}
            </div>
          ) : (
            <div className="aj-no-ex">No example sentence yet</div>
          )}
          {word.plural && (
            <span className="aj-plural">
              <span className="lbl">plural</span>
              {word.plural}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
