'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { parseFlexibleDate } from '@/lib/dates';
import { Job, Scholarship } from '@/lib/jobs';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';
import { Intro, Row } from './ToolShared';

export default function ExpiredDeadlinesReport() {
  const { text, muted } = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [schol, setSchol] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: j }, { data: s }] = await Promise.all([
        supabase.from('jobs').select('*').limit(500),
        supabase.from('scholarships').select('*').limit(500),
      ]);
      const now = Date.now();
      const expired = <T extends { deadline: string | null }>(rows: T[] | null) =>
        (rows || []).filter((r) => {
          const d = parseFlexibleDate(r.deadline);
          return d && d.getTime() < now;
        });
      setJobs(expired(j as Job[] | null));
      setSchol(expired(s as Scholarship[] | null));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ color: muted, fontSize: 13 }}>Loading…</div>;
  return (
    <div>
      <Intro>Listings whose deadline has already passed. Remove or update them in Jobs &amp; Scholarships.</Intro>
      <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 10 }}>💼 Expired Jobs ({jobs.length})</div>
      {jobs.length === 0 && <div style={{ fontSize: 13, color: G.green, marginBottom: 16 }}>✅ No expired job listings.</div>}
      {jobs.map((j) => (
        <Row key={j.id} accent={G.red}>
          <div style={{ fontSize: 13, color: text, fontWeight: 600 }}>{j.title} — {j.company}</div>
          <div style={{ fontSize: 11, color: G.red, marginTop: 4 }}>Deadline passed: {j.deadline}</div>
        </Row>
      ))}
      <div style={{ fontSize: 14, fontWeight: 700, color: text, margin: '20px 0 10px' }}>🎓 Expired Scholarships ({schol.length})</div>
      {schol.length === 0 && <div style={{ fontSize: 13, color: G.green }}>✅ No expired scholarship listings.</div>}
      {schol.map((s) => (
        <Row key={s.id} accent={G.red}>
          <div style={{ fontSize: 13, color: text, fontWeight: 600 }}>{s.title}</div>
          <div style={{ fontSize: 11, color: G.red, marginTop: 4 }}>Deadline passed: {s.deadline}</div>
        </Row>
      ))}
    </div>
  );
}
