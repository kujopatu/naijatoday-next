// Pre-cutover check: every URL on the OLD site's sitemap must also work on the NEW site.
// Usage:  node scripts/cutover-check.mjs https://naijatodayblog.com.ng https://naijatodayblog-next.netlify.app
const [OLD, NEW] = process.argv.slice(2).map((u) => (u || '').replace(/\/$/, ''));
if (!OLD || !NEW) { console.log('Usage: node scripts/cutover-check.mjs <old-site> <new-site>'); process.exit(1); }

const must = ['/', '/ads.txt', '/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/sw.js',
  '/og-image.jpg', '/icon-192.png', '/icon-512.png', '/about', '/privacy', '/terms', '/disclaimer', '/forum', '/admin'];

async function get(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'cutover-check' } });
    return { status: r.status, text: r.ok ? await r.text() : '', final: r.url };
  } catch (e) { return { status: 0, text: '', final: url, err: String(e.cause?.code || e.message) }; }
}
const title = (h) => (h.match(/<title[^>]*>([^<]*)/i)?.[1] || '').trim();

const sm = await get(OLD + '/sitemap.xml');
let paths = [];
if (sm.status === 200) {
  const locs = [...sm.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  paths = locs.map((l) => { try { return new URL(l).pathname; } catch { return null; } }).filter(Boolean);
} else console.log(`! Could not read ${OLD}/sitemap.xml (status ${sm.status}); checking the fixed list only.\n`);
paths = [...new Set([...must, ...paths])];
console.log(`Checking ${paths.length} URLs on ${NEW}\n`);

const bad = [], warn = [];
let i = 0;
async function worker() {
  while (i < paths.length) {
    const p = paths[i++];
    const n = await get(NEW + p);
    if (n.status !== 200) { bad.push(`${n.status || 'ERR ' + n.err}  ${p}`); continue; }
    if (/\.(html?)?$|\/[^.]*$/.test(p) && n.text.includes('<html')) {
      const o = await get(OLD + p);
      if (o.status === 200 && title(o.text) && title(o.text) !== title(n.text)) warn.push(`title differs  ${p}\n     old: ${title(o.text)}\n     new: ${title(n.text)}`);
    }
  }
}
await Promise.all(Array.from({ length: 5 }, worker));

console.log(bad.length ? `FAILED (${bad.length}):\n  ` + bad.join('\n  ') : 'All URLs return 200 on the new site.');
if (warn.length) console.log(`\nTitle differences (${warn.length}, review, often harmless):\n  ` + warn.slice(0, 40).join('\n  '));
process.exit(bad.length ? 2 : 0);
