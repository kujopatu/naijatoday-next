'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

const categories = ['General', 'Politics', 'Business', 'Entertainment', 'Sports', 'Education', 'Health', 'Community', 'Technology', 'Security'];

export default function StorySubmissionForm() {
  const { card, border, text, muted, darkMode } = useTheme();
  const [form, setForm] = useState({ headline: '', category: 'General', location: '', details: '', witnessedAt: '', sourceType: 'reader_tip', name: '', email: '', phone: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const startedAt = useRef(Date.now());

  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: `1px solid ${border}`, borderRadius: 9, padding: '12px 13px', background: darkMode ? '#111520' : '#fff', color: text, fontSize: 14, outline: 'none' };
  const label: React.CSSProperties = { display: 'block', color: text, fontSize: 13, fontWeight: 700, marginBottom: 7 };
  const field: React.CSSProperties = { marginBottom: 16 };
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    if (website) return;
    if (Date.now() - startedAt.current < 2500) {
      setStatus({ kind: 'error', message: 'Please review your submission and try again.' });
      return;
    }
    if (form.details.trim().length < 30) {
      setStatus({ kind: 'error', message: 'Please provide at least 30 characters of story details.' });
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      setStatus({ kind: 'error', message: 'Please provide an email address or phone number so our editors can follow up.' });
      return;
    }
    if (photo && (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 8 * 1024 * 1024)) {
      setStatus({ kind: 'error', message: 'Photo must be JPG, PNG or WebP and no larger than 8 MB.' });
      return;
    }
    setSending(true);
    let photoPath: string | null = null;
    try {
      if (photo) {
        const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
        photoPath = `incoming/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('story-tips').upload(photoPath, photo, { contentType: photo.type, upsert: false });
        if (uploadError) throw uploadError;
      }
      const { error } = await supabase.from('story_submissions').insert({
        headline: form.headline.trim(),
        category: form.category,
        location: form.location.trim(),
        details: form.details.trim(),
        witnessed_at: form.witnessedAt ? new Date(form.witnessedAt).toISOString() : null,
        source_type: form.sourceType,
        submitter_name: form.name.trim(),
        contact_email: form.email.trim() || null,
        contact_phone: form.phone.trim() || null,
        photo_path: photoPath,
      });
      if (error) throw error;
      setStatus({ kind: 'success', message: 'Your story tip has been received. Our editorial team will review it before any decision to publish.' });
      setForm({ headline: '', category: 'General', location: '', details: '', witnessedAt: '', sourceType: 'reader_tip', name: '', email: '', phone: '' });
      setPhoto(null);
      startedAt.current = Date.now();
      const fileInput = document.getElementById('story-tip-photo') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'We could not submit your tip. Please try again.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 'clamp(18px,4vw,30px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
        <div style={field}><label style={label} htmlFor="tip-headline">Story headline *</label><input id="tip-headline" required minLength={8} maxLength={180} value={form.headline} onChange={e => update('headline', e.target.value)} placeholder="What happened?" style={input} /></div>
        <div style={field}><label style={label} htmlFor="tip-category">Category</label><select id="tip-category" value={form.category} onChange={e => update('category', e.target.value)} style={input}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
        <div style={field}><label style={label} htmlFor="tip-location">Location *</label><input id="tip-location" required maxLength={160} value={form.location} onChange={e => update('location', e.target.value)} placeholder="Town, state or area" style={input} /></div>
        <div style={field}><label style={label} htmlFor="tip-type">Type of submission</label><select id="tip-type" value={form.sourceType} onChange={e => update('sourceType', e.target.value)} style={input}><option value="reader_tip">News tip</option><option value="eyewitness">Eyewitness account</option><option value="community_story">Community story</option><option value="story_idea">Story idea</option></select></div>
        <div style={field}><label style={label} htmlFor="tip-date">When did it happen? (optional)</label><input id="tip-date" type="datetime-local" value={form.witnessedAt} onChange={e => update('witnessedAt', e.target.value)} style={input} /></div>
      </div>
      <div style={field}><label style={label} htmlFor="tip-details">Tell us what happened *</label><textarea id="tip-details" required minLength={30} maxLength={10000} rows={7} value={form.details} onChange={e => update('details', e.target.value)} placeholder="Share the key facts. Tell us what you personally witnessed and what you learned from other sources." style={{ ...input, resize: 'vertical', lineHeight: 1.6 }} /><div style={{ color: muted, fontSize: 11, textAlign: 'right' }}>{form.details.length.toLocaleString()}/10,000</div></div>
      <div style={{ borderTop: `1px solid ${border}`, paddingTop: 18, marginTop: 8 }}>
        <h3 style={{ color: text, fontSize: 16, margin: '0 0 6px' }}>Your contact details</h3>
        <p style={{ color: muted, fontSize: 12, lineHeight: 1.5, margin: '0 0 14px' }}>We use these details only to clarify or verify your submission. At least one contact method is required.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
          <div style={field}><label style={label} htmlFor="tip-name">Your name *</label><input id="tip-name" required minLength={2} maxLength={100} value={form.name} onChange={e => update('name', e.target.value)} style={input} /></div>
          <div style={field}><label style={label} htmlFor="tip-email">Email address</label><input id="tip-email" type="email" maxLength={254} value={form.email} onChange={e => update('email', e.target.value)} style={input} /></div>
          <div style={field}><label style={label} htmlFor="tip-phone">Phone number</label><input id="tip-phone" type="tel" maxLength={40} value={form.phone} onChange={e => update('phone', e.target.value)} style={input} /></div>
        </div>
      </div>
      <div style={field}><label style={label} htmlFor="story-tip-photo">Attach a photo (optional, JPG/PNG/WebP, max 8 MB)</label><input id="story-tip-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setPhoto(e.target.files?.[0] || null)} style={{ ...input, padding: 9 }} />{photo && <div style={{ color: muted, fontSize: 12, marginTop: 5 }}>{photo.name} · {(photo.size / 1024 / 1024).toFixed(1)} MB</div>}</div>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}><label htmlFor="tip-website">Leave this field empty</label><input id="tip-website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></div>
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: muted, fontSize: 12, lineHeight: 1.6, margin: '8px 0 18px' }}><input type="checkbox" required style={{ marginTop: 3 }} />I confirm that this information is accurate to the best of my knowledge and understand that submission does not guarantee publication.</label>
      {status && <div role="status" style={{ padding: 12, borderRadius: 8, marginBottom: 14, color: status.kind === 'success' ? '#087443' : '#b42318', background: status.kind === 'success' ? '#e9f7ef' : '#fff0ef', fontSize: 13, lineHeight: 1.5 }}>{status.message}</div>}
      <button type="submit" disabled={sending} style={{ width: '100%', border: 0, borderRadius: 9, padding: '14px 18px', color: '#fff', background: G.green, fontSize: 15, fontWeight: 800, cursor: sending ? 'wait' : 'pointer', opacity: sending ? .7 : 1 }}>{sending ? 'Submitting securely…' : 'Submit story tip →'}</button>
      <p style={{ color: muted, fontSize: 11, lineHeight: 1.6, margin: '12px 0 0' }}>Please do not submit private, confidential or unlawfully obtained material. Our editors independently verify tips. Your contact details and uploaded photo are not displayed publicly.</p>
    </form>
  );
}
