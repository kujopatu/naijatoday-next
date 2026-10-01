'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Job, Scholarship } from '@/lib/jobs';
import { G } from '@/lib/theme';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

type JobForm = {
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  experienceLevel: string;
  deadline: string;
  postedDate: string;
  logo: string;
  category: string;
  applyUrl: string;
  description: string;
  requirements: string;
};
const emptyJob: JobForm = {
  title: '',
  company: '',
  location: '',
  salary: '',
  type: 'Full-time',
  experienceLevel: '',
  deadline: '',
  postedDate: '',
  logo: '💼',
  category: 'Technology',
  applyUrl: '',
  description: '',
  requirements: '',
};

type ScholarshipForm = {
  title: string;
  provider: string;
  deadline: string;
  country: string;
  fully: boolean;
  level: string;
  field: string;
  applyUrl: string;
};
const emptyScholarship: ScholarshipForm = { title: '', provider: '', deadline: '', country: '', fully: false, level: 'Masters', field: '', applyUrl: '' };

// A lighter-weight date check than the original's flexible-format parser —
// accepts anything JS's own Date constructor can read (e.g. "June 30, 2026",
// "2026-06-30"), which covers the common cases without extra parsing logic.
function isRecognisableDate(str: string): boolean {
  if (!str.trim()) return true; // optional field
  return !isNaN(new Date(str).getTime());
}

export default function JobsScholarshipsManager() {
  const { showToast } = useToast();
  const { card, border, text, muted, darkMode } = useTheme();
  const [tab, setTab] = useState<'jobs' | 'scholarships'>('jobs');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingScholarships, setLoadingScholarships] = useState(true);
  const [editingJob, setEditingJob] = useState<number | null>(null);
  const [editingScholarship, setEditingScholarship] = useState<number | null>(null);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showScholarshipForm, setShowScholarshipForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [jobForm, setJobForm] = useState<JobForm>(emptyJob);
  const [scholarshipForm, setScholarshipForm] = useState<ScholarshipForm>(emptyScholarship);

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: darkMode ? '#111520' : '#f5f7fa',
    color: text,
    fontSize: 14,
    marginBottom: 10,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Georgia,serif',
  };

  const loadJobs = async () => {
    setLoadingJobs(true);
    try {
      const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(500);
      if (!error && data) setJobs(data as Job[]);
    } catch {}
    setLoadingJobs(false);
  };
  const loadScholarships = async () => {
    setLoadingScholarships(true);
    try {
      const { data, error } = await supabase.from('scholarships').select('*').order('created_at', { ascending: false }).limit(500);
      if (!error && data) setScholarships(data as Scholarship[]);
    } catch {}
    setLoadingScholarships(false);
  };

  useEffect(() => {
    loadJobs();
    loadScholarships();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveJob = async () => {
    if (!jobForm.title || !jobForm.company || !jobForm.applyUrl) {
      showToast('Please fill in title, company and apply URL');
      return;
    }
    if (!isRecognisableDate(jobForm.deadline)) {
      showToast(`⚠️ Deadline "${jobForm.deadline}" isn't a recognisable date. Try a format like "June 30, 2026".`);
      return;
    }
    setSaving(true);
    const toDb = (f: JobForm) => ({
      title: f.title,
      company: f.company,
      location: f.location,
      salary: f.salary,
      type: f.type,
      experience_level: f.experienceLevel,
      deadline: f.deadline,
      posted_date: f.postedDate || null,
      logo: f.logo,
      category: f.category,
      apply_url: f.applyUrl,
      description: f.description,
      requirements: f.requirements,
    });
    try {
      if (editingJob !== null) {
        const { error } = await supabase.from('jobs').update({ ...toDb(jobForm), updated_at: new Date().toISOString() }).eq('id', editingJob);
        if (error) throw error;
        showToast('Job updated! ✅');
      } else {
        const { error } = await supabase.from('jobs').insert([{ ...toDb(jobForm), created_at: new Date().toISOString() }]);
        if (error) throw error;
        showToast('Job added! 🎉');
      }
      setJobForm(emptyJob);
      setEditingJob(null);
      setShowJobForm(false);
      await loadJobs();
    } catch (e) {
      showToast(`❌ Save failed: ${e instanceof Error ? e.message : 'Unknown error'}. Nothing was saved — please try again.`);
    }
    setSaving(false);
  };

  const handleDeleteJob = async (id: number) => {
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
      await loadJobs();
      showToast('Job deleted');
    } catch (e) {
      showToast(`❌ Delete failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleEditJob = (job: Job) => {
    setJobForm({
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary || '',
      type: job.type || 'Full-time',
      experienceLevel: job.experience_level || '',
      deadline: job.deadline || '',
      postedDate: job.posted_date || '',
      logo: job.logo || '💼',
      category: job.category || 'Technology',
      applyUrl: job.apply_url || '',
      description: job.description || '',
      requirements: job.requirements || '',
    });
    setEditingJob(Number(job.id));
    setShowJobForm(true);
  };

  const handleSaveScholarship = async () => {
    if (!scholarshipForm.title || !scholarshipForm.provider || !scholarshipForm.applyUrl) {
      showToast('Please fill in title, provider and apply URL');
      return;
    }
    if (!isRecognisableDate(scholarshipForm.deadline)) {
      showToast(`⚠️ Deadline "${scholarshipForm.deadline}" isn't a recognisable date. Try a format like "July 31, 2026".`);
      return;
    }
    setSaving(true);
    const toDb = (f: ScholarshipForm) => ({
      title: f.title,
      provider: f.provider,
      deadline: f.deadline,
      country: f.country,
      fully: f.fully,
      level: f.level,
      field: f.field,
      apply_url: f.applyUrl,
    });
    try {
      if (editingScholarship !== null) {
        const { error } = await supabase.from('scholarships').update({ ...toDb(scholarshipForm), updated_at: new Date().toISOString() }).eq('id', editingScholarship);
        if (error) throw error;
        showToast('Scholarship updated! ✅');
      } else {
        const { error } = await supabase.from('scholarships').insert([{ ...toDb(scholarshipForm), created_at: new Date().toISOString() }]);
        if (error) throw error;
        showToast('Scholarship added! 🎉');
      }
      setScholarshipForm(emptyScholarship);
      setEditingScholarship(null);
      setShowScholarshipForm(false);
      await loadScholarships();
    } catch (e) {
      showToast(`❌ Save failed: ${e instanceof Error ? e.message : 'Unknown error'}. Nothing was saved — please try again.`);
    }
    setSaving(false);
  };

  const handleDeleteScholarship = async (id: number) => {
    try {
      const { error } = await supabase.from('scholarships').delete().eq('id', id);
      if (error) throw error;
      await loadScholarships();
      showToast('Scholarship deleted');
    } catch (e) {
      showToast(`❌ Delete failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleEditScholarship = (s: Scholarship) => {
    setScholarshipForm({
      title: s.title,
      provider: s.provider,
      deadline: s.deadline || '',
      country: s.country || '',
      fully: s.fully,
      level: s.level || 'Masters',
      field: s.field || '',
      applyUrl: s.apply_url || '',
    });
    setEditingScholarship(Number(s.id));
    setShowScholarshipForm(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['jobs', 'scholarships'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? G.green : 'none',
              color: tab === t ? '#fff' : muted,
              border: `1px solid ${tab === t ? G.green : border}`,
              borderRadius: 8,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: tab === t ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            {t === 'jobs' ? `💼 Jobs (${jobs.length})` : `🎓 Scholarships (${scholarships.length})`}
          </button>
        ))}
      </div>

      {tab === 'jobs' && (
        <div>
          {!showJobForm ? (
            <button
              onClick={() => {
                setJobForm(emptyJob);
                setEditingJob(null);
                setShowJobForm(true);
              }}
              style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}
            >
              + Add New Job
            </button>
          ) : (
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 14 }}>{editingJob !== null ? 'Edit Job' : 'New Job'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <input placeholder="Job title *" style={inp} value={jobForm.title} onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))} />
                <input placeholder="Company *" style={inp} value={jobForm.company} onChange={(e) => setJobForm((f) => ({ ...f, company: e.target.value }))} />
                <input placeholder="Location (e.g. Remote / Lagos)" style={inp} value={jobForm.location} onChange={(e) => setJobForm((f) => ({ ...f, location: e.target.value }))} />
                <input placeholder="Salary (e.g. ₦300,000 - ₦450,000/month)" style={inp} value={jobForm.salary} onChange={(e) => setJobForm((f) => ({ ...f, salary: e.target.value }))} />
                <select style={inp} value={jobForm.type} onChange={(e) => setJobForm((f) => ({ ...f, type: e.target.value }))}>
                  {['Full-time', 'Part-time', 'Contract', 'Remote', 'Internship'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <input placeholder="Experience level (e.g. Entry Level)" style={inp} value={jobForm.experienceLevel} onChange={(e) => setJobForm((f) => ({ ...f, experienceLevel: e.target.value }))} />
                <input placeholder="Category" style={inp} value={jobForm.category} onChange={(e) => setJobForm((f) => ({ ...f, category: e.target.value }))} />
                <input placeholder="Deadline (e.g. September 5, 2026)" style={inp} value={jobForm.deadline} onChange={(e) => setJobForm((f) => ({ ...f, deadline: e.target.value }))} />
              </div>
              <input placeholder="Apply URL *" style={inp} value={jobForm.applyUrl} onChange={(e) => setJobForm((f) => ({ ...f, applyUrl: e.target.value }))} />
              <textarea placeholder="Description" style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={jobForm.description} onChange={(e) => setJobForm((f) => ({ ...f, description: e.target.value }))} />
              <textarea placeholder="Requirements" style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={jobForm.requirements} onChange={(e) => setJobForm((f) => ({ ...f, requirements: e.target.value }))} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleSaveJob} disabled={saving} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving…' : editingJob !== null ? 'Update Job' : 'Add Job'}
                </button>
                <button onClick={() => setShowJobForm(false)} style={{ background: 'none', border: `1px solid ${border}`, color: muted, borderRadius: 8, padding: '10px 24px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loadingJobs ? (
            <div style={{ textAlign: 'center', padding: 32, color: muted }}>Loading…</div>
          ) : jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: muted }}>No jobs yet. Add one above!</div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 14, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: text }}>{job.title}</div>
                  <div style={{ fontSize: 12, color: muted }}>{job.company} · {job.location}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleEditJob(job)} style={{ background: G.green + '22', color: G.green, border: `1px solid ${G.green}33`, borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => handleDeleteJob(Number(job.id))} style={{ background: G.red + '22', color: G.red, border: `1px solid ${G.red}33`, borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'scholarships' && (
        <div>
          {!showScholarshipForm ? (
            <button
              onClick={() => {
                setScholarshipForm(emptyScholarship);
                setEditingScholarship(null);
                setShowScholarshipForm(true);
              }}
              style={{ background: G.gold, color: '#000', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}
            >
              + Add New Scholarship
            </button>
          ) : (
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 14 }}>{editingScholarship !== null ? 'Edit Scholarship' : 'New Scholarship'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <input placeholder="Scholarship title *" style={inp} value={scholarshipForm.title} onChange={(e) => setScholarshipForm((f) => ({ ...f, title: e.target.value }))} />
                <input placeholder="Provider *" style={inp} value={scholarshipForm.provider} onChange={(e) => setScholarshipForm((f) => ({ ...f, provider: e.target.value }))} />
                <input placeholder="Country" style={inp} value={scholarshipForm.country} onChange={(e) => setScholarshipForm((f) => ({ ...f, country: e.target.value }))} />
                <select style={inp} value={scholarshipForm.level} onChange={(e) => setScholarshipForm((f) => ({ ...f, level: e.target.value }))}>
                  {['Undergraduate', 'Masters', 'PhD', 'Any Level'].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                <input placeholder="Field of study" style={inp} value={scholarshipForm.field} onChange={(e) => setScholarshipForm((f) => ({ ...f, field: e.target.value }))} />
                <input placeholder="Deadline (e.g. July 31, 2026)" style={inp} value={scholarshipForm.deadline} onChange={(e) => setScholarshipForm((f) => ({ ...f, deadline: e.target.value }))} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: text, margin: '4px 0 10px' }}>
                <input type="checkbox" checked={scholarshipForm.fully} onChange={(e) => setScholarshipForm((f) => ({ ...f, fully: e.target.checked }))} style={{ width: 16, height: 16, accentColor: G.gold }} />
                Fully funded
              </label>
              <input placeholder="Apply URL *" style={inp} value={scholarshipForm.applyUrl} onChange={(e) => setScholarshipForm((f) => ({ ...f, applyUrl: e.target.value }))} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleSaveScholarship} disabled={saving} style={{ background: G.gold, color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving…' : editingScholarship !== null ? 'Update Scholarship' : 'Add Scholarship'}
                </button>
                <button onClick={() => setShowScholarshipForm(false)} style={{ background: 'none', border: `1px solid ${border}`, color: muted, borderRadius: 8, padding: '10px 24px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loadingScholarships ? (
            <div style={{ textAlign: 'center', padding: 32, color: muted }}>Loading…</div>
          ) : scholarships.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: muted }}>No scholarships yet. Add one above!</div>
          ) : (
            scholarships.map((s) => (
              <div key={s.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 14, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: text }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: muted }}>{s.provider}{s.fully ? ' · Fully funded' : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleEditScholarship(s)} style={{ background: G.green + '22', color: G.green, border: `1px solid ${G.green}33`, borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => handleDeleteScholarship(Number(s.id))} style={{ background: G.red + '22', color: G.red, border: `1px solid ${G.red}33`, borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
