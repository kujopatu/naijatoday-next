// Dependency-free spreadsheet reader for the admin bulk importers.
// Reads .xlsx (a zip of XML files) and .csv in the browser, and returns the
// first sheet as an array of { header: value } rows, all values as strings.
// Dates stored as real Excel dates come back as readable text ("July 30, 2026").

type ZipEntry = { name: string; method: number; compSize: number; offset: number };

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZip(buf: ArrayBuffer): Promise<Map<string, () => Promise<string>>> {
  const dv = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a valid .xlsx file');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const entries: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const offset = dv.getUint32(p + 42, true);
    entries.push({ name: dec.decode(bytes.subarray(p + 46, p + 46 + nameLen)), method, compSize, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  const out = new Map<string, () => Promise<string>>();
  for (const e of entries) {
    out.set(e.name, async () => {
      const nl = dv.getUint16(e.offset + 26, true);
      const xl = dv.getUint16(e.offset + 28, true);
      const start = e.offset + 30 + nl + xl;
      const raw = bytes.subarray(start, start + e.compSize);
      if (e.method === 0) return dec.decode(raw);
      if (e.method === 8) return dec.decode(await inflateRaw(raw));
      throw new Error('Unsupported compression in .xlsx');
    });
  }
  return out;
}

const parseXml = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
const colIndex = (ref: string) => {
  const m = /^([A-Z]+)/.exec(ref);
  let n = 0;
  for (const ch of m ? m[1] : '') n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

const BUILTIN_DATE_FMTS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

function serialToDate(serial: number): Date {
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}
function formatDateCell(serial: number): string {
  if (serial > 0 && serial < 1) {
    const mins = Math.round(serial * 1440);
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }
  return serialToDate(serial).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

async function readXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const zip = await readZip(buf);
  const get = async (n: string) => { const f = zip.get(n); return f ? parseXml(await f()) : null; };

  // Which file is the first sheet?
  let sheetPath = '';
  const wb = await get('xl/workbook.xml');
  const rels = await get('xl/_rels/workbook.xml.rels');
  const firstSheet = wb?.getElementsByTagName('sheet')[0];
  const rid = firstSheet?.getAttribute('r:id') || firstSheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  if (rels && rid) {
    for (const r of Array.from(rels.getElementsByTagName('Relationship'))) {
      if (r.getAttribute('Id') === rid) { const t = r.getAttribute('Target') || ''; sheetPath = t.startsWith('/') ? t.slice(1) : 'xl/' + t; }
    }
  }
  if (!sheetPath || !zip.has(sheetPath)) sheetPath = Array.from(zip.keys()).filter((k) => /^xl\/worksheets\/[^/]+\.xml$/.test(k)).sort()[0];
  const sheet = sheetPath ? await get(sheetPath) : null;
  if (!sheet) throw new Error('No worksheet found in file');

  const shared: string[] = [];
  const ss = await get('xl/sharedStrings.xml');
  if (ss) for (const si of Array.from(ss.getElementsByTagName('si'))) shared.push(Array.from(si.getElementsByTagName('t')).map((t) => t.textContent || '').join(''));

  // Which cell styles are dates?
  const dateStyles = new Set<number>();
  const styles = await get('xl/styles.xml');
  if (styles) {
    const custom = new Set<number>();
    for (const nf of Array.from(styles.getElementsByTagName('numFmt'))) {
      const code = (nf.getAttribute('formatCode') || '').replace(/"[^"]*"|\[[^\]]*\]/g, '');
      if (/[dmyhs]/i.test(code) && !/^(General|0)/.test(code)) custom.add(Number(nf.getAttribute('numFmtId')));
    }
    const xfs = styles.getElementsByTagName('cellXfs')[0];
    Array.from(xfs?.getElementsByTagName('xf') || []).forEach((xf, i) => {
      const id = Number(xf.getAttribute('numFmtId'));
      if (BUILTIN_DATE_FMTS.has(id) || custom.has(id)) dateStyles.add(i);
    });
  }

  const rows: string[][] = [];
  for (const row of Array.from(sheet.getElementsByTagName('row'))) {
    const r: string[] = [];
    let seq = 0;
    for (const c of Array.from(row.getElementsByTagName('c'))) {
      const ref = c.getAttribute('r');
      const idx = ref ? colIndex(ref) : seq;
      seq = idx + 1;
      const t = c.getAttribute('t');
      const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
      let val = '';
      if (t === 's') val = shared[Number(v)] ?? '';
      else if (t === 'inlineStr') val = Array.from(c.getElementsByTagName('t')).map((x) => x.textContent || '').join('');
      else if (t === 'b') val = v === '1' ? 'TRUE' : 'FALSE';
      else if (t === 'str' || t === 'e') val = v;
      else if (v !== '' && dateStyles.has(Number(c.getAttribute('s')))) val = formatDateCell(Number(v));
      else val = v;
      r[idx] = val;
    }
    const filled = Array.from(r, (x) => x ?? '');
    if (filled.some((x) => x.trim())) rows.push(filled);
  }
  return rows;
}

function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = '', q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export async function readSpreadsheet(file: File): Promise<Record<string, string>[]> {
  const name = file.name.toLowerCase();
  let grid: string[][];
  if (name.endsWith('.csv')) grid = readCsv(await file.text());
  else if (name.endsWith('.xlsx')) grid = await readXlsx(await file.arrayBuffer());
  else throw new Error('Please upload an .xlsx or .csv file (older .xls files: open in Excel and Save As .xlsx).');
  if (grid.length < 2) return [];
  const headers = grid[0].map((h) => String(h ?? '').trim());
  return grid.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) o[h] = String(r[i] ?? '').trim(); });
    return o;
  });
}

// CSV template, UTF-8 with BOM so Excel shows ₦ and accents correctly.
export function downloadCsv(filename: string, rows: string[][]) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
