// Ported exactly from src/App.tsx in the original Vite app.
export const G = {
  green: '#008751',
  greenDark: '#005c37',
  greenLight: '#e8f5ee',
  red: '#C1292E',
  gold: '#F4A800',
  dark: '#0f1117',
  darkCard: '#181c25',
  darkBorder: '#252a36',
  muted: '#8892a4',
  text: '#e2e8f0',
  lightBg: '#f5f7fa',
  lightCard: '#ffffff',
  lightBorder: '#e2e8f0',
  lightText: '#1a202c',
  lightMuted: '#718096',
} as const;

export type Category = { name: string; icon: string; color: string };

export const CATEGORIES: Category[] = [
  { name: 'Entertainment', icon: '🎭', color: '#FF6B6B' },
  { name: 'Music', icon: '🎵', color: '#4ECDC4' },
  { name: 'Celebrity', icon: '⭐', color: '#FFE66D' },
  { name: 'Politics', icon: '🏛️', color: '#A8E6CF' },
  { name: 'Business', icon: '💼', color: '#FF8B94' },
  { name: 'Technology', icon: '💻', color: '#A29BFE' },
  { name: 'Sports', icon: '⚽', color: '#6BCB77' },
  { name: 'Education', icon: '📚', color: '#FFD93D' },
  { name: 'Jobs', icon: '💰', color: '#C9B1FF' },
  { name: 'Scholarships', icon: '🎓', color: '#F8B500' },
  { name: 'Health', icon: '❤️', color: '#FF6B6B' },
  { name: 'Lifestyle', icon: '🌟', color: '#45B7D1' },
  { name: 'Relationship', icon: '💕', color: '#F7DC6F' },
  { name: 'Religion', icon: '✝️', color: '#A8D8EA' },
  { name: 'Viral', icon: '🔥', color: '#FF8C42' },
  { name: 'Forum', icon: '💬', color: '#B8E0D2' },
];

export function findCategory(name: string | null | undefined) {
  return CATEGORIES.find((c) => c.name === name);
}
