'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './ToastProvider';

type Status = 'idle' | 'loading' | 'done' | 'already' | 'error';

// Port of the original home "Never Miss a Story" box. Emails go into the
// `subscribers` table (the same one Admin → User Management reads).
export default function SubscribeBox() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const { showToast } = useToast();

  const reset = (ms: number) => setTimeout(() => setStatus('idle'), ms);

  const subscribe = async () => {
    const email = (inputRef.current?.value || '').trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setStatus('error');
      reset(3000);
      return;
    }
    setStatus('loading');
    try {
      const { data: existing } = await supabase.from('subscribers').select('email').eq('email', email).maybeSingle();
      if (existing) {
        setStatus('already');
        reset(4000);
        return;
      }
      const { error } = await supabase.from('subscribers').insert([{ email, subscribed_at: new Date().toISOString() }]);
      if (error && error.code !== '23505') {
        showToast('Subscribe error: ' + error.message);
        setStatus('error');
        reset(3000);
        return;
      }
      if (inputRef.current) inputRef.current.value = '';
      setStatus(error ? 'already' : 'done');
      reset(4000);
    } catch {
      showToast('Subscribe failed. Check your connection and try again.');
      setStatus('error');
      reset(3000);
    }
  };

  return (
    <div
      style={{ background: 'linear-gradient(135deg, #005c37, #0a2018)', borderRadius: 12, padding: 24, textAlign: 'center', border: '1px solid rgba(0,135,81,0.3)', marginBottom: 16 }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>🚀</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6, fontFamily: 'Georgia,serif' }}>Never Miss a Story</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>Get the Daily Naija Digest. Free forever.</div>
      {status === 'done' || status === 'already' ? (
        <div style={{ background: 'rgba(0,135,81,0.3)', borderRadius: 8, padding: '12px 16px', color: '#fff', fontSize: 14, fontWeight: 600 }}>
          {status === 'already' ? "😊 You're already subscribed. We'll keep the good stuff coming!" : '🎉 Subscribed! Welcome to the Naija Digest.'}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, maxWidth: 420, margin: '0 auto', flexWrap: 'wrap' }}>
          <input
            ref={inputRef}
            name="email"
            type="email"
            placeholder="Enter your email…"
            autoComplete="email"
            onKeyDown={(e) => e.key === 'Enter' && subscribe()}
            style={{ flex: 1, minWidth: 180, padding: '10px 14px', borderRadius: 8, border: status === 'error' ? '1px solid #ff6b6b' : '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'Georgia,serif' }}
          />
          <button
            onClick={subscribe}
            disabled={status === 'loading'}
            style={{ background: '#F4A800', color: '#000', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: status === 'loading' ? 0.7 : 1 }}
          >
            {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
          </button>
        </div>
      )}
      {status === 'error' && <div style={{ fontSize: 11, color: '#ff8080', marginTop: 6 }}>Please enter a valid email address</div>}
    </div>
  );
}
