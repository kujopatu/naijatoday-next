'use client';

export default function StreakBadge({ current }: { current: number }) {
  if (current === 0) return null;
  const flame = current >= 30 ? '🔥🔥🔥' : current >= 14 ? '🔥🔥' : '🔥';
  const color = current >= 30 ? '#ef4444' : current >= 14 ? '#f97316' : '#F4A800';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: color + '22', border: `1px solid ${color}44`, borderRadius: 20, padding: '4px 12px' }}>
      <span style={{ fontSize: 14 }}>{flame}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{current}-day streak!</span>
    </div>
  );
}
