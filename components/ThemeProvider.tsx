'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type ThemeCtx = {
  darkMode: boolean;
  toggleDarkMode: () => void;
  card: string;
  border: string;
  text: string;
  muted: string;
};

const Ctx = createContext<ThemeCtx | null>(null);

// Same derived values and localStorage key ("naija_darkmode") as the
// original Vite app, just centralized in a context instead of being
// threaded through every component's props.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('naija_darkmode');
      if (stored !== null) setDarkMode(stored === 'true');
    } catch {}
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((d) => {
      const next = !d;
      try {
        localStorage.setItem('naija_darkmode', String(next));
      } catch {}
      return next;
    });
  };

  const value: ThemeCtx = {
    darkMode,
    toggleDarkMode,
    card: darkMode ? '#181c25' : '#fff',
    border: darkMode ? '#252a36' : '#e2e8f0',
    text: darkMode ? '#e2e8f0' : '#1a202c',
    muted: darkMode ? '#8892a4' : '#718096',
  };

  return (
    <Ctx.Provider value={value}>
      <div style={{ background: darkMode ? '#0f1117' : '#f5f7fa', minHeight: '100vh' }}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
