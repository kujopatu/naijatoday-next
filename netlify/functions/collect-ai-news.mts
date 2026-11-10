import { createClient } from '@supabase/supabase-js';

export const config = { schedule: '0 */2 * * *' };

const ALLOWED = ['channelstv.com','premiumtimesng.com','punchng.com','guardian.ng','vanguardngr.com','thenationonlineng.net','thisdaylive.com','dailytrust.com','thecable.ng','businessday.ng','arise.tv','bbc.com','reuters.com'];
const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function approved(url: string) {
  try { const u = new URL(url); return u.protocol === 'https:' && ALLOWED.some(d => u.hostname === d || u.hostname.endsWith('.' + d)); }
  catch { return false; }
}
function decode(s: string) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
}
function textTag(xml: string, name: string) {
  const m = xml.match(new RegExp('<' + name.replace(':','\\:') + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name.replace(':','\\:') + '\\s*>','i'));
  return m?.[1] ? decode(m[1]).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim() : '';
}
function attr(xml: string, tag: string, name: string) {
  const m = xml.match(new RegExp('<' + tag.replace(':','\\:') + '\\b([^>]*)>','i'));
  return m?.[1]?.match(new RegExp(name + "=[\"']([^\"']+)[\"']", 'i'))?.[1] || '';
}
function parse(xml: string) {
  return [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].slice(0,12).map(m => {
    const b=m[2]; const title=textTag(b,'title');
    const link=textTag(b,'link') || attr(b,'link','href') || textTag(b,'guid') || textTag(b,'id');
    const summary=(textTag(b,'description') || textTag(b,'summary') || textTag(b,'content:encoded')).slice(0,3000);
    const date=textTag(b,'pubDate') || textTag(b,'published') || textTag(b,'updated');
    const image=attr(b,'enclosure','url') || attr(b,'media:thumbnail','url');
    return {title,link,summary,date,image};
  }).filter(x=>x.title && approved(x.link));
}
function cleanHtml(value: string) {
  return value.replace(/<(script|style|iframe|object|embed|form|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi,'')
    .replace(/<(?!\/?(?:p|h2|h3|h4|ul|ol|li|strong|b|em|i|blockquote)\b)[^>]*>/gi,'')
    .replace(/<(p|h2|h3|h4|ul|ol|li|strong|b|em|i|blockquote)\b[^>]*>/gi,'<$1>');
}
async function generate(item: Record<string, unknown>) {
  const key=process.env.GEMINI_API_KEY; if(!key) throw new Error('GEMINI_API_KEY is missing');
  const model=process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const prompt=`Write an original NaijaToday news draft using only these source details. Do not copy source wording, invent quotes, statistics or facts, or present allegations as proven. Attribute claims to the named publisher. Use Nigerian/British English. Return only JSON: title, excerpt, content_html, category, seo_title, seo_description, tags. content_html uses simple p/h2/h3/strong/em/ul/li tags. 180-450 words depending on available facts; shorter is better than invented context. SEO description under 160 characters.
Publisher: ${item.source_name}
Headline: ${item.source_title}
URL: ${item.source_url}
Date: ${item.source_published_at || 'Not supplied'}
Extract: ${String(item.source_summary || '').slice(0,3000)}`;
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
    body:JSON.stringify({systemInstruction:{parts:[{text:'Act as a cautious Nigerian newsroom editor. Accuracy and attribution come before length.'}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.3,responseMimeType:'application/json'}}),
    signal:AbortSignal.timeout(60000),
  });
  if(!response.ok) throw new Error('Gemini HTTP '+response.status);
  const data=await response.json();
  const raw=data?.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text||'').join('');
  if(!raw) throw new Error('Gemini returned no text');
  const parsed=JSON.parse(raw.replace(/^```(?:json)?|\```$/g,'').trim());
  if(!parsed.title || !parsed.excerpt || !parsed.content_html) throw new Error('Gemini response missing article fields');
  return {generated_title:String(parsed.title).slice(0,240),generated_excerpt:String(parsed.excerpt).slice(0,500),generated_content:cleanHtml(String(parsed.content_html)),generated_category:String(parsed.category||'Nigeria').slice(0,80),generated_seo_title:String(parsed.seo_title||parsed.title).slice(0,70),generated_seo_description:String(parsed.seo_description||parsed.excerpt).slice(0,160),generated_tags:Array.isArray(parsed.tags)?parsed.tags.map((x:unknown)=>String(x).slice(0,40)).slice(0,8):[],generated_at:new Date().toISOString(),status:'generated',updated_at:new Date().toISOString()};
}

export default async function collectAndDraftNews() {
  if(!dbUrl || !serviceKey) { console.error('AI newsroom collector missing Supabase server credentials'); return new Response('Not configured',{status:500}); }
  const db=createClient(dbUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:sources,error}=await db.from('ai_newsroom_sources').select('*').eq('is_active',true).limit(20);
  if(error) { console.error('Could not load AI newsroom feeds',error.message); return new Response('Source query failed',{status:500}); }
  let discovered=0, drafted=0, failed=0;
  for(const source of sources||[]) {
    if(!approved(source.feed_url)) continue;
    try {
      const response=await fetch(source.feed_url,{headers:{'User-Agent':'NaijaTodayNewsroom/1.0',Accept:'application/rss+xml, application/atom+xml, application/xml, text/xml'},redirect:'error',signal:AbortSignal.timeout(12000)});
      if(!response.ok) throw new Error('Feed HTTP '+response.status);
      const xml=await response.text(); if(xml.length>2000000) throw new Error('Feed too large');
      for(const entry of parse(xml)) {
        const publishedAt=entry.date && !Number.isNaN(Date.parse(entry.date))?new Date(entry.date).toISOString():null;
        const {data:item,error:insertError}=await db.from('ai_newsroom_items').insert({
          source_id:source.id,source_name:source.name,source_url:new URL(entry.link).toString(),
          source_title:entry.title,source_summary:entry.summary||null,source_published_at:publishedAt,
          source_image_url:entry.image||null,status:'discovered',
        }).select('id').maybeSingle();
        if(insertError) { if(insertError.code!=='23505') { failed++; console.error('Feed item insert failed',insertError.message); } }
        else if(item) discovered++;
      }
    } catch(error) { failed++; console.error('Feed fetch failed for',source.name,error); }
  }

  if(process.env.GEMINI_API_KEY) {
    const {data:queue,error:queueError}=await db.from('ai_newsroom_items').select('*').eq('status','discovered').order('created_at',{ascending:true}).limit(5);
    if(queueError) { console.error('Could not load draft queue',queueError.message); }
    for(const item of queue||[]) {
      try {
        const generated=await generate(item);
        const {error:updateError}=await db.from('ai_newsroom_items').update(generated).eq('id',item.id).eq('status','discovered');
        if(updateError) throw updateError;
        drafted++;
      } catch(error) { failed++; console.error('AI draft generation failed for',item.source_title,error); }
    }
  }
  console.log(`AI Newsroom cycle complete: ${discovered} new stories, ${drafted} drafts generated, ${failed} errors.`);
  return new Response(JSON.stringify({discovered,drafted,failed}),{headers:{'Content-Type':'application/json'}});
}
