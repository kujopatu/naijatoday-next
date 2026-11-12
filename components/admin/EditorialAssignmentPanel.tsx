'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useAuth } from '../AuthProvider';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

type WorkflowArticle = {
  id: string; title: string; category: string; author: string | null; workflow_status: string;
  assigned_to: string | null; due_at: string | null; submitted_at: string | null;
  created_at: string | null; created_by: string | null; review_notes: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted for review', in_review: 'In review',
  revision_requested: 'Revision requested', approved: 'Approved', rejected: 'Rejected',
};

export default function EditorialAssignmentPanel() {
  const { userEmail, isAdmin, isEditor, isWriter } = useAuth();
  const canReview = isAdmin || isEditor;
  const { showToast } = useToast();
  const { card, border, text, muted, darkMode } = useTheme();
  const [articles, setArticles] = useState<WorkflowArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const [deadlines, setDeadlines] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: queryError } = await supabase.from('posts')
      .select('id,title,category,author,workflow_status,assigned_to,due_at,submitted_at,created_at,created_by,review_notes')
      .eq('published', false).order('updated_at', { ascending: false }).limit(500);
    if (queryError) setError(queryError.message);
    else setArticles((data || []) as WorkflowArticle[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const recordEvent = async (postId: string, action: string, detail?: string) => {
    const { data } = await supabase.auth.getUser();
    return await supabase.from('article_workflow_events').insert({
      post_id: postId, actor_id: data.user?.id, actor_email: userEmail || null, action, notes: detail || null,
    });
  };

  const updateArticle = async (article: WorkflowArticle, patch: Record<string, unknown>, action?: string, detail?: string) => {
    setBusy(article.id);
    const { error: updateError } = await supabase.from('posts').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', article.id);
    if (updateError) showToast('Could not update article: ' + updateError.message);
    else {
      if (action) {
        const { error: eventError } = await recordEvent(article.id, action, detail);
        if (eventError) console.warn('Workflow event could not be recorded:', eventError.message);
      }
      showToast('Editorial workflow updated.');
      await load();
    }
    setBusy(null);
  };

  const submitForReview = (article: WorkflowArticle) => updateArticle(
    article, { workflow_status: 'submitted', submitted_at: new Date().toISOString(), review_notes: null }, 'submitted',
  );

  const assign = (article: WorkflowArticle) => {
    const email = (assignment[article.id] ?? article.assigned_to ?? '').trim();
    if (!email || !email.includes('@')) { showToast('Enter a valid team email for the assignment.'); return; }
    const due = deadlines[article.id] || '';
    void updateArticle(article, { assigned_to: email, due_at: due ? new Date(due + 'T23:59:00').toISOString() : article.due_at }, 'assigned', 'Assigned to ' + email);
  };

  const review = (article: WorkflowArticle, status: 'approved' | 'revision_requested' | 'rejected') => {
    const note = (notes[article.id] || '').trim();
    if (status !== 'approved' && !note) { showToast('Add a short note explaining the requested revision or rejection.'); return; }
    void updateArticle(article, {
      workflow_status: status, review_notes: note || null, reviewed_by: userEmail || null,
      reviewed_at: new Date().toISOString(),
    }, status, note);
  };

  const publishApproved = (article: WorkflowArticle) => {
    if (!window.confirm('Publish this approved article now?')) return;
    void updateArticle(article, { published: true, workflow_status: 'published', published_at: new Date().toISOString() }, 'published');
  };

  const visible = articles.filter(article => filter === 'all' || article.workflow_status === filter);
  const panel: React.CSSProperties = { background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginBottom: 12 };
  const input: React.CSSProperties = { width: '100%', padding: '9px 10px', border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? '#111520' : '#fff', color: text, fontSize: 12, boxSizing: 'border-box' };
  const button = (color = G.green): React.CSSProperties => ({ border: 0, borderRadius: 7, padding: '8px 11px', background: color, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' });
  const overdue = (date: string | null) => !!date && new Date(date).getTime() < Date.now();

  return <section>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
      <div><h2 style={{ margin: 0, color: text, fontSize: 20 }}>📝 Assignments & Approval</h2>
        <p style={{ color: muted, fontSize: 12, margin: '5px 0 0' }}>Assign owners, set deadlines and manage the editorial review path.</p></div>
      <button onClick={() => void load()} style={{ ...button('#475569') }}>↻ Refresh</button>
    </div>
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
      {['all','draft','submitted','in_review','revision_requested','approved','rejected'].map(value =>
        <button key={value} onClick={() => setFilter(value)} style={{ ...button(filter === value ? G.green : '#64748b'), textTransform: 'capitalize' }}>{value.replaceAll('_',' ')}</button>)}
    </div>
    {error && <div role="alert" style={{ color: '#dc2626', background: '#dc262612', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{error}</div>}
    {loading ? <div style={{ color: muted, padding: 28, textAlign: 'center' }}>Loading editorial assignments…</div>
      : visible.length === 0 ? <div style={{ ...panel, textAlign: 'center', color: muted }}>No unpublished articles in this workflow queue.</div>
      : visible.map(article => <article key={article.id} style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: text, fontSize: 14, fontWeight: 800, lineHeight: 1.45 }}>{article.title}</div>
            <div style={{ color: muted, fontSize: 11, marginTop: 4 }}>{article.category} · {article.author || 'NaijaToday Desk'} · {article.created_at ? new Date(article.created_at).toLocaleDateString('en-NG') : 'Date unavailable'}</div>
          </div>
          <span style={{ alignSelf: 'flex-start', borderRadius: 20, padding: '5px 9px', background: '#64748b20', color: text, fontSize: 10, fontWeight: 800 }}>{STATUS_LABELS[article.workflow_status] || article.workflow_status}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: overdue(article.due_at) ? '#dc2626' : muted, fontSize: 11, margin: '10px 0' }}>
          <span>Assigned: {article.assigned_to || 'Unassigned'}</span>
          <span>Deadline: {article.due_at ? new Date(article.due_at).toLocaleDateString('en-NG') : 'Not set'}{overdue(article.due_at) ? ' · OVERDUE' : ''}</span>
          {article.submitted_at && <span>Submitted: {new Date(article.submitted_at).toLocaleDateString('en-NG')}</span>}
        </div>
        {article.review_notes && <div style={{ background: darkMode ? '#1b2432' : '#f1f5f9', color: text, borderRadius: 8, padding: 10, fontSize: 12, marginBottom: 10 }}><strong>Latest editor note:</strong> {article.review_notes}</div>}
        {canReview && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8, marginTop: 10 }}>
          <input aria-label="Assign to team member email" placeholder="Assign to team email" value={assignment[article.id] ?? article.assigned_to ?? ''} onChange={e => setAssignment(v => ({ ...v, [article.id]: e.target.value }))} style={input} />
          <input aria-label="Assignment deadline" type="date" value={deadlines[article.id] ?? (article.due_at ? article.due_at.slice(0,10) : '')} onChange={e => setDeadlines(v => ({ ...v, [article.id]: e.target.value }))} style={input} />
          <button disabled={busy === article.id} onClick={() => assign(article)} style={button()}>Save assignment</button>
        </div>}
        {canReview && ['submitted','in_review','revision_requested'].includes(article.workflow_status) && <div style={{ marginTop: 10 }}>
          <textarea aria-label="Review note" placeholder="Editor feedback (required for revision request or rejection)" value={notes[article.id] || ''} onChange={e => setNotes(v => ({ ...v, [article.id]: e.target.value }))} rows={2} style={{ ...input, resize: 'vertical', marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <button disabled={busy === article.id} onClick={() => review(article, 'approved')} style={button(G.green)}>✓ Approve</button>
            <button disabled={busy === article.id} onClick={() => review(article, 'revision_requested')} style={button('#d97706')}>Request revision</button>
            <button disabled={busy === article.id} onClick={() => review(article, 'rejected')} style={button('#dc2626')}>Reject</button>
          </div>
        </div>}
        {canReview && article.workflow_status === 'approved' && <button disabled={busy === article.id} onClick={() => publishApproved(article)} style={{ ...button(G.green), marginTop: 10 }}>Publish approved article</button>}
        {isWriter && article.created_by && article.workflow_status !== 'submitted' && article.workflow_status !== 'approved' && article.workflow_status !== 'rejected' && <button disabled={busy === article.id} onClick={() => submitForReview(article)} style={{ ...button(), marginTop: 10 }}>Submit for editor review</button>}
        {busy === article.id && <span style={{ color: muted, fontSize: 11, marginLeft: 8 }}>Saving…</span>}
      </article>)}
    <div style={{ color: muted, fontSize: 10, marginTop: 8 }}>Writers can submit their own unpublished work. Editors approve or return work for revision; publication remains a separate editor action.</div>
  </section>;
}
