'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import { useToast } from '../ToastProvider';

type Source = { id: string; name: string; feed_url: string; domain: string; is_active: boolean };
type Story = {
  id: string; source_name: string; source_url: string; source_title: string;
  source_summary: string | null; source_published_at: string | null;
  source_image_url: string | null; source_video_url: string | null; status: string;
  generated_title: string | null; generated_excerpt: string | null;
  generated_content: string | null; generated_category: string | null;
  generated_seo_title: string | null; generated_seo_description: string | null;
  generated_tags: string[] | null; post_id: string | null;
  generation_error?: string | null; generation_started_at?: string | null; generation_attempts?: number; generation_retry_count?: number;
};
type Draft = { title: string; excerpt: string; content: string; category: string; image: string; video: string; scheduledAt: string };
const CLOUDINARY_CLOUD = 'dywtb9ky3';
const CLOUDINARY_PRESET = 'naijatorday_upload';
const FEED_PRESETS = [
  { name: 'PUNCH Latest News', url: 'https://rss.punchng.com/v1/category/latest_news' },
  { name: 'Premium Times', url: 'https://www.premiumtimesng.com/feed' },
  { name: 'Channels Television', url: 'https://www.channelstv.com/feed/' },
  { name: 'The Guardian Nigeria', url: 'https://guardian.ng/feed/' },
  { name: 'Vanguard Nigeria', url: 'https://www.vanguardngr.com/feed/' },
];

export default function AINewsroomStudio() {
  const { card, border, text, muted } = useTheme();
  const { showToast } = useToast();
  const [sources, setSources] = useState<Source[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [articleFormat, setArticleFormat] = useState<'news' | 'article'>('news');
  const [sourceName, setSourceName] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [activeStory, setActiveStory] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ title: '', excerpt: '', content: '', category: 'Nigeria', image: '', video: '', scheduledAt: '' });
  const [uploading, setUploading] = useState(false);

  const api = useCallback(async (payload?: Record<string, unknown>, method: 'GET' | 'POST' = 'GET') => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Your admin session has expired. Sign in again.');
    const response = await fetch('/api/admin/ai-newsroom', {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      body: payload ? JSON.stringify(payload) : undefined,
      cache: 'no-store',
    });
    const raw = await response.text();
    let result: any;
    try { result = raw ? JSON.parse(raw) : {}; } catch { result = {}; }
    if (!response.ok) throw new Error(result.error || (raw ? raw.slice(0, 220) : 'AI Newsroom request failed.'));
    return result;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api();
      setSources(result.sources || []);
      setStories(result.items || []);
      setProviderConfigured(!!result.providerConfigured);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not load AI Newsroom.');
    } finally { setLoading(false); }
  }, [api, showToast]);

  useEffect(() => { void load(); }, [load]);

  const action = async (id: string, payload: Record<string, unknown>, success: string) => {
    setBusy(id);
    try { await api(payload, 'POST'); showToast(success); await load(); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Action failed.'); }
    finally { setBusy(null); }
  };

  const addSource = async () => {
    if (!sourceName.trim() || !feedUrl.trim()) { showToast('Enter a source name and RSS/Atom feed URL.'); return; }
    setBusy('source');
    try {
      await api({ action: 'add_source', name: sourceName.trim(), feed_url: feedUrl.trim() }, 'POST');
      setSourceName(''); setFeedUrl(''); showToast('News source added.'); await load();
    } catch (error) { showToast(error instanceof Error ? error.message : 'Could not add source.'); }
    finally { setBusy(null); }
  };

  const fetchFeed = async (source: Source) => {
    setBusy(source.id);
    try {
      const result = await api({ action: 'fetch_feed', source_id: source.id }, 'POST');
      showToast(`Feed checked: ${result.found} stories found; ${result.added} new item(s) queued.`);
      await load();
    } catch (error) { showToast(error instanceof Error ? error.message : 'Feed check failed.'); }
    finally { setBusy(null); }
  };

  const generate = async (story: Story) => {
    setBusy(story.id);
    try {
      if (articleFormat === 'article') {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error('Your admin session has expired. Sign in again.');
        const response = await fetch('/.netlify/functions/generate-ai-article-background', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: story.id }),
        });
        if (!response.ok && response.status !== 202) {
          const message = await response.text();
          throw new Error(message.slice(0, 220) || 'Could not start background article generation.');
        }
        showToast('Full article generation started. This may take a few minutes; you can wait here while NaijaToday checks its progress.');
        // Background functions return 202 immediately and continue processing.
        // Poll the newsroom record rather than keeping a long browser request open.
        for (let check = 0; check < 150; check++) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          const newsroom = await api();
          setSources(newsroom.sources || []);
          setStories(newsroom.items || []);
          const updated = (newsroom.items || []).find((item: Story) => item.id === story.id) as Story | undefined;
          if (updated?.status === 'generated' && updated.generated_content) {
            const words = updated.generated_content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
            if (words < 1600) throw new Error(`The background generator saved only ${words} words. The full-article minimum is 1,600; please retry or add more verified source material.`);
            setDraft({
              title: updated.generated_title || '', excerpt: updated.generated_excerpt || '',
              content: updated.generated_content, category: updated.generated_category || 'Nigeria',
              image: '', video: story.source_video_url || '', scheduledAt: '',
            });
            setActiveStory(story.id);
            showToast('Full article generated. Review and edit it before saving.');
            return;
          }
          if (updated?.status === 'generation_failed') {
            throw new Error(updated.generation_error || 'Background article generation failed. Please retry.');
          }
        }
        throw new Error('Article generation is taking longer than expected. Refresh the newsroom shortly to check its status.');
      }

      const result = await api({ action: 'generate', item_id: story.id, format: 'news' }, 'POST');
      setDraft({
        title: result.generated.title, excerpt: result.generated.excerpt,
        content: result.generated.content, category: result.generated.category,
        image: '', video: story.source_video_url || '', scheduledAt: '',
      });
      setActiveStory(story.id);
      showToast('AI news brief generated. Review and edit it before saving.');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Article generation failed.');
      await load();
    } finally { setBusy(null); }
  };

  const openDraft = (story: Story) => {
    setActiveStory(story.id);
    setDraft({
      title: story.generated_title || '', excerpt: story.generated_excerpt || '',
      content: story.generated_content || '', category: story.generated_category || 'Nigeria',
      image: '', video: story.source_video_url || '', scheduledAt: '',
    });
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
      showToast('Choose an image file smaller than 8 MB.'); return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', CLOUDINARY_PRESET);
      form.append('folder', 'naijatorday/articles');
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'Cloudinary upload failed.');
      setDraft(d => ({ ...d, image: result.secure_url }));
      showToast('Editorial image uploaded to Cloudinary.');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Image upload failed.'); }
    finally { setUploading(false); }
  };

  const saveDraft = async (story: Story) => {
    if (!draft.title.trim() || !draft.excerpt.trim() || !draft.content.trim()) { showToast('Complete the headline, summary and article content first.'); return; }
    if (draft.scheduledAt && new Date(draft.scheduledAt).getTime() <= Date.now()) { showToast('Choose a future date and time, or leave scheduling blank.'); return; }
    setBusy(story.id);
    try {
      const result = await api({
        action: 'save_draft', item_id: story.id, image_url: draft.image,
        video_url: draft.video, scheduled_at: draft.scheduledAt || null, format: articleFormat,
        title: draft.title, excerpt: draft.excerpt, content: draft.content, category: draft.category,
      }, 'POST');
      showToast(result.status === 'scheduled' ? 'Article scheduled. The publishing service will post it at the selected time.' : 'Article saved as an unpublished draft.');
      setActiveStory(null); await load();
    } catch (error) { showToast(error instanceof Error ? error.message : 'Could not save article.'); }
    finally { setBusy(null); }
  };

  const dismiss = (story: Story) => {
    if (window.confirm('Remove this story from the AI Newsroom queue?')) void action(story.id, { action: 'dismiss', item_id: story.id }, 'Story dismissed.');
  };

  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 10, border: `1px solid ${border}`, borderRadius: 8, background: card, color: text, fontSize: 13 };
  const button: React.CSSProperties = { border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px', background: 'transparent', color: text, fontSize: 12, cursor: 'pointer' };
  const label: React.CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: '.06em', color: muted, marginBottom: 5, display: 'block' };

  return <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
      <div><div style={{ fontSize: 18, fontWeight: 800, color: text }}>🤖 AI Newsroom & Auto-Drafting</div><div style={{ fontSize: 12, color: muted, marginTop: 4 }}>Collect source headlines, generate original drafts, add approved media and schedule publication.</div></div>
      <button style={button} onClick={() => void load()}>↻ Refresh</button>
    </div>
    <div style={{ padding: 12, border: `1px solid ${providerConfigured ? G.green : G.gold}`, borderRadius: 9, marginBottom: 16, background: providerConfigured ? G.green + '10' : G.gold + '12' }}>
      <div style={{ fontWeight: 800, color: text, fontSize: 13 }}>{providerConfigured ? '✓ Gemini API detected' : 'Gemini API key not detected'}</div>
      <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>{providerConfigured ? 'The server can reach the configured provider. A live generation test is performed when you generate your first story.' : 'Add GEMINI_API_KEY to Netlify environment variables, then redeploy.'}</div>
    </div>

    <div style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
      <div style={{ fontWeight: 800, color: text, marginBottom: 4 }}>1. Trusted news feeds</div>
      <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>Add an RSS or Atom feed from an approved publisher. The system only accepts HTTPS feeds from its source-domain allowlist.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 8 }}>
        <input style={input} value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="Publisher name"/>
        <input style={input} value={feedUrl} onChange={e => setFeedUrl(e.target.value)} placeholder="https://publisher.com/rss.xml"/>
        <button disabled={busy === 'source'} style={{ ...button, background: G.green, borderColor: G.green, color: '#fff' }} onClick={() => void addSource()}>{busy === 'source' ? 'Adding…' : '+ Add feed'}</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, marginBottom: 8 }}>
        {FEED_PRESETS.map(preset => <button key={preset.name} style={button} onClick={() => { setSourceName(preset.name); setFeedUrl(preset.url); }}>{preset.name}</button>)}
      </div>
      <div style={{ marginTop: 12 }}>
        {sources.length === 0 ? <div style={{ fontSize: 12, color: muted }}>No feeds configured yet. Add the RSS feed addresses your editorial team wants to monitor.</div> : sources.map(source => <div key={source.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: `1px solid ${border}`, padding: '10px 0' }}>
          <div style={{ minWidth: 180, flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: text }}>{source.name}</div><div style={{ fontSize: 10, color: muted, overflowWrap: 'anywhere' }}>{source.feed_url}</div></div>
          <button disabled={busy === source.id} style={{ ...button, background: G.green, color: '#fff', borderColor: G.green }} onClick={() => void fetchFeed(source)}>{busy === source.id ? 'Checking…' : '↓ Fetch latest stories'}</button>
        </div>)}
      </div>
    </div>

    <div style={{ fontWeight: 800, color: text, marginBottom: 8 }}>2. Story discovery & generation</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: 11, border: `1px solid ${border}`, borderRadius: 9 }}>
      <div style={{ flex: 1, minWidth: 190 }}><div style={{ fontSize: 12, fontWeight: 800, color: text }}>Generation format</div><div style={{ fontSize: 10, color: muted, marginTop: 3 }}>Choose a short news report or a full article.</div></div>
      <select value={articleFormat} onChange={e => setArticleFormat(e.target.value === 'article' ? 'article' : 'news')} style={{ ...input, width: 'auto', minWidth: 190 }}><option value="news">News brief (350–600 words)</option><option value="article">Full article (minimum 1,600 words)</option></select>
    </div>
    {loading ? <div style={{ padding: 24, color: muted, textAlign: 'center' }}>Loading newsroom queue…</div> : stories.length === 0 ? <div style={{ padding: 24, border: `1px dashed ${border}`, borderRadius: 9, color: muted, fontSize: 12, textAlign: 'center' }}>No stories yet. Add a feed above and fetch its latest stories.</div> : stories.map(story => <div key={story.id} style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 13, marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 220, flex: 1 }}>
          <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>{story.source_name} · {story.source_published_at ? new Date(story.source_published_at).toLocaleString('en-NG') : 'Date not supplied'}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: text }}>{story.source_title}</div>
          {story.source_summary && <div style={{ fontSize: 11, color: muted, marginTop: 5 }}>{story.source_summary.slice(0, 260)}{story.source_summary.length > 260 ? '…' : ''}</div>}
          {story.status === 'generation_failed' && story.generation_error && <div style={{ fontSize: 11, color: G.red, marginTop: 7 }}>Generation failed: {story.generation_error}</div>}
          {story.status === 'generating' && <div style={{ fontSize: 11, color: G.gold, marginTop: 7 }}>Generation in progress{typeof story.generation_retry_count === 'number' && story.generation_retry_count > 0 ? ` · ${story.generation_retry_count} provider retry(s)` : ''}{story.generation_error ? `: ${story.generation_error}` : ' · Waiting for the AI provider.'}</div>}
          <a href={story.source_url} target="_blank" rel="noreferrer" style={{ color: G.green, fontSize: 11, display: 'inline-block', marginTop: 6 }}>Open original source ↗</a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <span style={{ color: story.status === 'scheduled' || story.status === 'draft_saved' ? G.green : G.gold, fontSize: 10, fontWeight: 800 }}>{story.status.replace('_', ' ').toUpperCase()}</span>
          {story.source_image_url?.startsWith('https://') && <span style={{ fontSize: 10, color: muted }}>Image suggestion available</span>}
          {story.source_video_url?.startsWith('https://') && <a href={story.source_video_url} target="_blank" rel="noreferrer" style={{ color: G.green, fontSize: 10 }}>Related video ↗</a>}
        </div>
      </div>
      {story.source_image_url?.startsWith('https://') && <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}><img src={story.source_image_url} alt="Source feed image suggestion" style={{ width: 104, height: 68, objectFit: 'cover', borderRadius: 7, border: `1px solid ${border}` }}/><span style={{ fontSize: 10, color: muted }}>Preview only — use only if you have permission. Upload approved images to Cloudinary in the editor.</span></div>}
      {story.status !== 'draft_saved' && story.status !== 'scheduled' && story.status !== 'published' && <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
        {story.generated_title && (articleFormat !== 'article' || (story.generated_content || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length >= 1600) ? <button style={{ ...button, background: G.green, color: '#fff', borderColor: G.green }} onClick={() => openDraft(story)}>Review generated article</button> : <button disabled={!providerConfigured || busy === story.id || story.status === 'generating'} style={{ ...button, background: G.green, color: '#fff', borderColor: G.green, opacity: !providerConfigured ? .5 : 1 }} onClick={() => void generate(story)}>{busy === story.id || story.status === 'generating' ? 'Generating…' : articleFormat === 'article' ? '✨ Generate full article' : story.status === 'generation_failed' ? '↻ Retry news brief' : '✨ Generate article with Gemini'}</button>}
        <button disabled={busy === story.id} style={{ ...button, color: G.red, borderColor: G.red }} onClick={() => dismiss(story)}>Dismiss</button>
      </div>}
      {activeStory === story.id && <div style={{ borderTop: `1px solid ${border}`, marginTop: 12, paddingTop: 12 }}>
        <div style={{ fontWeight: 800, color: text, marginBottom: 10 }}>3. Editorial review & publication</div>
        <label style={label}>HEADLINE</label><input style={{ ...input, marginBottom: 9 }} value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}/>
        <label style={label}>SUMMARY / EXCERPT</label><textarea style={{ ...input, minHeight: 65, marginBottom: 9, resize: 'vertical' }} value={draft.excerpt} onChange={e => setDraft(d => ({ ...d, excerpt: e.target.value }))}/>
        <label style={label}>ARTICLE BODY (HTML)</label><div style={{ fontSize: 10, color: muted, marginBottom: 5 }}>Approx. {draft.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length.toLocaleString()} words {articleFormat === 'article' ? '· Minimum required: 1,600' : '· News brief format'}</div><textarea style={{ ...input, minHeight: 300, marginBottom: 9, resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }} value={draft.content} onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}/>
        <label style={label}>CATEGORY</label><input style={{ ...input, marginBottom: 9 }} value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 9 }}>
          <div><label style={label}>EDITORIAL IMAGE (CLOUDINARY)</label><input type="file" accept="image/*" disabled={uploading} style={{ ...input, fontSize: 11 }} onChange={e => void uploadImage(e.target.files?.[0])}/><div style={{ fontSize: 10, color: muted, marginTop: 4 }}>{uploading ? 'Uploading…' : draft.image ? '✓ Cloudinary image attached' : 'Upload a licensed image; article images remain on Cloudinary.'}</div></div>
          <div><label style={label}>RELATED VIDEO URL (OPTIONAL)</label><input style={input} value={draft.video} onChange={e => setDraft(d => ({ ...d, video: e.target.value }))} placeholder="YouTube or approved publisher video URL"/><div style={{ fontSize: 10, color: muted, marginTop: 4 }}>A link to the related video is added to the article.</div></div>
        </div>
        <div style={{ marginTop: 10 }}><label style={label}>SCHEDULE PUBLICATION (OPTIONAL)</label><input type="datetime-local" style={{ ...input, maxWidth: 320 }} value={draft.scheduledAt} onChange={e => setDraft(d => ({ ...d, scheduledAt: e.target.value }))}/><div style={{ fontSize: 10, color: muted, marginTop: 4 }}>Leave blank to save as an unpublished draft. Scheduled stories are published by the existing five-minute publishing service.</div></div>
        {story.source_image_url && <div style={{ fontSize: 10, color: muted, marginTop: 10 }}>A source image was found in the feed. Check its usage rights before using it; upload an authorised image to Cloudinary rather than copying the publisher's image URL.</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button disabled={busy === story.id || uploading} style={{ ...button, background: G.green, borderColor: G.green, color: '#fff' }} onClick={() => void saveDraft(story)}>{busy === story.id ? 'Saving…' : draft.scheduledAt ? '✓ Review & schedule' : '✓ Save as draft'}</button>
          <button style={button} onClick={() => setActiveStory(null)}>Close editor</button>
        </div>
      </div>}
    </div>)}
    <div style={{ fontSize: 10, color: muted, marginTop: 12 }}>Editorial safeguards: AI output is a draft, not a verified report. Confirm facts with the original source and independent reporting before scheduling. Source articles are not copied; images must be licensed or otherwise authorised. AI text generation does not include free image or video generation.</div>
  </div>;
}
