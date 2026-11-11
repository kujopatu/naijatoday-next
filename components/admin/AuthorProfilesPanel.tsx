'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

type AuthorProfile = {
  author_name: string;
  bio: string;
  avatar_url: string | null;
  role_title: string;
  updated_at: string;
};

const empty = { author_name: '', bio: '', avatar_url: '', role_title: 'NaijaToday Contributor' };

export default function AuthorProfilesPanel() {
  const { card, border, text, muted, darkMode } = useTheme();
  const { showToast } = useToast();
  const [profiles, setProfiles] = useState<AuthorProfile[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('author_profiles').select('*').order('author_name');
    if (error) showToast('Could not load author profiles: ' + error.message);
    else setProfiles((data ?? []) as AuthorProfile[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const reset = () => { setForm(empty); setEditing(null); };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.author_name.trim();
    if (!name) { showToast('Enter the author name.'); return; }
    setSaving(true);
    const payload = {
      author_name: name,
      bio: form.bio.trim(),
      avatar_url: form.avatar_url.trim() || null,
      role_title: form.role_title.trim() || 'NaijaToday Contributor',
      updated_at: new Date().toISOString(),
    };
    const result = editing
      ? await supabase.from('author_profiles').update(payload).eq('author_name', editing)
      : await supabase.from('author_profiles').insert(payload);
    if (result.error) showToast('Could not save profile: ' + result.error.message);
    else { showToast('Author profile saved.'); reset(); await load(); }
    setSaving(false);
  };

  const startEdit = (profile: AuthorProfile) => {
    setEditing(profile.author_name);
    setForm({ author_name: profile.author_name, bio: profile.bio, avatar_url: profile.avatar_url ?? '', role_title: profile.role_title });
  };

  const remove = async (profile: AuthorProfile) => {
    if (!window.confirm('Delete the public profile for ' + profile.author_name + '? Their articles will remain published.')) return;
    const { error } = await supabase.from('author_profiles').delete().eq('author_name', profile.author_name);
    if (error) showToast('Could not delete profile: ' + error.message);
    else { showToast('Author profile deleted.'); await load(); }
  };

  const input: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8,
    border: '1px solid ' + border, background: darkMode ? '#111520' : '#fff', color: text, fontSize: 13,
  };

  return (
    <section style={{ background: card, border: '1px solid ' + border, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 19, fontWeight: 800, color: text }}>Journalist & Author Profiles</div>
      <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, margin: '6px 0 18px' }}>
        Create public writer profiles. The author name must match the name used on published articles. Profile details appear on the article byline and author page.
      </p>
      <form onSubmit={save} style={{ display: 'grid', gap: 10, marginBottom: 22 }}>
        <input aria-label="Author name" required maxLength={100} placeholder="Author name (must match article byline)" value={form.author_name} disabled={!!editing} onChange={e => setForm(v => ({ ...v, author_name: e.target.value }))} style={input} />
        <input aria-label="Professional title" maxLength={100} placeholder="Professional title e.g. Senior Correspondent" value={form.role_title} onChange={e => setForm(v => ({ ...v, role_title: e.target.value }))} style={input} />
        <input aria-label="Profile image URL" type="url" placeholder="Profile photo URL (optional)" value={form.avatar_url} onChange={e => setForm(v => ({ ...v, avatar_url: e.target.value }))} style={input} />
        <textarea aria-label="Author biography" maxLength={1200} rows={4} placeholder="Write a verified short biography for this journalist…" value={form.bio} onChange={e => setForm(v => ({ ...v, bio: e.target.value }))} style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button disabled={saving} type="submit" style={{ background: '#008751', color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving…' : editing ? 'Update Profile' : 'Create Profile'}</button>
          {editing && <button type="button" onClick={reset} style={{ background: 'transparent', color: text, border: '1px solid ' + border, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>Cancel</button>}
        </div>
      </form>
      <div style={{ borderTop: '1px solid ' + border, paddingTop: 14 }}>
        <div style={{ color: text, fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Published author profiles ({profiles.length})</div>
        {loading ? <div style={{ color: muted, padding: 18 }}>Loading profiles…</div> : profiles.length === 0
          ? <div style={{ color: muted, padding: 18, textAlign: 'center', fontSize: 13 }}>No author profiles created yet.</div>
          : profiles.map(profile => (
            <div key={profile.author_name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid ' + border, flexWrap: 'wrap' }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#008751', color: '#fff', fontWeight: 800 }}>{profile.author_name[0]?.toUpperCase()}</div>}
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ color: text, fontWeight: 700, fontSize: 13 }}>{profile.author_name}</div>
                <div style={{ color: muted, fontSize: 11 }}>{profile.role_title}</div>
              </div>
              <a href={'/author/' + encodeURIComponent(profile.author_name)} target="_blank" rel="noreferrer" style={{ color: '#008751', fontSize: 12, textDecoration: 'none' }}>View page ↗</a>
              <button type="button" onClick={() => startEdit(profile)} style={{ background: 'transparent', border: '1px solid ' + border, color: text, borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}>Edit</button>
              <button type="button" onClick={() => void remove(profile)} style={{ background: 'transparent', border: '1px solid #dc2626', color: '#dc2626', borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}>Delete</button>
            </div>
          ))}
      </div>
    </section>
  );
}
