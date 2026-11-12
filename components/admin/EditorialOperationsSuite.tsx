'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';

type Article = {
  id: string; title: string; category: string; author: string | null;
  workflow_status: string; published: boolean | null; assigned_to: string | null;
  due_at: string | null; scheduled_at: string | null; published_at: string | null;
  created_at: string | null; submitted_at: string | null; reviewed_at?: string | null;
  views?: number | null; comments?: number | null; upvotes?: number | null;
};
type EventRow = { id: string; post_id: string; actor_email: string | null; action: string; notes: string | null; created_at: string };

const dateValue = (value: string | null) => value ? new Date(value).getTime() : 0;
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set';
const csvCell = (value: unknown) => '"' + String(value ?? '').replace(/"/g, '""') + '"';

export default function EditorialOperationsSuite({ posts }: { posts: Article[] }) {
  const { card, border, text, muted } = useTheme();
  const [period, setPeriod] = useState('90');
  const [category, setCategory] = useState('all');
  const [writer, setWriter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsError, setEventsError] = useState('');
  const [eventsLoading, setEventsLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    const { data, error } = await supabase.from('article_workflow_events')
      .select('id,post_id,actor_email,action,notes,created_at')
      .order('created_at', { ascending: false }).limit(150);
    if (error) setEventsError('Workflow history is unavailable: ' + error.message);
    else { setEvents(data || []); setEventsError(''); }
    setEventsLoading(false);
  }, []);
  useEffect(() => { void loadEvents(); }, [loadEvents]);

  const categories = useMemo(() => [...new Set(posts.map(p => p.category || 'Uncategorised'))].sort(), [posts]);
  const writers = useMemo(() => [...new Set(posts.map(p => p.author || 'NaijaToday Desk'))].sort(), [posts]);
  const filtered = useMemo(() => {
    const now = new Date();
    const cutoff = period === 'all' ? 0 : period === 'custom' ? 0 : now.getTime() - Number(period) * 86400000;
    const start = fromDate ? new Date(fromDate + 'T00:00:00').getTime() : cutoff;
    const end = toDate ? new Date(toDate + 'T23:59:59').getTime() : Number.POSITIVE_INFINITY;
    return posts.filter(p => {
      if (p.published !== true) return false;
      const stamp = dateValue(p.published_at || p.created_at);
      return stamp >= start && stamp <= end
        && (category === 'all' || (p.category || 'Uncategorised') === category)
        && (writer === 'all' || (p.author || 'NaijaToday Desk') === writer);
    });
  }, [posts, period, category, writer, fromDate, toDate]);

  const report = useMemo(() => {
    const views = filtered.reduce((n,p) => n + Number(p.views || 0), 0);
    const interactions = filtered.reduce((n,p) => n + Number(p.comments || 0) + Number(p.upvotes || 0), 0);
    const categoryMap = new Map<string,{articles:number;views:number}>();
    filtered.forEach(p => { const k=p.category || 'Uncategorised'; const v=categoryMap.get(k)||{articles:0,views:0}; v.articles++; v.views+=Number(p.views||0); categoryMap.set(k,v); });
    const writerMap = new Map<string,{articles:number;views:number;interactions:number}>();
    filtered.forEach(p => { const k=p.author||'NaijaToday Desk'; const v=writerMap.get(k)||{articles:0,views:0,interactions:0}; v.articles++; v.views+=Number(p.views||0); v.interactions+=Number(p.comments||0)+Number(p.upvotes||0); writerMap.set(k,v); });
    return { views, interactions, categories:[...categoryMap.entries()].map(([name,v])=>({name,...v})).sort((a,b)=>b.views-a.views), writers:[...writerMap.entries()].map(([name,v])=>({name,...v})).sort((a,b)=>b.views-a.views), top:[...filtered].sort((a,b)=>Number(b.views||0)-Number(a.views||0)).slice(0,10) };
  }, [filtered]);

  const openArticles = posts.filter(p => p.published !== true);
  const now = Date.now();
  const overdue = openArticles.filter(p => p.due_at && dateValue(p.due_at) < now && !['approved','rejected'].includes((p.workflow_status||'').toLowerCase()));
  const awaiting = openArticles.filter(p => ['submitted','in_review','review','pending','awaiting_review'].includes((p.workflow_status||'').toLowerCase()));
  const scheduled = posts.filter(p => p.published !== true && p.scheduled_at).sort((a,b)=>dateValue(a.scheduled_at)-dateValue(b.scheduled_at));
  const dueSoon = openArticles.filter(p => p.due_at && dateValue(p.due_at) >= now && dateValue(p.due_at) <= now + 7*86400000);
  const reviewDurations = posts.filter(p=>p.submitted_at&&p.reviewed_at).map(p=>(dateValue(p.reviewed_at)-dateValue(p.submitted_at))/3600000).filter(n=>n>=0);
  const avgReviewHours = reviewDurations.length ? reviewDurations.reduce((a,b)=>a+b,0)/reviewDurations.length : null;

  const scorecards = useMemo(() => {
    const map = new Map<string,{total:number;published:number;views:number;overdue:number;recent:number}>();
    posts.forEach(p => {
      const name=p.author||'NaijaToday Desk'; const v=map.get(name)||{total:0,published:0,views:0,overdue:0,recent:0};
      v.total++; if(p.published===true){v.published++;v.views+=Number(p.views||0);}
      if(p.published!==true&&p.due_at&&dateValue(p.due_at)<Date.now())v.overdue++;
      const d=dateValue(p.published_at||p.created_at); if(d>=Date.now()-30*86400000)v.recent++;
      map.set(name,v);
    });
    return [...map.entries()].map(([name,v])=>({name,...v})).sort((a,b)=>b.views-a.views);
  },[posts]);

  const calendarItems = useMemo(() => posts.flatMap(p => {
    const items = [];
    if (p.scheduled_at && dateValue(p.scheduled_at) >= now - 86400000 && dateValue(p.scheduled_at) <= now + 30*86400000) items.push({kind:'Scheduled publication',date:p.scheduled_at,title:p.title,person:p.author||p.assigned_to||'Unassigned'});
    if (p.due_at && p.published!==true && dateValue(p.due_at) >= now - 86400000 && dateValue(p.due_at) <= now + 30*86400000) items.push({kind:'Editorial deadline',date:p.due_at,title:p.title,person:p.assigned_to||p.author||'Unassigned'});
    return items;
  }).sort((a,b)=>dateValue(a.date)-dateValue(b.date)),[posts,now]);

  const alerts = [
    ...overdue.map(p=>({tone:'#dc2626',title:'Overdue assignment',detail:p.title+' · '+(p.assigned_to||'Unassigned'),date:p.due_at})),
    ...awaiting.map(p=>({tone:'#d97706',title:'Awaiting editorial review',detail:p.title+' · '+(p.author||'NaijaToday Desk'),date:p.submitted_at})),
    ...dueSoon.map(p=>({tone:'#6478d3',title:'Deadline within 7 days',detail:p.title+' · '+(p.assigned_to||'Unassigned'),date:p.due_at})),
  ].slice(0,12);

  const exportCsv = () => {
    const rows = [
      ['Title','Category','Writer','Published date','Views','Comments','Upvotes'],
      ...filtered.map(p=>[p.title,p.category,p.author||'NaijaToday Desk',p.published_at||p.created_at,p.views||0,p.comments||0,p.upvotes||0]),
    ];
    const csv=rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob); const link=document.createElement('a');
    link.href=url;link.download='naijatoday-editorial-report.csv';link.click();URL.revokeObjectURL(url);
  };

  const panel: React.CSSProperties={background:card,border:'1px solid '+border,borderRadius:12,padding:16,marginBottom:14};
  const button: React.CSSProperties={border:'1px solid '+border,borderRadius:8,padding:'8px 11px',background:'transparent',color:text,cursor:'pointer',fontSize:12,fontWeight:700};
  const input: React.CSSProperties={border:'1px solid '+border,borderRadius:8,padding:'8px 10px',background:card,color:text,fontSize:12,minWidth:130};
  const th: React.CSSProperties={padding:'9px 8px',textAlign:'left',borderBottom:'1px solid '+border,color:muted,fontSize:11};

  return <div>
    <section style={panel}>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <div><h3 style={{margin:0,color:text,fontSize:15}}>🔎 Advanced analytics & report export</h3><p style={{margin:'5px 0 12px',color:muted,fontSize:11}}>Filter published articles by period, category and writer. Views are cumulative counters.</p></div>
        <div style={{display:'flex',gap:7,flexWrap:'wrap'}}><button style={button} onClick={exportCsv}>⬇ Export CSV</button><button style={button} onClick={()=>window.print()}>Print / Save PDF</button></div>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
        <select aria-label="Analytics period" value={period} onChange={e=>setPeriod(e.target.value)} style={input}><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="180">Last 6 months</option><option value="365">Last 12 months</option><option value="all">All dates</option><option value="custom">Custom dates</option></select>
        <select aria-label="Filter category" value={category} onChange={e=>setCategory(e.target.value)} style={input}><option value="all">All categories</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <select aria-label="Filter writer" value={writer} onChange={e=>setWriter(e.target.value)} style={input}><option value="all">All writers</option>{writers.map(w=><option key={w} value={w}>{w}</option>)}</select>
        {period==='custom'&&<><input aria-label="Start date" type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} style={input}/><input aria-label="End date" type="date" value={toDate} onChange={e=>setToDate(e.target.value)} style={input}/></>}
        <button style={button} onClick={()=>{setPeriod('90');setCategory('all');setWriter('all');setFromDate('');setToDate('');}}>Reset filters</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:9,marginBottom:14}}>
        {[['Articles',filtered.length],['Views',report.views.toLocaleString('en-NG')],['Interactions',report.interactions.toLocaleString('en-NG')],['Categories',report.categories.length]].map(([label,value])=><div key={String(label)} style={{border:'1px solid '+border,borderRadius:9,padding:11}}><strong style={{display:'block',fontSize:21,color:G.green}}>{value}</strong><span style={{fontSize:11,color:muted}}>{label}</span></div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14}}>
        <div><strong style={{fontSize:12,color:text}}>Category results</strong>{report.categories.map(c=><div key={c.name} style={{display:'flex',justifyContent:'space-between',gap:8,padding:'7px 0',borderBottom:'1px solid '+border,fontSize:11,color:text}}><span>{c.name} · {c.articles} articles</span><b>{c.views.toLocaleString()} views</b></div>)}</div>
        <div><strong style={{fontSize:12,color:text}}>Writer results</strong>{report.writers.map(w=><div key={w.name} style={{display:'flex',justifyContent:'space-between',gap:8,padding:'7px 0',borderBottom:'1px solid '+border,fontSize:11,color:text}}><span>{w.name} · {w.articles} articles</span><b>{w.views.toLocaleString()} views</b></div>)}</div>
      </div>
      <div style={{marginTop:14}}><strong style={{fontSize:12,color:text}}>Top stories in this filtered report</strong>{report.top.map((p,i)=><div key={p.id} style={{display:'flex',justifyContent:'space-between',gap:10,padding:'7px 0',borderBottom:'1px solid '+border,fontSize:11,color:text}}><span>{i+1}. {p.title}</span><b>{Number(p.views||0).toLocaleString()} views</b></div>)}</div>
    </section>

    <section style={panel}>
      <h3 style={{margin:'0 0 5px',color:text,fontSize:15}}>🚦 Deadline & SLA monitor</h3>
      <p style={{margin:'0 0 12px',color:muted,fontSize:11}}>Uses assignment due dates and recorded submission/review timestamps.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:9}}>
        {[['Overdue assignments',overdue.length,'#dc2626'],['Awaiting review',awaiting.length,'#d97706'],['Due in 7 days',dueSoon.length,'#6478d3'],['Avg. review time',avgReviewHours===null?'—':avgReviewHours.toFixed(1)+' hrs',G.green]].map(([label,value,color])=><div key={String(label)} style={{border:'1px solid '+border,borderRadius:9,padding:11}}><strong style={{display:'block',fontSize:21,color:String(color)}}>{value}</strong><span style={{fontSize:11,color:muted}}>{label}</span></div>)}
      </div>
      {[...overdue,...dueSoon].slice(0,8).map(p=><div key={p.id} style={{padding:'8px 0',borderBottom:'1px solid '+border,color:text,fontSize:11}}><b>{p.title}</b><span style={{color:muted}}> · {p.assigned_to||'Unassigned'} · Due {dateLabel(p.due_at)}</span></div>)}
    </section>

    <section style={panel}>
      <h3 style={{margin:'0 0 5px',color:text,fontSize:15}}>🗓️ Editorial calendar · Next 30 days</h3>
      <p style={{margin:'0 0 10px',color:muted,fontSize:11}}>Scheduled publication dates and assignment deadlines.</p>
      {calendarItems.length===0?<p style={{color:muted,fontSize:12}}>No scheduled publications or due dates in the next 30 days.</p>:calendarItems.map((item,i)=><div key={item.title+item.kind+i} style={{display:'grid',gridTemplateColumns:'145px 1fr',gap:10,padding:'9px 0',borderBottom:'1px solid '+border,fontSize:11}}><span style={{color:G.green,fontWeight:700}}>{dateLabel(item.date)}</span><span style={{color:text}}><b>{item.kind}:</b> {item.title}<span style={{color:muted}}> · {item.person}</span></span></div>)}
    </section>

    <section style={panel}>
      <h3 style={{margin:'0 0 5px',color:text,fontSize:15}}>🏅 Writer scorecards</h3>
      <p style={{margin:'0 0 10px',color:muted,fontSize:11}}>Publishing output, cumulative article views, recent output and overdue workload. These are activity indicators, not a quality rating.</p>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:560,fontSize:11}}><thead><tr>{['Writer','Published','Views','Last 30 days','Overdue'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{scorecards.map(w=><tr key={w.name} style={{color:text}}><td style={{padding:9,borderBottom:'1px solid '+border,fontWeight:700}}>{w.name}</td><td style={{padding:9,borderBottom:'1px solid '+border}}>{w.published}</td><td style={{padding:9,borderBottom:'1px solid '+border}}>{w.views.toLocaleString()}</td><td style={{padding:9,borderBottom:'1px solid '+border}}>{w.recent}</td><td style={{padding:9,borderBottom:'1px solid '+border,color:w.overdue?'#dc2626':text}}>{w.overdue}</td></tr>)}</tbody></table></div>
    </section>

    <section style={panel}>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap'}}><h3 style={{margin:0,color:text,fontSize:15}}>🔔 Editorial attention inbox</h3><span style={{fontSize:10,color:muted}}>In-dashboard alerts</span></div>
      <p style={{margin:'5px 0 10px',color:muted,fontSize:11}}>Highlights deadlines and review work that may need attention. These are dashboard alerts, not email or push notifications.</p>
      {alerts.length===0?<p style={{color:muted,fontSize:12}}>No overdue deadlines or pending review alerts at this time.</p>:alerts.map((a,i)=><div key={a.title+a.detail+i} style={{borderLeft:'3px solid '+a.tone,padding:'8px 10px',margin:'7px 0',background:a.tone+'0d'}}><b style={{fontSize:11,color:a.tone}}>{a.title}</b><div style={{fontSize:11,color:text,marginTop:3}}>{a.detail}</div><div style={{fontSize:10,color:muted,marginTop:2}}>{dateLabel(a.date)}</div></div>)}
    </section>

    <section style={panel}>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:8}}><h3 style={{margin:0,color:text,fontSize:15}}>📜 Editorial activity & accountability</h3><button onClick={()=>void loadEvents()} style={button}>↻ Refresh history</button></div>
      <p style={{margin:'0 0 10px',color:muted,fontSize:11}}>Latest recorded assignment, submission, review and workflow actions.</p>
      {eventsError&&<p role="alert" style={{color:'#dc2626',fontSize:11}}>{eventsError}</p>}
      {eventsLoading?<p style={{color:muted,fontSize:12}}>Loading workflow history…</p>:events.length===0?<p style={{color:muted,fontSize:12}}>No workflow events have been recorded yet.</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:620,fontSize:11}}><thead><tr>{['Date','Article','Action','By','Notes'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{events.map(ev=><tr key={ev.id} style={{color:text}}><td style={{padding:8,borderBottom:'1px solid '+border,whiteSpace:'nowrap'}}>{dateLabel(ev.created_at)}</td><td style={{padding:8,borderBottom:'1px solid '+border}}>{posts.find(p=>p.id===ev.post_id)?.title||'Article record'}</td><td style={{padding:8,borderBottom:'1px solid '+border}}>{ev.action.replace(/_/g,' ')}</td><td style={{padding:8,borderBottom:'1px solid '+border}}>{ev.actor_email||'System / unknown'}</td><td style={{padding:8,borderBottom:'1px solid '+border}}>{ev.notes||'—'}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
