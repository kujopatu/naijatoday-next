'use client';

import { useMemo, useState } from 'react';
import { Job, Scholarship } from '@/lib/jobs';
import { G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

function applyLink(url: string | null) {
  if (!url) {
    alert('No application link added yet');
    return;
  }
  window.open(url, '_blank');
}

export default function JobsBoard({ jobs, scholarships }: { jobs: Job[]; scholarships: Scholarship[] }) {
  const { card, border, text, muted, darkMode } = useTheme();
  const [jobFilter, setJobFilter] = useState('All');

  const jobCats = useMemo(
    () => ['All', ...Array.from(new Set(jobs.map((j) => j.category).filter(Boolean)))] as string[],
    [jobs]
  );
  const filteredJobs = jobFilter === 'All' ? jobs : jobs.filter((j) => j.category === jobFilter);

  const companyCount = new Set(jobs.map((j) => j.company)).size;

  const statCardStyle: React.CSSProperties = {
    background: card,
    border: `1px solid ${border}`,
    borderRadius: 10,
    padding: '16px 12px',
    textAlign: 'center',
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          [String(jobs.length), 'Active Jobs'],
          [String(scholarships.length), 'Scholarships'],
          [String(companyCount), 'Companies'],
          ['Daily', 'New Listings'],
        ].map(([n, l]) => (
          <div key={l} style={statCardStyle}>
            <div style={{ fontSize: 22, fontWeight: 700, color: G.green }}>{n}</div>
            <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase' }}>{l}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: `2px solid ${G.green}`,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Georgia,serif' }}>💼 Latest Job Vacancies</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {jobCats.map((c) => (
            <button
              key={c}
              onClick={() => setJobFilter(c)}
              style={{
                background: jobFilter === c ? G.green : 'none',
                color: jobFilter === c ? '#fff' : muted,
                border: `1px solid ${jobFilter === c ? G.green : border}`,
                padding: '4px 12px',
                borderRadius: 14,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: muted }}>No job listings in this category yet.</div>
      ) : (
        filteredJobs.map((job) => (
          <div
            key={job.id}
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: 10,
              padding: 16,
              marginBottom: 12,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 8,
                background: darkMode ? '#1e2535' : '#f0f4f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                flexShrink: 0,
              }}
            >
              {job.logo || '💼'}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 4, fontFamily: 'Georgia,serif' }}>
                {job.title}
              </div>
              <div style={{ fontSize: 13, color: G.green, fontWeight: 600, marginBottom: 6 }}>
                {job.company} · {job.location}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                {job.salary && (
                  <span style={{ background: G.greenLight, color: G.green, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                    {job.salary}
                  </span>
                )}
                {job.type && (
                  <span style={{ background: darkMode ? '#252a36' : '#f0f4f8', color: muted, padding: '2px 8px', borderRadius: 4 }}>
                    {job.type}
                  </span>
                )}
                {job.experience_level && (
                  <span style={{ background: darkMode ? '#252a36' : '#f0f4f8', color: muted, padding: '2px 8px', borderRadius: 4 }}>
                    {job.experience_level}
                  </span>
                )}
                {job.deadline && <span style={{ color: G.red }}>⏰ {job.deadline}</span>}
              </div>
            </div>
            <button
              onClick={() => applyLink(job.apply_url)}
              style={{
                background: G.green,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Apply Now →
            </button>
          </div>
        ))
      )}

      <div
        style={{
          marginTop: 32,
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: `2px solid ${G.green}`,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Georgia,serif' }}>🎓 Scholarships Open Now</span>
      </div>

      {scholarships.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: muted }}>No scholarships listed yet.</div>
      ) : (
        scholarships.map((s) => (
          <div
            key={s.id}
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: 10,
              padding: 16,
              marginBottom: 12,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 8,
                background: darkMode ? '#1e2535' : '#f0f4f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                flexShrink: 0,
              }}
            >
              🎓
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 4, fontFamily: 'Georgia,serif' }}>
                {s.title}
              </div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 6 }}>
                By {s.provider}
                {s.country ? ` · 📍 ${s.country}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
                {s.fully && (
                  <span style={{ background: G.gold + '22', color: G.gold, padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                    FULLY FUNDED
                  </span>
                )}
                {s.level && (
                  <span style={{ background: darkMode ? '#252a36' : '#f0f4f8', color: muted, padding: '2px 8px', borderRadius: 4 }}>
                    {s.level}
                  </span>
                )}
                {s.deadline && <span style={{ color: G.red }}>⏰ {s.deadline}</span>}
              </div>
            </div>
            <button
              onClick={() => applyLink(s.apply_url)}
              style={{
                background: G.gold,
                color: '#000',
                border: 'none',
                borderRadius: 8,
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Apply Now →
            </button>
          </div>
        ))
      )}
    </div>
  );
}
