'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { G } from '@/lib/theme';

type ToastCtx = { showToast: (message: string) => void };

const Ctx = createContext<ToastCtx | null>(null);

// Replaces the original app's showToast(): a short message that fades
// after a few seconds. Lives at the layout level so any component can use it.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((m: string) => {
    setMessage(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3500);
  }, []);

  return (
    <Ctx.Provider value={{ showToast }}>
      {children}
      {message && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#181c25',
            color: '#e2e8f0',
            border: `1px solid ${G.green}`,
            borderRadius: 10,
            padding: '12px 20px',
            fontSize: 14,
            zIndex: 10000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            maxWidth: '90vw',
            textAlign: 'center',
          }}
        >
          {message}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
