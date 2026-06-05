import { useState, useRef } from 'react';
import type { Word } from '../types';

export function useAudio() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const playingIdRef = useRef<string | null>(null);

  function stopCurrent() {
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
      currentAudio.current = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function setPlaying(id: string | null) {
    playingIdRef.current = id;
    setPlayingId(id);
  }

  function play(id: string, word: Word) {
    stopCurrent();

    if (playingIdRef.current === id) {
      setPlaying(null);
      return;
    }

    setPlaying(id);

    const onEnd = () => {
      if (playingIdRef.current === id) setPlaying(null);
    };

    if (word.audio) {
      const audio = new Audio(`${import.meta.env.BASE_URL}audio/${word.audio}`);
      currentAudio.current = audio;
      audio.addEventListener('ended', onEnd);
      audio.addEventListener('error', () => {
        currentAudio.current = null;
        speakFallback(word, onEnd);
      });
      audio.play().catch(() => {
        currentAudio.current = null;
        speakFallback(word, onEnd);
      });
    } else {
      speakFallback(word, onEnd);
    }
  }

  return { playingId, play };
}

function speakFallback(word: Word, onEnd: () => void): void {
  if (!('speechSynthesis' in window)) { onEnd(); return; }

  const text = word.sentenceDe ?? `${word.article} ${word.de}`;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  u.rate = 0.9;
  u.onend = onEnd;
  u.onerror = onEnd;

  const voices = window.speechSynthesis.getVoices();
  const deVoice = voices.find((v) => v.lang.startsWith('de'));
  if (deVoice) u.voice = deVoice;

  window.speechSynthesis.speak(u);
}
