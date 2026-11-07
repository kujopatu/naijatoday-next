'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { downloadCsv, readSpreadsheet } from '@/lib/spreadsheet';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import { useToast } from '../ToastProvider';

export type ValidateResult = { errors: string[]; warnings: string[]; row: Record<string, unknown>; label: string };

export type BulkSpec = {
  title: string;                       // "Jobs"
  noun: string;                        // "job"
  table: string;                       // supabase table
  aliases: Record<string, string[]>;   // canonical field -> accepted header names (lower-case, letters+digits only)
  required: { field: string; label: string }[]; // columns that must exist in the file
  validate: (rec: Record<string, string>) => ValidateResult;
  templateFile: string;
  templateRows: string[][];            // header row + example rows
  hint: string;
};

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

// Upload a spreadsheet → preview every row with its errors/warnings →
// import the valid ones in chunks of 50. Used by Jobs, Scholarships, Fixtures.
export default function BulkImport({ spec, onDone }: { spec: BulkSpec; onDone: () => void }) {
  const { card, border, text, muted, darkMode: D } = useTheme();
  const { showToast } = useToast();
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<(ValidateResult & { rowNum: number })[]>([]);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setRows([]);
    try {
      const raw = await readSpreadsheet(file);
      if (raw.length === 0) { showToast('⚠️ That file has no rows in it.'); return; }
      const headerMap: Record<string, string> = {};
      Object.keys(raw[0]).forEach((h) => {
        for (const [field, al] of Object.entries(spec.aliases)) if (al.includes(norm(h))) { headerMap[h] = field; break; }
      });
      const found = new Set(Object.values(headerMap));
      const missing = spec.required.filter((r) => !found.has(r.field));
      if (missing.length) { showToast(`❌ Couldn't find column(s): ${missing.map((m) => m.label).join(', ')}. Use the template's headers.`); return; }
      setRows(raw.map((r, i) => {
        const rec: Record<string, string> = {};
        for (const [h, f] of Object.entries(headerMap)) rec[f] = r[h] ?? '';
        return { rowNum: i + 2, ...spec.validate(rec) };
      }));
    } catch (e) {
      showToast(`❌ Couldn't read that file: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const valid = rows.filter((r) => r.errors.length === 0);

  const run = async () => {
    if (!valid.length) { showToast('No valid rows to import — fix the errors first.'); return; }
    setBusy(true);
    try {
      const payload = valid.map((r) => ({ ...r.row, created_at: new Date().toISOString() }));
      for (let i = 0; i < payload.length; i += 50) {
        const { error } = await supabase.from(spec.table).insert(payload.slice(i, i + 50));
        if (error) throw new Error(error.message);
      }
      showToast(`🎉 Imported ${valid.length} ${spec.noun}${valid.length === 1 ? '' : 's'}!`);
      setRows([]); setFileName('');
      onDone();
    } catch (e) {
      showToast(`❌ Import failed: ${e instanceof Error ? e.message : 'Unknown error'}. Some earlier rows may already be saved — check the list before retrying.`);
    }
    setBusy(false);
  };

  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: text, marginBottom: 6 }}>📤 Bulk upload {spec.title} (Excel or CSV)</div>
      <div style={{ fontSize: 12.5, color: muted, marginBottom: 14, lineHeight: 1.6 }}>{spec.hint}</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <button onClick={() => downloadCsv(spec.templateFile, spec.templateRows)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>⬇️ Download template</button>
        <label style={{ background: G.green, color: '#fff', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          📁 Choose .xlsx / .csv file
          <input type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {fileName && <span style={{ fontSize: 13, color: muted }}>{fileName}</span>}
      </div>
      {rows.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: text, marginBottom: 8 }}>
            {valid.length} of {rows.length} rows ready to import
            {valid.length < rows.length && <span style={{ color: G.red }}> — rows with errors are skipped</span>}
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', border: `1px solid ${border}`, borderRadius: 8, marginBottom: 12 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ padding: '9px 14px', borderBottom: i < rows.length - 1 ? `1px solid ${border}` : 'none', background: r.errors.length ? (D ? '#2a1515' : '#fff5f5') : r.warnings.length ? (D ? '#2a2415' : '#fffbeb') : 'transparent' }}>
                <div style={{ fontSize: 13, color: text }}>
                  <span style={{ color: muted, marginRight: 8 }}>Row {r.rowNum}</span>{r.label || '(empty)'}
                  {r.errors.length === 0 && r.warnings.length === 0 && <span style={{ color: G.green, marginLeft: 8 }}>✓</span>}
                </div>
                {r.errors.map((m, j) => <div key={'e' + j} style={{ fontSize: 12, color: G.red }}>✕ {m}</div>)}
                {r.warnings.map((m, j) => <div key={'w' + j} style={{ fontSize: 12, color: '#b7791f' }}>⚠ {m}</div>)}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={run} disabled={busy || !valid.length} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: busy || !valid.length ? 'not-allowed' : 'pointer', opacity: busy || !valid.length ? 0.6 : 1 }}>
              {busy ? 'Importing…' : `🚀 Import ${valid.length} ${spec.noun}${valid.length === 1 ? '' : 's'}`}
            </button>
            <button onClick={() => { setRows([]); setFileName(''); }} style={{ background: 'none', color: muted, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 18px', cursor: 'pointer' }}>Clear</button>
          </div>
        </>
      )}
    </div>
  );
}
