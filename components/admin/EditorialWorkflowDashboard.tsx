'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';

type WorkflowPost = {
  id: string;
  title: string;
  category: string;
  author: string | null;
  workflow_status: string;
  published: boolean | null;
  assigned_to: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string | null;
  submitted_at: string | null;
  reviewed_at?: string | null;
  updated_at?: string | null;
  views?: number | null;
  comments?: number | null;
  upvotes?: number | null;
};

type Props = { onNavigate: (section: string) => void };

export default function EditorialWorkflowDashboard({ onNavigate }: Props) {
  const { card, border, text, muted } = useTheme();
  const [posts, setPosts] = useState<WorkflowPost[]>([]);
  const [tips, setTips] = useState({ new: 0, reviewing: 0, accepted: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [postResult, newTips, reviewingTips, acceptedTips] = await Promise.all([
      supabase.from('posts')
        .select('id,title,category,author,workflow_status,published,assigned_to,scheduled_at,published_at,created_at,submitted_at,reviewed_at,updated_at,views,comments,upvotes')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('story_submissions').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('story_submissions').select('id', { count: 'exact', head: true }).eq('status', 'reviewing'),
      supabase.from('story_submissions').select('id', { count: 'exact', head: true }).eq('status', 'accepted'),
    ]);
    if (postResult.error) setError('Could not load article workflow: ' + postResult.error.message);
    else setPosts((postResult.data || []) as WorkflowPost[]);
    if (newTips.error || reviewingTips.error || acceptedTips.error) {
      setError(current => current || 'Some reader-tip totals could not be loaded. Check access to Reader News Tips.');
    }
    setTips({ new: newTips.count || 0, reviewing: reviewingTips.count || 0, accepted: acceptedTips.count || 0 });
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const unpublished = posts.filter(post => post.published === false);
    const scheduled = unpublished.filter(post => !!post.scheduled_at || post.workflow_status?.toLowerCase() === 'scheduled');
    const review = unpublished.filter(post => ['review', 'in_review', 'pending', 'awaiting_review', 'submitted'].includes((post.workflow_status || '').toLowerCase()));
    const drafts = unpublished.filter(post => !scheduled.includes(post) && !review.includes(post));
    const published = posts.filter(post => post.published === true);
    const recent = [...published].sort((a, b) => new Date(b.published_at || b.created_at || 0).getTime() - new Date(a.published_at || a.created_at || 0).getTime()).slice(0, 6);
    const assignments = new Map<string, number>();
    posts.filter(post => post.published === false && post.assigned_to).forEach(post => {
      const name = post.assigned_to as string;
      assignments.set(name, (assignments.get(name) || 0) + 1);
    });
    const submittedStatuses = ['submitted', 'in_review', 'review', 'pending', 'awaiting_review'];
        const submitted = posts.filter(post => submittedStatuses.includes((post.workflow_status || '').toLowerCase()) || !!post.submitted_at);
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentPosts = posts.filter(post => {
      const date = post.updated_at || post.published_at || post.submitted_at || post.created_at;
      return !!date && new Date(date).getTime() >= since;
    });
    const writerMap = new Map<string, { total: number; published: number; submitted: number; drafts: number; recent: number; views: number }>();
    posts.forEach(post => {
      const name = (post.author || 'NaijaToday Desk').trim() || 'NaijaToday Desk';
      const item = writerMap.get(name) || { total: 0, published: 0, submitted: 0, drafts: 0, recent: 0, views: 0 };
      item.total += 1;
      if (post.published === true) { item.published += 1; item.views += Number(post.views || 0); }
      if (submittedStatuses.includes((post.workflow_status || '').toLowerCase()) || !!post.submitted_at) item.submitted += 1;
      if (post.published === false && !post.submitted_at && !submittedStatuses.includes((post.workflow_status || '').toLowerCase())) item.drafts += 1;
      const date = post.published_at || post.submitted_at || post.created_at;
      if (date && new Date(date).getTime() >= since) item.recent += 1;
      writerMap.set(name, item);
    });
    const writers = [...writerMap.entries()].map(([name, values]) => ({ name, ...values })).sort((a, b) => b.views - a.views || b.recent - a.recent || b.total - a.total).slice(0, 8);
    const publishedPosts = posts.filter(post => post.published === true);
    const now = new Date();
    const monthKeys = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return { key: date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0'), label: date.toLocaleDateString('en-NG', { month: 'short' }) };
    });
    const monthly = monthKeys.map(month => ({
      ...month,
      count: publishedPosts.filter(post => {
        const date = post.published_at || post.created_at;
        if (!date) return false;
        const parsed = new Date(date);
        return parsed.getFullYear() + '-' + String(parsed.getMonth() + 1).padStart(2, '0') === month.key;
      }).length,
    }));
    const categoryMap = new Map<string, { articles: number; views: number }>();
    publishedPosts.forEach(post => {
      const name = (post.category || 'Uncategorised').trim() || 'Uncategorised';
      const item = categoryMap.get(name) || { articles: 0, views: 0 };
      item.articles += 1;
      item.views += Number(post.views || 0);
      categoryMap.set(name, item);
    });
    const categories = [...categoryMap.entries()].map(([name, values]) => ({ name, ...values })).sort((a, b) => b.views - a.views || b.articles - a.articles).slice(0, 7);
    const topStories = [...publishedPosts].sort((a, b) => Number(b.views || 0) - Number(a.views || 0)).slice(0, 5);
    const engagement = publishedPosts.reduce((sum, post) => sum + Number(post.comments || 0) + Number(post.upvotes || 0), 0);
    const totalViews = publishedPosts.reduce((sum, post) => sum + Number(post.views || 0), 0);
    return { drafts, review, scheduled, published, submitted, recent, recentPosts, writers, monthly, categories, topStories, totalViews, engagement, assignments: [...assignments.entries()].sort((a, b) => b[1] - a[1]) };
  }, [posts]);

  const statCards = [
    { label: 'New reader tips', value: tips.new, icon: '📨', color: G.gold, action: 'story-tips' },
    { label: 'Draft articles', value: stats.drafts.length, icon: '📝', color: muted, action: 'manage' },
    { label: 'Awaiting approval', value: stats.review.length, icon: '🔎', color: '#d97706', action: 'manage' },
    { label: 'Scheduled articles', value: stats.scheduled.length, icon: '🗓️', color: '#6478d3', action: 'manage' },
    { label: 'Published stories', value: stats.published.length, icon: '📰', color: G.green, action: 'manage' },
  ];

  const panel: React.CSSProperties = { background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 16 };
  const actionButton: React.CSSProperties = { border: `1px solid ${border}`, borderRadius: 8, background: 'transparent', color: text, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 };

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h2 style={{ color: text, fontSize: 20, fontFamily: 'Georgia,serif', margin: 0 }}>🗂️ Editorial Workflow Dashboard</h2>
          <p style={{ color: muted, fontSize: 12, margin: '5px 0 0' }}>A newsroom snapshot of reader tips, article progress and publishing activity.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void load()} style={actionButton}>↻ Refresh</button>
          <button onClick={() => onNavigate('new')} style={{ ...actionButton, background: G.green, color: '#fff', borderColor: G.green }}>＋ Write article</button>
        </div>
      </div>

      {error && <div role="alert" style={{ background: G.red + '12', color: G.red, border: `1px solid ${G.red}55`, padding: 11, borderRadius: 8, marginBottom: 14, fontSize: 12 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 10, marginBottom: 16 }}>
        {statCards.map(item => (
          <button key={item.label} onClick={() => onNavigate(item.action)} style={{ ...panel, textAlign: 'left', cursor: 'pointer', color: text }}>
            <div style={{ fontSize: 20 }}>{item.icon}</div>
            <div style={{ fontSize: 25, fontWeight: 900, color: item.color, marginTop: 7 }}>{loading ? '…' : item.value.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: muted, fontWeight: 700 }}>{item.label}</div>
            <div style={{ fontSize: 10, color: G.green, marginTop: 8 }}>Open section →</div>
          </button>
        ))}
      </div>

      <div style={{ ...panel, marginBottom: 14 }}>
        <div style={{ color: text, fontWeight: 800, fontSize: 14, marginBottom: 4 }}>📈 Editorial performance · Last 30 days</div>
        <div style={{ color: muted, fontSize: 11, marginBottom: 12 }}>Based on the latest article records available to this dashboard.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
          {[
            ['Articles active', stats.recentPosts.length, G.green],
            ['Submitted for review', stats.submitted.filter(post => {
              const date = post.submitted_at || post.updated_at || post.created_at;
              return !!date && new Date(date).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000;
            }).length, '#6478d3'],
            ['Published', stats.published.filter(post => {
              const date = post.published_at || post.created_at;
              return !!date && new Date(date).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000;
            }).length, G.gold],
          ].map(([label, value, color]) => (
            <div key={String(label)} style={{ border: `1px solid ${border}`, borderRadius: 9, padding: 12 }}>
              <div style={{ color: String(color), fontSize: 23, fontWeight: 900 }}>{loading ? '…' : Number(value).toLocaleString()}</div>
              <div style={{ color: muted, fontSize: 11, fontWeight: 700 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...panel, marginBottom: 14 }}>
        <div style={{ color: text, fontWeight: 800, fontSize: 14, marginBottom: 4 }}>✍️ Writer productivity</div>
        <div style={{ color: muted, fontSize: 11, marginBottom: 12 }}>Ranked by articles created in the last 30 days; includes each writer’s overall totals in the latest records.</div>
        {loading ? <div style={{ color: muted, fontSize: 12 }}>Calculating writer activity…</div> : stats.writers.length === 0 ? (
          <div style={{ color: muted, fontSize: 12 }}>No writer activity found in the latest article records.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600, fontSize: 12 }}>
              <thead><tr style={{ color: muted, textAlign: 'left' }}>
                {['Writer / byline', 'Views', 'Last 30 days', 'Total', 'Published', 'In progress'].map(label => <th key={label} style={{ padding: '9px 8px', borderBottom: `1px solid ${border}` }}>{label}</th>)}
              </tr></thead>
              <tbody>{stats.writers.map(writer => (
                <tr key={writer.name} style={{ color: text }}>
                  <td style={{ padding: '10px 8px', borderBottom: `1px solid ${border}`, fontWeight: 700 }}>{writer.name}</td>
                  <td style={{ padding: '10px 8px', borderBottom: `1px solid ${border}`, color: G.green, fontWeight: 800 }}>{writer.views.toLocaleString('en-NG')}</td>
                  <td style={{ padding: '10px 8px', borderBottom: `1px solid ${border}`, color: G.green, fontWeight: 800 }}>{writer.recent}</td>
                  <td style={{ padding: '10px 8px', borderBottom: `1px solid ${border}` }}>{writer.total}</td>
                  <td style={{ padding: '10px 8px', borderBottom: `1px solid ${border}` }}>{writer.published}</td>
                  <td style={{ padding: '10px 8px', borderBottom: `1px solid ${border}` }}>{writer.drafts + writer.submitted}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ ...panel, marginBottom: 14 }}>
        <div style={{ color: text, fontWeight: 800, fontSize: 14, marginBottom: 4 }}>📊 Editorial analytics report</div>
        <div style={{ color: muted, fontSize: 11, marginBottom: 14 }}>Publishing output and reader activity from published article records. Views are cumulative article counters.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
          {[
            ['Total article views', stats.totalViews.toLocaleString('en-NG'), G.green],
            ['Reader interactions', stats.engagement.toLocaleString('en-NG'), '#6478d3'],
            ['Categories covered', stats.categories.length.toLocaleString('en-NG'), G.gold],
          ].map(([label, value, color]) => (
            <div key={label} style={{ border: '1px solid ' + border, borderRadius: 9, padding: 12 }}>
              <div style={{ color, fontSize: 22, fontWeight: 900 }}>{loading ? '…' : value}</div>
              <div style={{ color: muted, fontSize: 11, fontWeight: 700 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          <div>
            <div style={{ color: text, fontSize: 12, fontWeight: 800, marginBottom: 10 }}>Monthly publishing · Last 6 months</div>
            {stats.monthly.map(month => {
              const max = Math.max(1, ...stats.monthly.map(item => item.count));
              return <div key={month.key} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 26px', alignItems: 'center', gap: 8, margin: '9px 0' }}>
                <span style={{ color: muted, fontSize: 11 }}>{month.label}</span>
                <div style={{ height: 9, background: border, borderRadius: 99, overflow: 'hidden' }}><div style={{ width: (month.count / max * 100) + '%', height: '100%', background: G.green, borderRadius: 99 }} /></div>
                <strong style={{ color: text, fontSize: 11, textAlign: 'right' }}>{loading ? '…' : month.count}</strong>
              </div>;
            })}
          </div>
          <div>
            <div style={{ color: text, fontSize: 12, fontWeight: 800, marginBottom: 10 }}>Category performance · Top by views</div>
            {stats.categories.length === 0 ? <div style={{ color: muted, fontSize: 12 }}>No published category data found.</div> : stats.categories.map(category => {
              const max = Math.max(1, ...stats.categories.map(item => item.views));
              return <div key={category.name} style={{ margin: '0 0 11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: text, fontSize: 11, marginBottom: 4 }}>
                  <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{category.name}</strong>
                  <span style={{ color: muted, flexShrink: 0 }}>{category.views.toLocaleString('en-NG')} views · {category.articles} articles</span>
                </div>
                <div style={{ height: 7, background: border, borderRadius: 99, overflow: 'hidden' }}><div style={{ width: (category.views / max * 100) + '%', height: '100%', background: G.gold, borderRadius: 99 }} /></div>
              </div>;
            })}
          </div>
        </div>
        <div style={{ marginTop: 16, borderTop: '1px solid ' + border, paddingTop: 14 }}>
          <div style={{ color: text, fontSize: 12, fontWeight: 800, marginBottom: 9 }}>🏆 Most-read stories</div>
          {stats.topStories.length === 0 ? <div style={{ color: muted, fontSize: 12 }}>No published stories found.</div> : stats.topStories.map((post, index) => (
            <div key={post.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid ' + border }}>
              <div style={{ display: 'flex', gap: 9, minWidth: 0 }}>
                <strong style={{ color: G.green, fontSize: 12 }}>{index + 1}.</strong>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: text, fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>{post.title}</div>
                  <div style={{ color: muted, fontSize: 10 }}>{post.category} · {post.author || 'NaijaToday Desk'}</div>
                </div>
              </div>
              <strong style={{ color: G.green, fontSize: 12, flexShrink: 0 }}>{Number(post.views || 0).toLocaleString('en-NG')} views</strong>
            </div>
          ))}
        </div>
        <div style={{ color: muted, fontSize: 10, marginTop: 10 }}>Reader interactions combine recorded comments and upvotes. Totals reflect stored article counters, not unique visitors.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 14 }}>
        <div style={panel}>
          <div style={{ color: text, fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📬 Reader tip queue</div>
          {[
            ['New submissions', tips.new],
            ['Being reviewed', tips.reviewing],
            ['Accepted tips', tips.accepted],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${border}`, color: muted, fontSize: 12 }}>
              <span>{label}</span><strong style={{ color: text }}>{loading ? '…' : Number(value).toLocaleString()}</strong>
            </div>
          ))}
          <button onClick={() => onNavigate('story-tips')} style={{ ...actionButton, marginTop: 13, width: '100%' }}>Review reader tips →</button>
        </div>

        <div style={panel}>
          <div style={{ color: text, fontWeight: 800, fontSize: 14, marginBottom: 12 }}>👥 Editor workload</div>
          {loading ? <div style={{ color: muted, fontSize: 12 }}>Loading assignments…</div> : stats.assignments.length === 0 ? (
            <div style={{ color: muted, fontSize: 12, lineHeight: 1.6 }}>No unpublished articles currently have an editor assigned. Assignments can be managed from your existing editorial workflow.</div>
          ) : stats.assignments.map(([name, count]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: `1px solid ${border}`, fontSize: 12 }}>
              <span style={{ color: text, overflowWrap: 'anywhere' }}>{name}</span><strong style={{ color: G.green }}>{count} open</strong>
            </div>
          ))}
          <button onClick={() => onNavigate('assignments')} style={{ ...actionButton, marginTop: 13, width: '100%' }}>Manage article assignments →</button>
        </div>

        <div style={panel}>
          <div style={{ color: text, fontWeight: 800, fontSize: 14, marginBottom: 12 }}>🚦 Workflow snapshot</div>
          {[
            ['Drafts', stats.drafts.length, muted],
            ['Awaiting approval', stats.review.length, '#d97706'],
            ['Scheduled', stats.scheduled.length, '#6478d3'],
            ['Published', stats.published.length, G.green],
          ].map(([label, value, color]) => (
            <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${border}`, fontSize: 12 }}>
              <span style={{ color: muted }}>{label}</span><strong style={{ color: String(color) }}>{loading ? '…' : Number(value).toLocaleString()}</strong>
            </div>
          ))}
          <button onClick={() => onNavigate('manage')} style={{ ...actionButton, marginTop: 13, width: '100%' }}>Open Manage Articles →</button>
        </div>
      </div>

      <div style={{ ...panel, marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ color: text, fontWeight: 800, fontSize: 14 }}>📰 Recently published</div>
          <button onClick={() => onNavigate('manage')} style={actionButton}>View all articles →</button>
        </div>
        {loading ? <div style={{ color: muted, padding: 18, textAlign: 'center', fontSize: 12 }}>Loading newsroom activity…</div> : stats.recent.length === 0 ? (
          <div style={{ color: muted, padding: 18, textAlign: 'center', fontSize: 12 }}>No published articles found in the latest records.</div>
        ) : stats.recent.map(post => (
          <div key={post.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${border}` }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: text, fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>{post.title}</div>
              <div style={{ color: muted, fontSize: 11, marginTop: 3 }}>{post.category} · {post.author || 'NaijaToday Desk'} · {post.published_at || post.created_at ? new Date(post.published_at || post.created_at as string).toLocaleDateString('en-NG') : 'Date unavailable'}</div>
            </div>
            <span style={{ color: G.green, fontSize: 10, fontWeight: 800, flexShrink: 0 }}>LIVE</span>
          </div>
        ))}
      </div>
      <div style={{ color: muted, fontSize: 10, marginTop: 10 }}>Counts are based on the latest 500 article records returned by the newsroom query; reader-tip totals are exact database counts.</div>
    </section>
  );
}
