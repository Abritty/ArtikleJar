export interface Word {
  id: string;
  de: string;
  article: 'der' | 'die' | 'das';
  plural: string | null;
  en: string;
  sentenceDe: string | null;
  sentenceEn: string | null;
  audio: string | null;
  category: string;
  emoji: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
}

export type Gender = 'der' | 'die' | 'das';
