'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { postPath } from '@/lib/posts';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';

const CLOUD = 'dywtb9ky3';
const PRESET = 'naijatorday_upload';
const EMOJI = ['😀', '😂', '🔥', '👏', '🙏', '❤️', '😮', '😢', '🇳🇬', '⚽', '💰', '📢', '✅', '❗', '⭐', '🎉', '📰', '🎤', '🏆', '🚨'];

const AI_PHRASES = ["in today's fast-paced world", "in today's digital age", "it's important to note", 'it is important to note', 'furthermore', 'moreover', 'in conclusion', 'when it comes to', 'navigate the complexities', 'in the realm of', 'a testament to', 'plays a crucial role', 'delve into', 'unlock the power', 'game-changer', 'in summary', 'needless to say', 'it is worth noting', 'at the end of the day', 'in the ever-evolving', 'underscores the importance', 'cannot be overstated', 'shed light on', 'in this article, we'];
const NG_PLACES = ['lagos', 'abuja', 'kano', 'ibadan', 'port harcourt', 'benin city', 'kaduna', 'enugu', 'abeokuta', 'onitsha', 'warri', 'calabar', 'uyo', 'owerri', 'jos', 'ilorin', 'abia', 'adamawa', 'akwa ibom', 'anambra', 'bauchi', 'bayelsa', 'benue', 'borno', 'cross river', 'delta', 'ebonyi', 'edo', 'ekiti', 'gombe', 'imo', 'jigawa', 'katsina', 'kebbi', 'kogi', 'kwara', 'nasarawa', 'ogun', 'ondo', 'osun', 'oyo', 'plateau', 'rivers', 'sokoto', 'taraba', 'yobe', 'zamfara', 'ikeja', 'surulere', 'lekki', 'yaba', 'apapa'];
const ATTRIB = ['according to', 'said', 'reported', 'confirmed', 'disclosed', 'stated', 'told newsmen', 'in a statement'];

const BLOCKS: Record<string, string> = {
  pullquote: `<blockquote style="border-left:5px solid #008751;margin:24px 0;padding:16px 24px;background:rgba(0,135,81,0.07);border-radius:0 10px 10px 0;font-size:20px;font-style:italic;line-height:1.6;">“Your compelling quote goes here.”<footer style="font-size:13px;font-style:normal;margin-top:8px;opacity:.7;">— Name, Title</footer></blockquote><p><br></p>`,
  factbox: `<div style="border:2px solid #F4A800;border-radius:10px;padding:16px 20px;margin:20px 0;background:rgba(244,168,0,0.07);"><div style="font-size:13px;font-weight:800;color:#F4A800;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">📌 Fast Facts</div><ul style="margin:0;padding-left:20px;"><li>Fact one</li><li>Fact two</li><li>Fact three</li></ul></div><p><br></p>`,
  takeaways: `<div style="border:2px solid #008751;border-radius:10px;padding:16px 20px;margin:20px 0;background:rgba(0,135,81,0.07);"><div style="font-size:13px;font-weight:800;color:#008751;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">✅ Key Takeaways</div><ul style="margin:0;padding-left:20px;"><li>Takeaway one</li><li>Takeaway two</li><li>Takeaway three</li></ul></div><p><br></p>`,
  caption: `<figure style="margin:20px 0;text-align:center;"><img src="https://via.placeholder.com/800x400?text=Your+Image" alt="Caption" style="max-width:100%;border-radius:8px;" /><figcaption style="font-size:12px;opacity:.7;margin-top:6px;font-style:italic;">Photo caption — credit</figcaption></figure><p><br></p>`,
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function compressImage(file: File, maxW = 1600): Promise<Blob> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return resolve(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => { URL.revokeObjectURL(url); resolve(b && b.size < file.size ? b : file); }, 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function uploadToCloudinary(file: Blob, type: 'image' | 'video', onProgress: (n: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', PRESET);
    fd.append('folder', 'naijatorday_articles');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD}/${type}/upload`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText).secure_url); } catch { reject(new Error('Bad response')); }
      } else reject(new Error('Upload failed'));
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(fd);
  });
}

type Modal = null | 'image' | 'video' | 'table' | 'find' | 'link' | 'check';

function Modal({ title, children, onOk, okLabel, onClose, D, border, text, muted }: { title: string; children: React.ReactNode; onOk?: () => void; okLabel?: string; onClose: () => void; D: boolean; border: string; text: string; muted: string }) {
  return (
    <div onMouseDown={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ background: D ? '#181c25' : '#fff', border: `1px solid ${border}`, borderRadius: 14, padding: 22, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', color: text }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>{title}</div>
        {children}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          {onOk && <button type="button" onClick={onOk} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, cursor: 'pointer' }}>{okLabel || 'Insert'}</button>}
          <button type="button" onClick={onClose} style={{ background: 'none', color: muted, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 16px', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const { darkMode: D, border, text, muted } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<string | null>(null);
  const saved = useRef<Range | null>(null);
  const [source, setSource] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [counts, setCounts] = useState({ words: 0, chars: 0 });
  const [target, setTarget] = useState(800);
  const [keyword, setKeyword] = useState('');
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [emoji, setEmoji] = useState(false);
  const [selImg, setSelImg] = useState<HTMLImageElement | null>(null);
  // image / video modal state
  const [mediaUrl, setMediaUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [size, setSize] = useState('100');
  const [align, setAlign] = useState<'center' | 'left' | 'right'>('center');
  const [upload, setUpload] = useState<{ busy: boolean; pct: number; err: string }>({ busy: false, pct: 0, err: '' });
  const [tbl, setTbl] = useState({ rows: 3, cols: 3 });
  const [artQuery, setArtQuery] = useState('');
  const [arts, setArts] = useState<{ id: string; title: string; category: string }[]>([]);
  const [draftAvail, setDraftAvail] = useState(false);

  const updateCounts = useCallback(() => {
    const t = ref.current?.innerText || '';
    setCounts({ words: t.trim().split(/\s+/).filter(Boolean).length, chars: t.length });
  }, []);

  const sync = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    last.current = html;
    onChange(html);
    updateCounts();
  }, [onChange, updateCounts]);

  // Load external value (first load, or an article's content arriving later).
  useEffect(() => {
    if (!ref.current || source) return;
    if (last.current === null || (value !== last.current && value !== ref.current.innerHTML)) {
      ref.current.innerHTML = value || '';
      last.current = value || '';
      updateCounts();
    }
  }, [value, source, updateCounts]);

  // Local draft safety net (browser only).
  useEffect(() => {
    try { setDraftAvail(!!localStorage.getItem('naija_rte_draft') && !value); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!value || value.length < 30) return;
    const t = setTimeout(() => { try { localStorage.setItem('naija_rte_draft', value); } catch { /* ignore */ } }, 1500);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    if (!selImg) return;
    const off = (e: MouseEvent) => { if (e.target !== selImg && !(e.target as HTMLElement).closest?.('[data-img-tools]')) { selImg.style.outline = ''; setSelImg(null); } };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [selImg]);

  const exec = (cmd: string, val?: string) => { ref.current?.focus(); document.execCommand(cmd, false, val); sync(); };
  const insertHTML = (html: string) => { ref.current?.focus(); document.execCommand('insertHTML', false, html); sync(); };
  const saveCursor = () => { const s = window.getSelection(); if (s && s.rangeCount && ref.current?.contains(s.anchorNode)) saved.current = s.getRangeAt(0).cloneRange(); };
  const restoreCursor = () => {
    ref.current?.focus();
    const s = window.getSelection();
    if (!s) return;
    if (saved.current) { s.removeAllRanges(); s.addRange(saved.current); }
    else if (ref.current) { const r = document.createRange(); r.selectNodeContents(ref.current); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
  };
  const open = (m: Modal) => {
    saveCursor();
    setMediaUrl(''); setAlt(''); setSize('100'); setAlign('center'); setUpload({ busy: false, pct: 0, err: '' });
    setModal(m);
    if (m === 'link') searchArticles('');
  };

  const onPaste = (e: React.ClipboardEvent) => {
    // Paste as clean HTML: strip Word / Google Docs junk.
    const html = e.clipboardData.getData('text/html');
    if (!html) return;
    e.preventDefault();
    const clean = html
      .replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?(?:meta|link|style|script|xml|o:p)[^>]*>/gi, '')
      .replace(/ (?:class|id|lang)="[^"]*"/gi, '').replace(/style="[^"]*"/gi, '')
      .replace(/<\/?span[^>]*>/gi, '').replace(/&nbsp;/g, ' ');
    insertHTML(clean);
  };

  const doUpload = async (file: File | undefined, type: 'image' | 'video') => {
    if (!file) return;
    setUpload({ busy: true, pct: 0, err: type === 'video' && file.size > 100 * 1024 * 1024 ? `Large video (${(file.size / 1048576).toFixed(0)}MB) — this may take a while.` : '' });
    try {
      const blob = type === 'image' ? await compressImage(file) : file;
      const url = await uploadToCloudinary(blob, type, (pct) => setUpload((u) => ({ ...u, pct })));
      setMediaUrl(url);
      setUpload({ busy: false, pct: 0, err: '' });
    } catch {
      setUpload({ busy: false, pct: 0, err: 'Upload failed. Check the Cloudinary preset allows unsigned uploads.' });
    }
  };

  const confirmImage = () => {
    if (!mediaUrl) return;
    const a = align === 'center' ? 'margin:16px auto;display:block;' : align === 'left' ? 'margin:8px 16px 8px 0;float:left;' : 'margin:8px 0 8px 16px;float:right;';
    restoreCursor();
    insertHTML(`<figure style="margin:16px 0;text-align:${align};"><img src="${esc(mediaUrl)}" alt="${esc(alt || 'Article image')}" style="width:${size}%;height:auto;border-radius:8px;${a}" /></figure><p style="clear:both"><br></p>`);
    setModal(null);
  };

  const confirmVideo = () => {
    const url = mediaUrl.trim();
    if (!url) return;
    restoreCursor();
    const wrap = align === 'center' ? 'margin:16px auto;' : align === 'left' ? 'margin:8px 16px 8px 0;float:left;' : 'margin:8px 0 8px 16px;float:right;';
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    const frame = (src: string, title: string) => `<figure style="margin:16px 0;text-align:${align};clear:both;"><div style="display:inline-block;width:${size}%;${wrap}"><div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;"><iframe src="${esc(src)}" title="${title}" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:10px;"></iframe></div></div></figure><p style="clear:both"><br></p>`;
    if (yt) insertHTML(frame(`https://www.youtube.com/embed/${yt[1]}`, 'YouTube video'));
    else if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || (url.includes('res.cloudinary.com') && url.includes('/video/')))
      insertHTML(`<figure style="margin:16px 0;text-align:${align};clear:both;"><video controls style="width:${size}%;border-radius:10px;${wrap}"><source src="${esc(url)}" /></video></figure><p style="clear:both"><br></p>`);
    else insertHTML(frame(url, 'Embedded video'));
    setModal(null);
  };

  const confirmTable = () => {
    const cell = 'border:1px solid #ccc;padding:8px 12px;min-width:80px;';
    const head = 'border:1px solid #ccc;padding:8px 12px;background:#008751;color:#fff;font-weight:700;min-width:80px;';
    let h = `<table style="border:1px solid #ccc;border-collapse:collapse;width:100%;margin:12px 0;"><thead><tr>`;
    for (let c = 0; c < tbl.cols; c++) h += `<th style="${head}">Header ${c + 1}</th>`;
    h += '</tr></thead><tbody>';
    for (let r = 0; r < tbl.rows - 1; r++) { h += '<tr>'; for (let c = 0; c < tbl.cols; c++) h += `<td style="${cell}">Cell</td>`; h += '</tr>'; }
    restoreCursor();
    insertHTML(h + '</tbody></table><p><br></p>');
    setModal(null);
  };

  const currentTable = (): HTMLTableElement | null => {
    const s = window.getSelection();
    let n: Node | null = s?.rangeCount ? s.getRangeAt(0).commonAncestorContainer : null;
    while (n && n !== ref.current) { if (n.nodeName === 'TABLE') return n as HTMLTableElement; n = n.parentNode; }
    return null;
  };
  const tableOp = (op: 'addRow' | 'addCol' | 'delRow' | 'delCol') => {
    const t = currentTable();
    if (!t) { alert('Click inside a table cell first.'); return; }
    const cell = 'border:1px solid #ccc;padding:8px 12px;min-width:80px;';
    if (op === 'addRow') { const r = t.insertRow(-1); for (let i = 0; i < (t.rows[0]?.cells.length || 2); i++) { const c = r.insertCell(i); c.style.cssText = cell; c.textContent = 'Cell'; } }
    if (op === 'addCol') Array.from(t.rows).forEach((r, i) => { const c = r.insertCell(-1); c.style.cssText = cell; c.innerHTML = i === 0 ? '<strong>Header</strong>' : 'Cell'; });
    if (op === 'delRow' && t.rows.length > 1) t.deleteRow(-1);
    if (op === 'delCol') Array.from(t.rows).forEach((r) => { if (r.cells.length > 1) r.deleteCell(-1); });
    sync();
  };

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchArticles = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      let query = supabase.from('posts').select('id,title,category').eq('published', true).order('created_at', { ascending: false }).limit(8);
      if (q.trim()) query = query.ilike('title', `%${q.trim()}%`);
      const { data } = await query;
      setArts((data ?? []) as never);
    }, 300);
  };
  const insertArticleLink = (a: { id: string; title: string; category: string }) => {
    restoreCursor();
    const path = postPath(a as never);
    const s = window.getSelection();
    if (s && !s.isCollapsed) exec('createLink', path);
    else insertHTML(`<a href="${path}" style="color:#008751;font-weight:600;text-decoration:underline;">${esc(a.title)}</a>`);
    setModal(null);
  };

  const doFind = (all: boolean) => {
    if (!ref.current || !find) return;
    const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), all ? 'gi' : 'i');
    // Only touch text, never tag attributes: split on tags.
    ref.current.innerHTML = ref.current.innerHTML.split(/(<[^>]+>)/).map((p) => (p.startsWith('<') ? p : p.replace(re, replace))).join('');
    sync();
  };

  const kw = (() => {
    if (!keyword.trim()) return null;
    const words = (ref.current?.innerText || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    const k = keyword.toLowerCase().trim();
    const n = words.filter((w) => w.includes(k)).length;
    return { n, pct: words.length ? ((n / words.length) * 100).toFixed(1) : '0' };
  })();

  const check = () => {
    const raw = ref.current?.innerText || '';
    const t = raw.toLowerCase();
    return {
      phrases: AI_PHRASES.filter((p) => t.includes(p)),
      naira: /₦|naira/i.test(raw), place: NG_PLACES.some((p) => t.includes(p)),
      numbers: /\d/.test(raw), attribution: ATTRIB.some((a) => t.includes(a)),
    };
  };

  const bg = D ? '#111520' : '#fff';
  const toolBg = D ? '#181c25' : '#f7f9fc';
  const btn: React.CSSProperties = { background: 'transparent', color: D ? '#a0aab8' : '#4a5568', border: 'none', borderRadius: 6, padding: '5px 9px', fontSize: 13, fontWeight: 600, cursor: 'pointer', lineHeight: 1, minWidth: 28 };
  const sep = <div style={{ width: 1, height: 22, background: border, margin: '0 4px' }} />;
  const T = (label: string, title: string, fn: () => void) => <button key={title} type="button" title={title} style={btn} onMouseDown={(e) => e.preventDefault()} onClick={fn}>{label}</button>;
  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${border}`, background: bg, color: text, fontSize: 14, marginBottom: 10, boxSizing: 'border-box' };
  const pill = (on: boolean): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 6, border: `1px solid ${on ? G.green : border}`, background: on ? 'rgba(0,135,81,.12)' : 'transparent', color: on ? G.green : muted, cursor: 'pointer', fontSize: 12, fontWeight: 600 });
  const pct = target ? Math.min(100, Math.round((counts.words / target) * 100)) : 0;

  const sizeAlign = (
    <>
      <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>Width</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>{['25', '50', '75', '100'].map((s) => <button type="button" key={s} style={pill(size === s)} onClick={() => setSize(s)}>{s}%</button>)}</div>
      <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>Align</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>{(['left', 'center', 'right'] as const).map((a) => <button type="button" key={a} style={pill(align === a)} onClick={() => setAlign(a)}>{a}</button>)}</div>
    </>
  );
  const uploadStatus = (upload.busy || upload.err) && (
    <div style={{ fontSize: 12, marginBottom: 10, color: upload.err ? G.red : muted }}>{upload.busy ? `Uploading… ${upload.pct}%` : upload.err}</div>
  );

  return (
    <div style={{ border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ background: toolBg, borderBottom: `1px solid ${border}`, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <select defaultValue="p" onChange={(e) => { exec('formatBlock', e.target.value); e.target.value = 'p'; }}
          style={{ background: toolBg, color: muted, border: `1px solid ${border}`, borderRadius: 6, padding: '4px 6px', fontSize: 12, marginRight: 4 }}>
          <option value="p">Paragraph</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="h4">Heading 4</option>
        </select>
        {T('B', 'Bold', () => exec('bold'))}{T('I', 'Italic', () => exec('italic'))}{T('U', 'Underline', () => exec('underline'))}{T('S', 'Strikethrough', () => exec('strikeThrough'))}
        {sep}
        {T('• List', 'Bullet list', () => exec('insertUnorderedList'))}{T('1. List', 'Numbered list', () => exec('insertOrderedList'))}{T('❝', 'Quote', () => exec('formatBlock', 'blockquote'))}
        {sep}
        {T('⬅', 'Align left', () => exec('justifyLeft'))}{T('⬌', 'Center', () => exec('justifyCenter'))}{T('➡', 'Align right', () => exec('justifyRight'))}
        {sep}
        {T('🔗', 'Link', () => { saveCursor(); const u = prompt('Enter URL (https://…):'); if (u) { restoreCursor(); exec('createLink', u); } })}
        {T('⛓️‍💥', 'Remove link', () => exec('unlink'))}
        {T('📰 Article', 'Link to another NaijaToday article', () => open('link'))}
        {sep}
        {T('🖼 Image', 'Insert image', () => open('image'))}{T('🎬 Video', 'Insert video', () => open('video'))}{T('▦ Table', 'Insert table', () => open('table'))}
        <div style={{ position: 'relative' }}>
          {T('😊', 'Emoji', () => { saveCursor(); setEmoji((v) => !v); })}
          {emoji && (
            <div style={{ position: 'absolute', top: 30, left: 0, zIndex: 50, background: D ? '#181c25' : '#fff', border: `1px solid ${border}`, borderRadius: 10, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2, width: 190 }}>
              {EMOJI.map((e) => <button type="button" key={e} style={{ ...btn, fontSize: 18 }} onMouseDown={(ev) => ev.preventDefault()} onClick={() => { restoreCursor(); insertHTML(e); setEmoji(false); }}>{e}</button>)}
            </div>
          )}
        </div>
        {sep}
        <select defaultValue="" onChange={(e) => { if (e.target.value) { restoreCursor(); insertHTML(BLOCKS[e.target.value]); e.target.value = ''; } }}
          onMouseDown={saveCursor} style={{ background: toolBg, color: muted, border: `1px solid ${border}`, borderRadius: 6, padding: '4px 6px', fontSize: 12 }}>
          <option value="">+ Block</option><option value="pullquote">Pull quote</option><option value="factbox">Fast facts</option><option value="takeaways">Key takeaways</option><option value="caption">Image + caption</option>
        </select>
        {sep}
        {T('🔍', 'Find & replace', () => open('find'))}{T('🧹', 'Clear formatting', () => exec('removeFormat'))}{T('🩺', 'Authenticity check', () => open('check'))}
        {T(source ? '✏️ Visual' : '</> HTML', 'Toggle HTML source', () => setSource((s) => !s))}
      </div>

      {(
        <div style={{ background: toolBg, borderBottom: `1px solid ${border}`, padding: '3px 10px', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', fontSize: 11, color: muted }}>
          Table: {T('+Row', 'Add row', () => tableOp('addRow'))}{T('+Col', 'Add column', () => tableOp('addCol'))}{T('−Row', 'Delete last row', () => tableOp('delRow'))}{T('−Col', 'Delete last column', () => tableOp('delCol'))}
          {selImg && (
            <span data-img-tools style={{ marginLeft: 12, display: 'inline-flex', gap: 2, alignItems: 'center' }}>
              Image size:
              {['25', '50', '75', '100'].map((s) => <button type="button" key={s} style={btn} onClick={() => { selImg.style.width = s + '%'; selImg.style.height = 'auto'; sync(); }}>{s}%</button>)}
              <button type="button" style={{ ...btn, color: G.red }} onClick={() => { (selImg.closest('figure') || selImg).remove(); setSelImg(null); sync(); }}>Delete</button>
            </span>
          )}
          {draftAvail && <button type="button" style={{ ...btn, marginLeft: 'auto', color: G.green }} onClick={() => { try { const d = localStorage.getItem('naija_rte_draft') || ''; if (ref.current) ref.current.innerHTML = d; sync(); setDraftAvail(false); } catch { /* ignore */ } }}>↩ Restore last draft</button>}
        </div>
      )}

      {source ? (
        <textarea value={value} onChange={(e) => { last.current = e.target.value; onChange(e.target.value); }} spellCheck={false}
          style={{ width: '100%', minHeight: 360, padding: 14, background: bg, color: text, border: 'none', outline: 'none', fontFamily: 'monospace', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
      ) : (
        <div ref={ref} contentEditable suppressContentEditableWarning onInput={sync} onBlur={sync} onPaste={onPaste}
          onClick={(e) => { const t = e.target as HTMLElement; if (selImg) selImg.style.outline = ''; if (t.tagName === 'IMG') { (t as HTMLImageElement).style.outline = `2px solid ${G.green}`; setSelImg(t as HTMLImageElement); } else setSelImg(null); }}
          style={{ minHeight: 360, maxHeight: 640, overflowY: 'auto', padding: 16, background: bg, color: text, fontSize: 16, lineHeight: 1.8, outline: 'none' }} />
      )}

      <div style={{ background: toolBg, borderTop: `1px solid ${border}`, padding: '6px 12px', fontSize: 11, color: muted, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <span>{counts.words} words · {counts.chars} chars</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Target <input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value) || 0)} style={{ width: 62, padding: '2px 4px', border: `1px solid ${border}`, borderRadius: 4, background: bg, color: text, fontSize: 11 }} />
          <span style={{ width: 70, height: 6, background: border, borderRadius: 3, overflow: 'hidden', display: 'inline-block' }}><span style={{ display: 'block', height: '100%', width: `${pct}%`, background: pct >= 100 ? G.green : G.gold }} /></span> {pct}%
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Keyword <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. naira" style={{ width: 90, padding: '2px 4px', border: `1px solid ${border}`, borderRadius: 4, background: bg, color: text, fontSize: 11 }} />
          {kw && <span>{kw.n}× · {kw.pct}% {Number(kw.pct) > 3 ? '⚠️ too high' : ''}</span>}
        </span>
      </div>

      {modal === 'image' && (
        <Modal onClose={() => setModal(null)} D={D} border={border} text={text} muted={muted} title="🖼 Insert image" onOk={confirmImage}>
          <input type="file" accept="image/*" onChange={(e) => doUpload(e.target.files?.[0], 'image')} style={{ ...inp, padding: 6 }} />
          {uploadStatus}
          <input style={inp} placeholder="…or paste image URL" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
          <input style={inp} placeholder="Alt text (describe the image)" value={alt} onChange={(e) => setAlt(e.target.value)} />
          {sizeAlign}
        </Modal>
      )}
      {modal === 'video' && (
        <Modal onClose={() => setModal(null)} D={D} border={border} text={text} muted={muted} title="🎬 Insert video" onOk={confirmVideo}>
          <input type="file" accept="video/*" onChange={(e) => doUpload(e.target.files?.[0], 'video')} style={{ ...inp, padding: 6 }} />
          {uploadStatus}
          <input style={inp} placeholder="…or paste YouTube / video URL" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
          {sizeAlign}
        </Modal>
      )}
      {modal === 'table' && (
        <Modal onClose={() => setModal(null)} D={D} border={border} text={text} muted={muted} title="▦ Insert table" onOk={confirmTable}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: muted }}>Rows<input type="number" min={2} max={20} value={tbl.rows} onChange={(e) => setTbl((t) => ({ ...t, rows: Math.max(2, Number(e.target.value) || 2) }))} style={{ ...inp, marginBottom: 0 }} /></label>
            <label style={{ fontSize: 12, color: muted }}>Columns<input type="number" min={1} max={8} value={tbl.cols} onChange={(e) => setTbl((t) => ({ ...t, cols: Math.max(1, Number(e.target.value) || 1) }))} style={{ ...inp, marginBottom: 0 }} /></label>
          </div>
        </Modal>
      )}
      {modal === 'find' && (
        <Modal onClose={() => setModal(null)} D={D} border={border} text={text} muted={muted} title="🔍 Find & replace">
          <input style={inp} placeholder="Find" value={find} onChange={(e) => setFind(e.target.value)} />
          <input style={inp} placeholder="Replace with" value={replace} onChange={(e) => setReplace(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button type="button" style={pill(false)} onClick={() => doFind(false)}>Replace first</button>
            <button type="button" style={pill(true)} onClick={() => doFind(true)}>Replace all</button>
          </div>
        </Modal>
      )}
      {modal === 'link' && (
        <Modal onClose={() => setModal(null)} D={D} border={border} text={text} muted={muted} title="📰 Link to an article">
          <input style={inp} placeholder="Search article titles…" value={artQuery} onChange={(e) => { setArtQuery(e.target.value); searchArticles(e.target.value); }} />
          <div style={{ fontSize: 11, color: muted, marginBottom: 8 }}>Select text first to turn it into the link, otherwise the article title is inserted.</div>
          {arts.map((a) => (
            <div key={a.id} onClick={() => insertArticleLink(a)} style={{ padding: '9px 10px', border: `1px solid ${border}`, borderRadius: 8, marginBottom: 6, cursor: 'pointer', fontSize: 13 }}>
              {a.title}<div style={{ fontSize: 11, color: muted }}>{a.category}</div>
            </div>
          ))}
        </Modal>
      )}
      {modal === 'check' && (() => {
        const c = check();
        const row = (ok: boolean, l: string) => <div style={{ fontSize: 13, marginBottom: 4 }}>{ok ? '✅' : '⚠️'} {l}</div>;
        return (
          <Modal onClose={() => setModal(null)} D={D} border={border} text={text} muted={muted} title="🩺 Authenticity check">
            <div style={{ fontSize: 12, color: muted, marginBottom: 10 }}>Checks whether the piece has real, local, specific substance.</div>
            {row(c.place, 'Mentions a Nigerian place')}{row(c.naira, 'Mentions Naira / ₦')}{row(c.numbers, 'Contains figures or dates')}{row(c.attribution, 'Attributes claims to a source')}
            <div style={{ fontSize: 13, margin: '10px 0 4px', fontWeight: 600 }}>Generic phrases found ({c.phrases.length})</div>
            {c.phrases.length === 0 ? <div style={{ fontSize: 13 }}>✅ None</div> : c.phrases.map((p) => <div key={p} style={{ fontSize: 13, color: G.red }}>• “{p}”</div>)}
          </Modal>
        );
      })()}
    </div>
  );
}
