import { createClient } from '@supabase/supabase-js';

export const config = { schedule: '0 */2 * * *' };

const ALLOWED = ['channelstv.com','premiumtimesng.com','punchng.com','guardian.ng','vanguardngr.com','thenationonlineng.net','thisdaylive.com','dailytrust.com','thecable.ng','businessday.ng','arise.tv','bbc.com','reuters.com'];
const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = 'kujopatu@gmail.com';

async function recordAutomationEvent(db: any, action: string, detail: string, notify = false) {
  try {
    const { error } = await db.from('admin_activity_log').insert({
      action, detail: detail.slice(0, 2000), admin_email: 'system@naijatoday',
    });
    if (error) console.error('Could not write AI Newsroom activity log:', error.message);
  } catch (error) {
    console.error('AI Newsroom activity log failed:', error);
  }
  if (notify) {
    try {
      const message = 'NaijaToday AI Newsroom needs attention';
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recent } = await db.from('notifications').select('id')
        .eq('recipient_email', ADMIN_EMAIL).eq('type', 'system').eq('message', message)
        .gte('created_at', since).limit(1);
      if (!recent?.length) {
        const { error } = await db.from('notifications').insert({
          recipient_email: ADMIN_EMAIL, type: 'system', message,
          preview: detail.slice(0, 500), read: false, post_id: null,
        });
        if (error) console.error('Could not create AI Newsroom failure notification:', error.message);
      }
    } catch (error) {
      console.error('AI Newsroom failure notification failed:', error);
    }
  }
}

function approved(url: string) {
  try { const u = new URL(url); return u.protocol === 'https:' && ALLOWED.some(d => u.hostname === d || u.hostname.endsWith('.' + d)); }
  catch { return false; }
}
function approvedVideo(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'youtube.com' || u.hostname.endsWith('.youtube.com') || u.hostname === 'youtu.be' || u.hostname.endsWith('.youtu.be'));
  } catch { return false; }
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
function safeFeedImage(value: string) {
  const decoded = decode(value).trim();
  try {
    const u = new URL(decoded);
    if (u.protocol !== 'https:' || u.username || u.password || !u.hostname || u.hostname === 'localhost') return '';
    return u.toString();
  } catch { return ''; }
}
function feedImage(block: string) {
  const candidates: string[] = [attr(block, 'media:thumbnail', 'url'), attr(block, 'itunes:image', 'href')];
  for (const match of block.matchAll(/<(enclosure|media:content)\b([^>]*)>/gi)) {
    const attrs = match[2] || '';
    const url = attrs.match(/\burl=["']([^"']+)["']/i)?.[1] || '';
    const type = attrs.match(/\btype=["']([^"']+)["']/i)?.[1] || '';
    const medium = attrs.match(/\bmedium=["']([^"']+)["']/i)?.[1] || '';
    if (type.startsWith('image/') || medium.toLowerCase() === 'image' || /\.(?:jpe?g|png|webp|gif)(?:[?#]|$)/i.test(url)) candidates.push(url);
  }
  candidates.push(block.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1] || '');
  for (const candidate of candidates) {
    const safe = safeFeedImage(candidate);
    if (safe) return safe;
  }
  return '';
}
function parse(xml: string) {
  return [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].slice(0,12).map(m => {
    const b=m[2]; const title=textTag(b,'title');
    const link=textTag(b,'link') || attr(b,'link','href') || textTag(b,'guid') || textTag(b,'id');
    const summary=(textTag(b,'description') || textTag(b,'summary') || textTag(b,'content:encoded')).slice(0,3000);
    const date=textTag(b,'pubDate') || textTag(b,'published') || textTag(b,'updated');
    const image=feedImage(b);
    const mediaTag=b.match(/<media:content\b[^>]*>/i)?.[0] || '';
    const video=/video/i.test(mediaTag)?attr(b,'media:content','url'):'';
    return {title,link,summary,date,image,video};
  }).filter(x=>x.title && approved(x.link));
}
function cleanHtml(value: string) {
  return value.replace(/<(script|style|iframe|object|embed|form|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi,'')
    .replace(/<(?!\/?(?:p|h2|h3|h4|ul|ol|li|strong|b|em|i|blockquote)\b)[^>]*>/gi,'')
    .replace(/<(p|h2|h3|h4|ul|ol|li|strong|b|em|i|blockquote)\b[^>]*>/gi,'<$1>');
}
async function callGeminiWithFallback(key: string, model: string, requestBody: unknown) {
  const fallback = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
  const models = [...new Set([model, fallback])];
  let lastError = 'Gemini is temporarily unavailable.';
  for (const candidate of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(60000),
        });
        if (response.ok) return await response.json();
        const detail = await response.text();
        lastError = `Gemini model ${candidate} returned HTTP ${response.status}: ${detail.slice(0, 350)}`;
        if (![429, 500, 502, 503, 504].includes(response.status)) throw new Error(lastError);
      } catch (error) {
        if (error instanceof Error && !error.message.includes('fetch failed') && !error.name.includes('Timeout')) throw error;
        lastError = error instanceof Error ? error.message : String(error);
      }
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 1200));
    }
  }
  throw new Error(lastError + ' Please retry in a few minutes; the fallback model was also unavailable.');
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
  const data=await callGeminiWithFallback(key,model,{
    systemInstruction:{parts:[{text:'Act as a cautious Nigerian newsroom editor. Accuracy and attribution come before length.'}]},
    contents:[{role:'user',parts:[{text:prompt}]}],
    generationConfig:{temperature:0.3,responseMimeType:'application/json'},
  });
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
  let discovered=0, drafted=0, failed=0, feedsChecked=0;
  for(const source of sources||[]) {
    if(!approved(source.feed_url)) continue;
    feedsChecked++;
    try {
      const response=await fetch(source.feed_url,{headers:{'User-Agent':'NaijaTodayNewsroom/1.0',Accept:'application/rss+xml, application/atom+xml, application/xml, text/xml'},redirect:'error',signal:AbortSignal.timeout(12000)});
      if(!response.ok) throw new Error('Feed HTTP '+response.status);
      const xml=await response.text(); if(xml.length>2000000) throw new Error('Feed too large');
      for(const entry of parse(xml)) {
        const publishedAt=entry.date && !Number.isNaN(Date.parse(entry.date))?new Date(entry.date).toISOString():null;
        const {data:item,error:insertError}=await db.from('ai_newsroom_items').insert({
          source_id:source.id,source_name:source.name,source_url:new URL(entry.link).toString(),
          source_title:entry.title,source_summary:entry.summary||null,source_published_at:publishedAt,
          source_image_url:entry.image||null,source_video_url:entry.video && (approved(entry.video) || approvedVideo(entry.video)) ? entry.video : null,status:'discovered',
        }).select('id').maybeSingle();
        if(insertError) { if(insertError.code!=='23505') { failed++; console.error('Feed item insert failed',insertError.message); } }
        else if(item) discovered++;
      }
      await recordAutomationEvent(db,'ai_newsroom_feed_checked',`${source.name}: checked successfully; feed parsed and new stories recorded.`);
    } catch(error) { failed++; console.error('Feed fetch failed for',source.name,error); await recordAutomationEvent(db,'ai_newsroom_feed_failed',`${source.name}: ${error instanceof Error ? error.message : String(error)}`); }
  }

  if(process.env.GEMINI_API_KEY) {
    const {data:queue,error:queueError}=await db.from('ai_newsroom_items').select('*').eq('status','discovered').order('created_at',{ascending:true}).limit(5);
    if(queueError) { failed++; console.error('Could not load draft queue',queueError.message); await recordAutomationEvent(db,'ai_newsroom_queue_failed',queueError.message,true); }
    for(const item of queue||[]) {
      try {
        const generated=await generate(item);
        const {error:updateError}=await db.from('ai_newsroom_items').update(generated).eq('id',item.id).eq('status','discovered');
        if(updateError) throw updateError;
        drafted++;
      } catch(error) {
        failed++;
        const message = error instanceof Error ? error.message.slice(0, 1000) : 'AI draft generation failed.';
        console.error('AI draft generation failed for',item.source_title,message);
        const { error: statusError } = await db.from('ai_newsroom_items').update({
          status: 'generation_failed', generation_error: message, updated_at: new Date().toISOString(),
        }).eq('id',item.id).eq('status','discovered');
        if (statusError) console.error('Could not mark failed AI draft:',statusError.message);
        await recordAutomationEvent(db,'ai_newsroom_draft_failed',`${item.source_title}: ${message}`);
      }
    }
  }
  const detail = `Checked ${feedsChecked} feeds; discovered ${discovered} new stories; generated ${drafted} drafts; ${failed} errors.${!process.env.GEMINI_API_KEY ? ' Automatic drafting skipped because GEMINI_API_KEY is not configured.' : ''}`;
  console.log('AI Newsroom cycle complete:',detail);
  await recordAutomationEvent(db,'ai_newsroom_cycle',detail,failed > 0);
  return new Response(JSON.stringify({discovered,drafted,failed,feedsChecked}),{headers:{'Content-Type':'application/json'}});
}
