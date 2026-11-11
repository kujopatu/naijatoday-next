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
  { name: 'National', icon: '🇳🇬', color: '#008751' },
  { name: 'Metro & Local', icon: '🏙️', color: '#3B82F6' },
  { name: 'Politics', icon: '🏛️', color: '#A8E6CF' },
  { name: 'Government & Policy', icon: '⚖️', color: '#64748B' },
  { name: 'Crime & Security', icon: '🛡️', color: '#DC2626' },
  { name: 'Business', icon: '💼', color: '#FF8B94' },
  { name: 'Economy', icon: '📈', color: '#0D9488' },
  { name: 'Energy', icon: '⚡', color: '#EAB308' },
  { name: 'Agriculture', icon: '🌾', color: '#65A30D' },
  { name: 'Transport', icon: '🚆', color: '#0EA5E9' },
  { name: 'Environment', icon: '🌍', color: '#16A34A' },
  { name: 'Education', icon: '📚', color: '#FFD93D' },
  { name: 'Jobs', icon: '💰', color: '#C9B1FF' },
  { name: 'Scholarships', icon: '🎓', color: '#F8B500' },
  { name: 'Health', icon: '❤️', color: '#FF6B6B' },
  { name: 'Technology', icon: '💻', color: '#A29BFE' },
  { name: 'Science & Innovation', icon: '🔬', color: '#6366F1' },
  { name: 'Sports', icon: '⚽', color: '#6BCB77' },
  { name: 'Entertainment', icon: '🎭', color: '#FF6B6B' },
  { name: 'Music', icon: '🎵', color: '#4ECDC4' },
  { name: 'Celebrity', icon: '⭐', color: '#FFE66D' },
  { name: 'Lifestyle', icon: '🌟', color: '#45B7D1' },
  { name: 'Food & Culture', icon: '🍲', color: '#F97316' },
  { name: 'Travel & Tourism', icon: '✈️', color: '#06B6D4' },
  { name: 'Relationship', icon: '💕', color: '#F7DC6F' },
  { name: 'Religion', icon: '🕌', color: '#A8D8EA' },
  { name: 'Opinion', icon: '🗣️', color: '#8B5CF6' },
  { name: 'Diaspora', icon: '🌐', color: '#14B8A6' },
  { name: 'Viral', icon: '🔥', color: '#FF8C42' },
  { name: 'Forum', icon: '💬', color: '#B8E0D2' },
];

export function normalizeCategory(value: string | null | undefined, fallback = 'National') {
  const candidate = (value || '').trim().toLowerCase();
  if (!candidate) return fallback;
  if (candidate === 'nigeria' || candidate === 'news' || candidate === 'national news') return 'National';
  return CATEGORIES.find((category) => category.name.toLowerCase() === candidate)?.name || fallback;
}

export function findCategory(name: string | null | undefined) {
  const normalized = normalizeCategory(name, '');
  return CATEGORIES.find((c) => c.name === normalized);
}
