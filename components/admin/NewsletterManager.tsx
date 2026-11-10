'use client';

import { useCallback,useEffect,useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import { useToast } from '../ToastProvider';

type Campaign={id:string;name:string;subject:string;content:string;status:string;created_at:string;updated_at:string};
const cell=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"';

export default function NewsletterManager(){
 const {card,border,text,muted}=useTheme();const {showToast}=useToast();
 const [items,setItems]=useState<Campaign[]>([]);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);
 const [subscribers,setSubscribers]=useState(0);const [selected,setSelected]=useState<string|null>(null);
 const [name,setName]=useState('');const [subject,setSubject]=useState('');const [content,setContent]=useState('');
 const load=useCallback(async()=>{
  setLoading(true);
  const [campaigns,audience]=await Promise.all([
   supabase.from('newsletter_campaigns').select('*').order('updated_at',{ascending:false}).limit(100),
   supabase.from('subscribers').select('*',{count:'exact',head:true})
  ]);
  if(campaigns.error)showToast('Could not load newsletter drafts: '+campaigns.error.message);else setItems((campaigns.data||[]) as Campaign[]);
  if(!audience.error)setSubscribers(audience.count||0);
  setLoading(false);
 },[showToast]);
 useEffect(()=>{void load();},[load]);
 const reset=()=>{setSelected(null);setName('');setSubject('');setContent('');};
 const save=async(status:'draft'|'ready'='draft')=>{
  if(!name.trim()||!subject.trim()||!content.trim()){showToast('Enter campaign name, subject and message content.');return;}
  setSaving(true);const user=(await supabase.auth.getUser()).data.user;
  const payload={name:name.trim(),subject:subject.trim(),content:content.trim(),status,created_by:user?.email||null,updated_at:new Date().toISOString()};
  const result=selected?await supabase.from('newsletter_campaigns').update(payload).eq('id',selected):await supabase.from('newsletter_campaigns').insert(payload);
  if(result.error)showToast('Save failed: '+result.error.message);else{showToast(status==='ready'?'Campaign marked ready for delivery integration.':'Newsletter draft saved.');reset();await load();}
  setSaving(false);
 };
 const edit=(c:Campaign)=>{setSelected(c.id);setName(c.name);setSubject(c.subject);setContent(c.content);};
 const remove=async(id:string)=>{if(!window.confirm('Delete this newsletter draft?'))return;const {error}=await supabase.from('newsletter_campaigns').delete().eq('id',id);if(error)showToast('Delete failed: '+error.message);else{showToast('Draft deleted.');await load();if(selected===id)reset();}};
 const exportAudience=async()=>{
  const {data,error}=await supabase.from('subscribers').select('email,subscribed_at').order('subscribed_at',{ascending:false}).limit(10000);
  if(error){showToast('Could not export subscribers: '+error.message);return;}
  const csv=[['Email','Subscribed at'],...(data||[]).map(r=>[r.email,r.subscribed_at])].map(r=>r.map(cell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='naijatoday-newsletter-subscribers.csv';a.click();URL.revokeObjectURL(url);
 };
 const input:React.CSSProperties={width:'100%',boxSizing:'border-box',padding:10,border:`1px solid ${border}`,borderRadius:8,background:card,color:text,fontSize:13};
 const btn:React.CSSProperties={border:`1px solid ${border}`,borderRadius:8,padding:'8px 12px',background:'transparent',color:text,fontSize:12,cursor:'pointer'};
 return <div>
  <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:14}}><div><div style={{fontSize:18,fontWeight:800,color:text}}>✉️ Newsletter Studio</div><div style={{fontSize:12,color:muted,marginTop:4}}>Prepare newsletter campaigns and manage your subscriber audience.</div></div><button style={btn} onClick={()=>void load()}>↻ Refresh</button></div>
  <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}><div style={{background:card,border:`1px solid ${border}`,borderRadius:9,padding:13,flex:1,minWidth:150}}><div style={{fontSize:11,color:muted}}>SUBSCRIBERS</div><div style={{fontSize:24,fontWeight:800,color:text}}>{subscribers.toLocaleString()}</div></div><div style={{background:card,border:`1px solid ${border}`,borderRadius:9,padding:13,flex:1,minWidth:150}}><div style={{fontSize:11,color:muted}}>CAMPAIGN DRAFTS</div><div style={{fontSize:24,fontWeight:800,color:text}}>{items.length}</div></div><button style={{...btn,alignSelf:'stretch'}} onClick={()=>void exportAudience()}>↓ Export subscriber list</button></div>
  <div style={{background:card,border:`1px solid ${border}`,borderRadius:10,padding:14,marginBottom:16}}>
   <div style={{fontWeight:800,color:text,marginBottom:10}}>{selected?'Edit newsletter campaign':'Create newsletter campaign'}</div>
   <input style={{...input,marginBottom:8}} placeholder="Campaign name" value={name} onChange={e=>setName(e.target.value)}/>
   <input style={{...input,marginBottom:8}} placeholder="Email subject line" value={subject} onChange={e=>setSubject(e.target.value)}/>
   <textarea style={{...input,minHeight:150,resize:'vertical',fontFamily:'inherit'}} placeholder="Write the newsletter content…" value={content} onChange={e=>setContent(e.target.value)}/>
   <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}><button disabled={saving} style={{...btn,background:G.green,color:'#fff',borderColor:G.green}} onClick={()=>void save('draft')}>{saving?'Saving…':'Save draft'}</button><button disabled={saving} style={btn} onClick={()=>void save('ready')}>Mark ready</button>{selected&&<button style={btn} onClick={reset}>Cancel edit</button>}</div>
  </div>
  <div style={{fontWeight:800,color:text,marginBottom:8}}>Saved campaigns</div>
  {loading?<div style={{padding:20,color:muted}}>Loading campaigns…</div>:items.length===0?<div style={{padding:20,color:muted}}>No campaigns created yet.</div>:items.map(c=><div key={c.id} style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap',borderBottom:`1px solid ${border}`,padding:'11px 0'}}><div style={{minWidth:200,flex:1}}><div style={{fontWeight:700,color:text,fontSize:13}}>{c.name}</div><div style={{fontSize:11,color:muted}}>{c.subject} · {c.status.toUpperCase()} · {new Date(c.updated_at).toLocaleDateString('en-NG')}</div></div><div style={{display:'flex',gap:6}}><button style={btn} onClick={()=>edit(c)}>Edit</button><button style={{...btn,color:G.red,borderColor:G.red}} onClick={()=>void remove(c.id)}>Delete</button></div></div>)}
  <div style={{fontSize:11,color:muted,marginTop:12}}>Campaign saving and subscriber export are active. Email delivery is not enabled yet; a verified email provider and sending credentials must be connected before campaigns can be sent.</div>
 </div>;
}
