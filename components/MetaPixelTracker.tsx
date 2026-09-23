'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Fires a Meta Pixel PageView on every client-side route change.
 * Drop this once in app/layout.tsx (inside <body>), alongside the base
 * fbq('init', ...) script loaded via next/script — see layout.tsx.example.
 *
 * This replaces the manual SPA-aware PageView tracking you built for
 * the Vite app; Next.js's router gives you real navigation events.
 */
export default function MetaPixelTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  }, [pathname, searchParams]);

  return null;
}
