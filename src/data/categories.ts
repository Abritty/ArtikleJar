import type { Category } from '../types';

// TODO: expand to all 13 categories from BUILD_BRIEF when real words.json is dropped in
export const CATEGORIES: Category[] = [
  { id: 'food',     name: 'Food & Drink',        emoji: '🍎' },
  { id: 'home',     name: 'Home & Furniture',    emoji: '🪑' },
  { id: 'people',   name: 'People & Family',     emoji: '👪' },
  { id: 'body',     name: 'Body & Health',       emoji: '✋' },
  { id: 'animals',  name: 'Animals',             emoji: '🐾' },
  { id: 'nature',   name: 'Nature & Weather',    emoji: '🌿' },
  { id: 'places',   name: 'Places & Buildings',  emoji: '✈️' },
  { id: 'clothing', name: 'Clothing',            emoji: '👕' },
];

export const GENDER_CONFIG = {
  der: { label: 'der', tag: 'masculine', color: '#3360D2', tint: '#E6ECFB', deep: '#21407F' },
  die: { label: 'die', tag: 'feminine',  color: '#D6519A', tint: '#FBE6F0', deep: '#92335F' },
  das: { label: 'das', tag: 'neuter',    color: '#A66F3C', tint: '#F4E8D6', deep: '#6E4926' },
} as const;
