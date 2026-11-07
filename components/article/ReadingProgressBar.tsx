'use client';

import { useEffect, useState } from 'react';
import { G } from '@/lib/theme';

// Thin green bar fixed to the top of the screen that fills as you scroll
// through the element with id="article-body".
export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const el = document.getElementById('article-body');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrolled = Math.max(0, -rect.top);
      setProgress(Math.min(100, Math.round((scrolled / Math.max(rect.height, 1)) * 100)));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 100, background: 'rgba(0,0,0,0.06)' }}>
      <div style={{ height: '100%', width: `${progress}%`, background: G.green, transition: 'width 0.1s linear' }} />
    </div>
  );
}
