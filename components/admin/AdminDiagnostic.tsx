'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ADMIN_EMAIL } from '@/lib/auth';
import { useTheme } from '../ThemeProvider';

export default function AdminDiagnostic({ userEmail }: { userEmail: string }) {
  const { card, border, text, muted } = useTheme();
  const [jwtEmail, setJwtEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setJwtEmail(data?.session?.user?.email || null);
      } catch {}
      setChecked(true);
    })();
  }, []);

  if (!checked) return null;
  const match = !!jwtEmail && jwtEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  if (match) return null; // only surface this when something's actually wrong

  return (
    <div style={{ background: card, border: `1px solid #ff525233`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: muted }}>
      <div>
        App email: <span style={{ color: text, fontWeight: 600 }}>{userEmail || '(none)'}</span>
      </div>
      <div>
        Supabase session email: <span style={{ color: text, fontWeight: 600 }}>{jwtEmail || '(no session)'}</span>
      </div>
      <div>
        Expected admin email: <span style={{ color: text, fontWeight: 600 }}>{ADMIN_EMAIL}</span>
      </div>
      <div style={{ color: '#ff5252', marginTop: 6, fontWeight: 600 }}>
        ⚠️ Your Supabase session email doesn&apos;t match the admin email. Moderator/admin database writes will be blocked by RLS until you log out and back in with {ADMIN_EMAIL}.
      </div>
    </div>
  );
}
