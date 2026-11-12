'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import { useToast } from '../ToastProvider';

type Submission = {
  id: string; headline: string; category: string; location: string; details: string;
  witnessed_at: string | null; source_type: string; submitter_name: string;
  contact_email: string | null; contact_phone: string | null; photo_path: string | null;
  status: 'new' | 'reviewing' | 'accepted' | 'rejected'; editor_notes: string | null; created_at: string; converted_post_id: string | null; converted_at: string | null;
};

const statusLabels: Record<Submission['status'], string> = { new: 'NEW', reviewing: 'IN REVIEW', accepted: 'ACCEPTED', rejected: 'REJECTED' };

export default function StorySubmissionsPanel() {
  const { card, border, text, muted, darkMode } = useTheme();
  const { showToast } = useToast();
  const [items, setItems] = useState<Submission[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | Submission['status']>('new');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('story_submissions').select('*').order('created_at', { ascending: false }).limit(300);
    if (error) {
      showToast('Could not load reader tips: ' + error.message);
      setItems([]);
    } else {
      const rows = (data || []) as Submission[];
      setItems(rows);
      setNotes(Object.fromEntries(rows.map(row => [row.id, row.editor_notes || ''])));
      const paths = rows.filter(row => row.photo_path).map(row => row.photo_path as string);
      const urls: Record<string, string> = {};
      await Promise.all(paths.map(async path => {
        const { data: signed } = await supabase.storage.from('story-tips').createSignedUrl(path, 1800);
        if (signed?.signedUrl) urls[path] = signed.signedUrl;
      }));
      setPhotos(urls);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    all: items.length,
    new: items.filter(x => x.status === 'new').length,
    reviewing: items.filter(x => x.status === 'reviewing').length,
    accepted: items.filter(x => x.status === 'accepted').length,
    rejected: items.filter(x => x.status === 'rejected').length,
  }), [items]);

  const visible = filter === 'all' ? items : items.filter(item => item.status === filter);

  const update = async (item: Submission, status: Submission['status']) => {
    setBusy(item.id);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('story_submissions').update({
      status,
      editor_notes: notes[item.id]?.trim() || null,
      reviewed_by: userData.user?.id || null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', item.id);
    if (error) showToast('Could not update submission: ' + error.message);
    else { showToast('Submission updated.'); await load(); }
    setBusy(null);
  };

  const convertToDraft = async (item: Submission) => {
    if (item.converted_post_id) {
      showToast('This submission has already been converted to an article draft.');
      return;
    }
    if (item.status !== 'accepted') {
      showToast('Accept the tip after editorial review before creating a draft.');
      return;
    }
    if (!window.confirm('Create an UNPUBLISHED article draft from this reader tip? The submitter’s contact details and name will not be copied into the article.')) return;
    setBusy(item.id);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const excerpt = item.details.trim().replace(/\\s+/g, ' ').slice(0, 220);
      const reportContext = [
        item.location ? 'Reported location: ' + item.location : '',
        item.witnessed_at ? 'Reported date: ' + new Date(item.witnessed_at).toLocaleString('en-NG') : '',
        'Source: Reader-submitted tip (requires independent verification).',
        '',
        item.details.trim(),
      ].filter(Boolean).join('\\n\\n');
      const now = new Date().toISOString();
      const { data: post, error: postError } = await supabase.from('posts').insert([{
        title: item.headline,
        excerpt,
        content: reportContext,
        category: item.category,
        image: '📰',
        author: 'NaijaToday Editorial Desk',
        read_time: '3 min',
        breaking: false,
        hot: false,
        featured: false,
        sponsored: false,
        tags: ['reader tip', item.category.toLowerCase()],
        published: false,
        views: 0,
        upvotes: 0,
        comments: 0,
        created_at: now,
        updated_at: now,
        created_by: userData.user?.id || null,
      }]).select('id').single();
      if (postError || !post) throw new Error(postError?.message || 'The article draft could not be created.');

      const { error: linkError } = await supabase.from('story_submissions').update({
        converted_post_id: post.id,
        converted_at: now,
        status: 'accepted',
        reviewed_by: userData.user?.id || null,
        reviewed_at: now,
        editor_notes: notes[item.id]?.trim() || item.editor_notes || null,
      }).eq('id', item.id).is('converted_post_id', null);
      if (linkError) {
        showToast('Draft created, but the submission link could not be saved. Do not convert it again; check Manage Articles for: ' + item.headline);
      } else {
        showToast('Unpublished article draft created and linked to this reader tip.');
      }
      await load();
    } catch (error) {
      showToast('Could not create article draft: ' + (error instanceof Error ? error.message : 'Connection error'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (item: Submission) => {
    if (!window.confirm('Permanently delete this reader submission?')) return;
    setBusy(item.id);
    const { error } = await supabase.from('story_submissions').delete().eq('id', item.id);
    if (error) showToast('Could not delete submission: ' + error.message);
    else { showToast('Submission deleted.'); await load(); }
    setBusy(null);
  };

  const tab = (key: typeof filter, label: string, count: number) => (
    <button key={key} onClick={() => setFilter(key)} style={{ border: `1px solid ${filter === key ? G.green : border}`, background: filter === key ? G.green : 'transparent', color: filter === key ? '#fff' : muted, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{label} ({count})</button>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div><div style={{ color: text, fontSize: 18, fontWeight: 800, fontFamily: 'Georgia,serif' }}>📨 Reader News Tips</div><div style={{ color: muted, fontSize: 12, marginTop: 4 }}>Review tips submitted through the public NaijaToday website. Nothing is published automatically.</div></div>
        <button onClick={() => void load()} style={{ border: `1px solid ${border}`, borderRadius: 8, background: 'transparent', color: muted, padding: '8px 12px', cursor: 'pointer' }}>↻ Refresh</button>
      </div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
        {tab('new', 'New', counts.new)}{tab('reviewing', 'In review', counts.reviewing)}{tab('accepted', 'Accepted', counts.accepted)}{tab('rejected', 'Rejected', counts.rejected)}{tab('all', 'All', counts.all)}
      </div>
      {loading ? <div style={{ padding: 35, textAlign: 'center', color: muted }}>Loading reader submissions…</div> : visible.length === 0 ? <div style={{ padding: 35, textAlign: 'center', color: muted, border: `1px dashed ${border}`, borderRadius: 10 }}>No submissions in this view yet.</div> : visible.map(item => {
        const open = expanded === item.id;
        return <article key={item.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 11, padding: 15, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', marginBottom: 7 }}>
                <span style={{ color: G.green, background: G.green + '18', padding: '3px 7px', borderRadius: 5, fontSize: 10, fontWeight: 800 }}>{item.category}</span>
                <span style={{ color: item.status === 'new' ? '#b7791f' : muted, fontSize: 10, fontWeight: 800 }}>{statusLabels[item.status]}</span>
                <span style={{ color: muted, fontSize: 10 }}>{new Date(item.created_at).toLocaleString('en-NG')}</span>
              </div>
              <h3 style={{ color: text, fontSize: 15, lineHeight: 1.4, margin: '0 0 5px' }}>{item.headline}</h3>
              <div style={{ color: muted, fontSize: 12 }}>{item.location} · {item.source_type.replaceAll('_', ' ')} · From {item.submitter_name}</div>
            </div>
            <button onClick={() => setExpanded(open ? null : item.id)} style={{ border: `1px solid ${border}`, borderRadius: 7, background: 'transparent', color: text, padding: '8px 11px', cursor: 'pointer', fontSize: 12 }}>{open ? 'Hide details' : 'Review submission'}</button>
          </div>
          {open && <div style={{ borderTop: `1px solid ${border}`, marginTop: 14, paddingTop: 14 }}>
            <div style={{ color: text, fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{item.details}</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: muted, fontSize: 12, marginTop: 12 }}>
              {item.contact_email && <a href={`mailto:${item.contact_email}`} style={{ color: G.green }}>Email: {item.contact_email}</a>}
              {item.contact_phone && <a href={`tel:${item.contact_phone}`} style={{ color: G.green }}>Phone: {item.contact_phone}</a>}
              {item.witnessed_at && <span>Reported date: {new Date(item.witnessed_at).toLocaleString('en-NG')}</span>}
            </div>
            {item.photo_path && (photos[item.photo_path] ? <a href={photos[item.photo_path]} target="_blank" rel="noreferrer"><img src={photos[item.photo_path]} alt="Reader-submitted supporting photo" style={{ display: 'block', maxWidth: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 8, marginTop: 14, background: darkMode ? '#080b10' : '#f1f4f2' }} /></a> : <div style={{ color: muted, fontSize: 12, marginTop: 10 }}>Photo preview unavailable. Refresh to try again.</div>)}
            {item.converted_post_id && <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: G.green + '12', color: G.green, fontSize: 12, fontWeight: 700 }}>✓ Converted to an unpublished article draft · {item.converted_at ? new Date(item.converted_at).toLocaleString('en-NG') : 'Draft linked'}</div>}
            <label style={{ display: 'block', color: text, fontSize: 12, fontWeight: 700, margin: '16px 0 6px' }} htmlFor={`notes-${item.id}`}>Internal editorial notes (not public)</label>
            <textarea id={`notes-${item.id}`} rows={3} value={notes[item.id] || ''} onChange={e => setNotes(current => ({ ...current, [item.id]: e.target.value }))} placeholder="Verification notes, follow-up required, editorial decision…" style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${border}`, borderRadius: 8, padding: 10, background: darkMode ? '#111520' : '#f7f9f8', color: text, fontSize: 13, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <button disabled={!!busy} onClick={() => void update(item, 'reviewing')} style={{ border: `1px solid ${border}`, background: 'transparent', color: text, borderRadius: 7, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{busy === item.id ? 'Saving…' : 'Mark in review'}</button>
              <button disabled={!!busy} onClick={() => void update(item, 'accepted')} style={{ border: 0, background: G.green, color: '#fff', borderRadius: 7, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Accept tip</button>
              {item.status === 'accepted' && !item.converted_post_id && <button disabled={!!busy} onClick={() => void convertToDraft(item)} style={{ border: '1px solid ' + G.green, background: G.green + '12', color: G.green, borderRadius: 7, padding: '9px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{busy === item.id ? 'Creating draft…' : 'Create article draft'}</button>}
              {item.converted_post_id && <span style={{ alignSelf: 'center', color: G.green, fontSize: 12, fontWeight: 800 }}>Draft created</span>}
              <button disabled={!!busy} onClick={() => void update(item, 'rejected')} style={{ border: '1px solid #c65b55', background: 'transparent', color: '#c65b55', borderRadius: 7, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Reject</button>
              <button disabled={!!busy} onClick={() => void remove(item)} style={{ border: `1px solid ${border}`, background: 'transparent', color: muted, borderRadius: 7, padding: '9px 12px', fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}>Delete</button>
            </div>
          </div>}
        </article>;
      })}
    </div>
  );
}
