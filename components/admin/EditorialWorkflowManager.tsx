'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import { useToast } from '../ToastProvider';

type WorkflowPost = {
  id: string; title: string; excerpt: string | null; category: string;
  author: string | null; published: boolean | null; workflow_status: string;
  assigned_to: string | null; scheduled_at: string | null; created_at: string;
  published_at: string | null;
};
type Revision = { id: number; snapshot: Record<string, unknown>; changed_by: string | null; changed_at: string };

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', in_review: 'In review', approved: 'Approved',
  scheduled: 'Scheduled', published: 'Published', rejected: 'Needs changes',
};

export default function EditorialWorkflowManager() {
  const { card, border, text, muted } = useTheme();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<WorkflowPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [calendar, setCalendar] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [scheduleValues, setScheduleValues] = useState<Record<string, string>>({});
  const [revisionPost, setRevisionPost] = useState<WorkflowPost | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revisionBusy, setRevisionBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('posts')
      .select('id,title,excerpt,category,author,published,workflow_status,assigned_to,scheduled_at,created_at,published_at')
      .order('created_at', { ascending: false }).limit(500);
    if (error) showToast('Could not load newsroom workflow: ' + error.message);
    else setPosts((data || []) as WorkflowPost[]);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => posts.filter((p) => {
    const matchesStatus = filter === 'all' || p.workflow_status === filter;
    const q = search.trim().toLowerCase();
    return matchesStatus && (!q || p.title.toLowerCase().includes(q) || (p.author || '').toLowerCase().includes(q) || (p.assigned_to || '').toLowerCase().includes(q));
  }), [posts, filter, search]);

  const update = async (post: WorkflowPost, values: Record<string, unknown>, message: string) => {
    setBusy(post.id);
    const { error } = await supabase.from('posts').update({ ...values, updated_at: new Date().toISOString() }).eq('id', post.id);
    if (error) showToast('Update failed: ' + error.message);
    else { showToast(message); await load(); }
    setBusy(null);
  };

  const setStatus = (post: WorkflowPost, status: string) => {
    if (status === 'published') {
      void update(post, { workflow_status: 'published', published: true, published_at: new Date().toISOString(), scheduled_at: null }, 'Article published.');
    } else if (status === 'scheduled') {
      const value = scheduleValues[post.id];
      if (!value || new Date(value).getTime() <= Date.now()) { showToast('Choose a future publication date and time first.'); return; }
      void update(post, { workflow_status: 'scheduled', published: false, scheduled_at: new Date(value).toISOString() }, 'Article added to the scheduled queue.');
    } else {
      void update(post, { workflow_status: status, published: false, scheduled_at: null }, 'Workflow status updated.');
    }
  };

  const saveAssignment = (post: WorkflowPost) => {
    const email = (assignments[post.id] ?? post.assigned_to ?? '').trim();
    void update(post, { assigned_to: email || null }, email ? 'Article assignment saved.' : 'Article assignment cleared.');
  };

  const openRevisions = async (post: WorkflowPost) => {
    setRevisionPost(post); setRevisions([]); setRevisionBusy(true);
    const { data, error } = await supabase.from('post_revisions')
      .select('id,snapshot,changed_by,changed_at').eq('post_id', post.id)
      .order('changed_at', { ascending: false }).limit(30);
    if (error) showToast('Could not load revisions: ' + error.message);
    else setRevisions((data || []) as Revision[]);
    setRevisionBusy(false);
  };

  const restoreRevision = async (revision: Revision) => {
    if (!revisionPost || !window.confirm('Restore this earlier article version? The current version will first be saved in revision history.')) return;
    const s = revision.snapshot;
    setRevisionBusy(true);
    const { error } = await supabase.from('posts').update({
      title: s.title, excerpt: s.excerpt, content: s.content, category: s.category,
      image: s.image, author: s.author, read_time: s.read_time, tags: s.tags,
      seo_title: s.seo_title, seo_description: s.seo_description,
      published: s.published, updated_at: new Date().toISOString(),
    }).eq('id', revisionPost.id);
    if (error) showToast('Restore failed: ' + error.message);
    else { showToast('Earlier version restored.'); setRevisionPost(null); await load(); }
    setRevisionBusy(false);
  };

  const counts = useMemo(() => posts.reduce((a, p) => { a[p.workflow_status] = (a[p.workflow_status] || 0) + 1; return a; }, {} as Record<string, number>), [posts]);
  const scheduled = useMemo(() => [...posts].filter(p => p.workflow_status === 'scheduled').sort((a,b) => (a.scheduled_at || '').localeCompare(b.scheduled_at || '')), [posts]);
  const grouped = useMemo(() => scheduled.reduce((a,p) => { const day = p.scheduled_at ? new Date(p.scheduled_at).toLocaleDateString('en-NG',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : 'Unscheduled'; (a[day] ||= []).push(p); return a; }, {} as Record<string, WorkflowPost[]>), [scheduled]);

  const btn: React.CSSProperties = { border: `1px solid ${border}`, background: 'transparent', color: text, borderRadius: 7, padding: '7px 10px', fontSize: 12, cursor: 'pointer' };
  const input: React.CSSProperties = { width: '100%', minWidth: 125, border: `1px solid ${border}`, background: card, color: text, borderRadius: 7, padding: '7px 8px', fontSize: 12, boxSizing: 'border-box' };

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:14}}>
      <div><div style={{fontSize:18,fontWeight:800,color:text}}>🗞️ Editorial Workflow & Calendar</div><div style={{fontSize:12,color:muted,marginTop:4}}>Assign stories, manage review stages, schedule publication and restore previous versions.</div></div>
      <button style={btn} onClick={() => void load()}>↻ Refresh</button>
    </div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
      {['all','draft','in_review','approved','scheduled','published','rejected'].map(key => <button key={key} onClick={()=>setFilter(key)} style={{...btn,background:filter===key?G.green:'transparent',color:filter===key?'#fff':text,borderColor:filter===key?G.green:border}}>{key==='all'?'All':STATUS_LABELS[key]} ({key==='all'?posts.length:(counts[key]||0)})</button>)}
      <button style={{...btn,marginLeft:'auto',background:calendar?G.gold:'transparent',color:calendar?'#111':text,borderColor:calendar?G.gold:border}} onClick={()=>setCalendar(!calendar)}>{calendar?'List view':'🗓️ Calendar view'}</button>
    </div>
    {calendar ? <div>
      <div style={{fontSize:12,color:muted,marginBottom:12}}>Scheduled publication calendar · {scheduled.length} scheduled article(s)</div>
      {Object.keys(grouped).length===0 ? <div style={{padding:28,textAlign:'center',color:muted,border:`1px dashed ${border}`,borderRadius:10}}>No scheduled stories yet. Set a future date from the list view.</div> : Object.entries(grouped).map(([day,items])=><div key={day} style={{marginBottom:16}}><div style={{fontWeight:800,color:text,marginBottom:8}}>{day}</div>{items.map(p=><div key={p.id} style={{padding:12,background:card,border:`1px solid ${border}`,borderRadius:8,marginBottom:7}}><div style={{fontWeight:700,color:text,fontSize:13}}>{p.title}</div><div style={{fontSize:11,color:muted,marginTop:4}}>{p.scheduled_at?new Date(p.scheduled_at).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'}):''} · {p.category} · {p.assigned_to||'Unassigned'}</div></div>)}</div>)}
    </div> : <>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search title, author or assigned writer…" style={{...input,marginBottom:12,padding:10}} />
      {loading ? <div style={{padding:28,textAlign:'center',color:muted}}>Loading newsroom queue…</div> : visible.length===0 ? <div style={{padding:28,textAlign:'center',color:muted}}>No articles match this view.</div> : visible.map(post=><div key={post.id} style={{background:card,border:`1px solid ${border}`,borderRadius:10,padding:13,marginBottom:9}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:220}}><div style={{fontWeight:800,color:text,fontSize:14}}>{post.title}</div><div style={{fontSize:11,color:muted,marginTop:4}}>{post.category} · By {post.author||'NaijaToday Desk'} · {new Date(post.created_at).toLocaleDateString('en-NG')}</div></div>
          <span style={{fontSize:10,fontWeight:800,color:post.workflow_status==='published'?G.green:post.workflow_status==='rejected'?G.red:G.gold}}>{STATUS_LABELS[post.workflow_status]||post.workflow_status}</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8,marginTop:12}}>
          <div><div style={{fontSize:10,color:muted,marginBottom:4}}>ASSIGNED WRITER / EDITOR</div><div style={{display:'flex',gap:5}}><input style={input} placeholder="writer@email.com" value={assignments[post.id]??post.assigned_to??''} onChange={e=>setAssignments(a=>({...a,[post.id]:e.target.value}))}/><button style={btn} disabled={busy===post.id} onClick={()=>saveAssignment(post)}>Save</button></div></div>
          <div><div style={{fontSize:10,color:muted,marginBottom:4}}>SCHEDULE PUBLICATION</div><div style={{display:'flex',gap:5}}><input type="datetime-local" style={input} value={scheduleValues[post.id]??(post.scheduled_at?new Date(post.scheduled_at).toISOString().slice(0,16):'')} onChange={e=>setScheduleValues(a=>({...a,[post.id]:e.target.value}))}/><button style={btn} disabled={busy===post.id} onClick={()=>setStatus(post,'scheduled')}>Set</button></div></div>
          <div><div style={{fontSize:10,color:muted,marginBottom:4}}>WORKFLOW ACTION</div><select style={input} value={post.workflow_status} disabled={busy===post.id} onChange={e=>setStatus(post,e.target.value)}>{Object.entries(STATUS_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
        </div>
        <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:10}}><button style={btn} onClick={()=>void openRevisions(post)}>🕘 Revision history</button>{post.workflow_status==='approved'&&<button style={{...btn,background:G.green,color:'#fff',borderColor:G.green}} onClick={()=>setStatus(post,'published')}>Publish now</button>}{busy===post.id&&<span style={{fontSize:11,color:muted,alignSelf:'center'}}>Saving…</span>}</div>
      </div>)}
    </>}
    {revisionPost&&<div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.68)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}><div style={{background:card,border:`1px solid ${border}`,borderRadius:12,padding:18,width:'min(680px,100%)',maxHeight:'85vh',overflow:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center'}}><div style={{fontWeight:800,color:text}}>Revision history · {revisionPost.title}</div><button style={btn} onClick={()=>setRevisionPost(null)}>Close</button></div>
      {revisionBusy?<div style={{padding:20,color:muted}}>Loading revisions…</div>:revisions.length===0?<div style={{padding:20,color:muted}}>No earlier revisions recorded yet. Changes made after this feature was installed will appear here.</div>:revisions.map(r=><div key={r.id} style={{borderTop:`1px solid ${border}`,padding:'12px 0'}}><div style={{fontSize:12,color:text,fontWeight:700}}>{String(r.snapshot.title||'Previous version')}</div><div style={{fontSize:11,color:muted,margin:'4px 0 8px'}}>{new Date(r.changed_at).toLocaleString('en-NG')} · {r.changed_by||'Admin'}</div><div style={{fontSize:12,color:muted,whiteSpace:'pre-wrap'}}>{String(r.snapshot.excerpt||'')}</div><button disabled={revisionBusy} style={{...btn,marginTop:8}} onClick={()=>void restoreRevision(r)}>Restore this version</button></div>)}
    </div></div>}
    <div style={{fontSize:11,color:muted,marginTop:12}}>Scheduled articles are checked automatically every five minutes by the publishing service. Confirm the article is approved before adding it to the queue.</div>
  </div>;
}
