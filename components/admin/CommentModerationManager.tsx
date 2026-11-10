'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import { useToast } from '../ToastProvider';

type CommentRow = { id: number; post_id: string; user: string; text: string; created_at: string | null; is_hidden: boolean };

export default function CommentModerationManager() {
  const { card, border, text, muted } = useTheme();
  const { showToast } = useToast();
  const [items,setItems] = useState<CommentRow[]>([]);
  const [loading,setLoading] = useState(true);
  const [filter,setFilter] = useState<'all'|'visible'|'hidden'>('all');
  const [search,setSearch] = useState('');
  const [busy,setBusy] = useState<number|null>(null);

  const load = useCallback(async()=>{
    setLoading(true);
    const {data,error}=await supabase.from('comments').select('id,post_id,user,text,created_at,is_hidden').order('created_at',{ascending:false}).limit(500);
    if(error) showToast('Could not load comments: '+error.message);
    else setItems((data||[]) as CommentRow[]);
    setLoading(false);
  },[showToast]);
  useEffect(()=>{void load();},[load]);

  const visible=useMemo(()=>items.filter(c=>(filter==='all'||(filter==='hidden'?c.is_hidden:!c.is_hidden))&&(!search.trim()||[c.user,c.text,c.post_id].some(v=>String(v||'').toLowerCase().includes(search.trim().toLowerCase())))),[items,filter,search]);

  const moderate=async(comment:CommentRow,hidden:boolean)=>{
    setBusy(comment.id);
    const {error}=await supabase.from('comments').update({is_hidden:hidden,moderated_at:new Date().toISOString(),moderated_by:(await supabase.auth.getUser()).data.user?.email||'moderator'}).eq('id',comment.id);
    if(error) showToast('Moderation failed: '+error.message);
    else {showToast(hidden?'Comment hidden from public view.':'Comment restored to public view.');await load();}
    setBusy(null);
  };
  const remove=async(comment:CommentRow)=>{
    if(!window.confirm('Permanently delete this comment?'))return;
    setBusy(comment.id);
    const {error}=await supabase.from('comments').delete().eq('id',comment.id);
    if(error)showToast('Delete failed: '+error.message);
    else{showToast('Comment deleted.');await load();}
    setBusy(null);
  };
  const btn:React.CSSProperties={border:`1px solid ${border}`,background:'transparent',color:text,borderRadius:7,padding:'7px 10px',fontSize:12,cursor:'pointer'};
  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:14}}><div><div style={{fontSize:18,fontWeight:800,color:text}}>💬 Comment Moderation</div><div style={{fontSize:12,color:muted,marginTop:4}}>Review article comments, hide inappropriate or spam content, and restore comments when appropriate.</div></div><button style={btn} onClick={()=>void load()}>↻ Refresh</button></div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>{(['all','visible','hidden'] as const).map(k=><button key={k} style={{...btn,background:filter===k?G.green:'transparent',color:filter===k?'#fff':text,borderColor:filter===k?G.green:border}} onClick={()=>setFilter(k)}>{k==='all'?'All':k==='visible'?'Visible':'Hidden'} ({k==='all'?items.length:items.filter(c=>k==='hidden'?c.is_hidden:!c.is_hidden).length})</button>)}</div>
    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search comment, reader or article ID…" style={{width:'100%',boxSizing:'border-box',padding:10,borderRadius:8,border:`1px solid ${border}`,background:card,color:text,marginBottom:12}}/>
    {loading?<div style={{padding:24,textAlign:'center',color:muted}}>Loading comments…</div>:visible.length===0?<div style={{padding:28,textAlign:'center',color:muted}}>No comments in this view.</div>:visible.map(c=><div key={c.id} style={{padding:13,marginBottom:8,border:`1px solid ${c.is_hidden?G.gold:border}`,borderRadius:9,background:card}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><strong style={{color:text,fontSize:13}}>{c.user}</strong><span style={{fontSize:10,color:c.is_hidden?G.gold:G.green,fontWeight:800}}>{c.is_hidden?'HIDDEN':'PUBLIC'}</span></div>
      <div style={{fontSize:13,color:text,margin:'8px 0',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{c.text}</div>
      <div style={{fontSize:10,color:muted,marginBottom:9}}>Article ID: {c.post_id} · {c.created_at?new Date(c.created_at).toLocaleString('en-NG'):'Date unavailable'}</div>
      <div style={{display:'flex',gap:7,flexWrap:'wrap'}}><button disabled={busy===c.id} style={btn} onClick={()=>void moderate(c,!c.is_hidden)}>{c.is_hidden?'Restore comment':'Hide comment'}</button><button disabled={busy===c.id} style={{...btn,color:G.red,borderColor:G.red}} onClick={()=>void remove(c)}>Delete permanently</button></div>
    </div>)}
    <div style={{fontSize:11,color:muted,marginTop:10}}>Public visitors can only read comments marked visible. Moderation actions require an administrator or moderator account.</div>
  </div>;
}
