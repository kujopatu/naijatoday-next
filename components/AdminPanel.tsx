'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminPostRow, ModRequest, ForumReport } from '@/lib/admin';
import { ForumThread } from '@/lib/forum';
import { CATEGORIES, G } from '@/lib/theme';
import { useAuth } from './AuthProvider';
import { useToast } from './ToastProvider';
import { useTheme } from './ThemeProvider';
import BreakingNewsManager from './admin/BreakingNewsManager';
import JobsScholarshipsManager from './admin/JobsScholarshipsManager';
import ForumManager from './admin/ForumManager';
import TrendManagerPanel from './admin/TrendManagerPanel';
import DataPlansManagerPanel from './admin/DataPlansManagerPanel';
import FuelPriceManagerPanel from './admin/FuelPriceManagerPanel';
import SocialLinksManagerPanel from './admin/SocialLinksManagerPanel';
import ProductsManagerPanel from './admin/ProductsManagerPanel';
import FixturesManagerPanel from './admin/FixturesManagerPanel';
import PollAnalyticsPanel from './admin/PollAnalyticsPanel';
import UserManagementPanel from './admin/UserManagementPanel';
import EditorialTeamPanel from './admin/EditorialTeamPanel';
import AuthorProfilesPanel from './admin/AuthorProfilesPanel';
import AdminDiagnostic from './admin/AdminDiagnostic';
import AdminToolsHub from './admin/AdminToolsHub';
import RichTextEditor from './admin/RichTextEditor';
import SitemapPanel from './admin/SitemapPanel';
import AINewsroomMonitor from './admin/AINewsroomMonitor';
import StorySubmissionsPanel from './admin/StorySubmissionsPanel';

const CLOUDINARY_CLOUD = 'dywtb9ky3';
const CLOUDINARY_PRESET = 'naijatorday_upload';
const EMOJIS = ['📰', '🎭', '🎵', '⭐', '🏛️', '💼', '💻', '⚽', '📚', '💰', '🎓', '❤️', '🌟', '💕', '✝️', '🔥', '💬', '🎤', '🏅', '📡', '🌍'];

type ArticleForm = {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image: string;
  author: string;
  read_time: string;
  breaking: boolean;
  hot: boolean;
  featured: boolean;
  sponsored: boolean;
  tags: string;
  pollQuestion: string;
  pollOptions: string[];
};

const emptyForm: ArticleForm = {
  title: '',
  excerpt: '',
  content: '',
  category: 'Entertainment',
  image: '📰',
  author: 'NaijaToday Desk',
  read_time: '3 min',
  breaking: false,
  hot: false,
  featured: false,
  sponsored: false,
  tags: '',
  pollQuestion: '',
  pollOptions: ['', ''],
};

const ADMIN_MENU_GROUPS: { label: string; items: [string, string][] }[] = [
  { label: 'Dashboard', items: [['overview', '📊 Analytics']] },
  { label: 'Articles & Publishing', items: [['new', '✍️ Write New Article'], ['manage', '📋 Manage Articles'], ['story-tips', '📨 Reader News Tips'], ['breaking', '🔴 Breaking News'], ['ai-newsroom', '🤖 AI Newsroom Monitor']] },
  { label: 'Community & Users', items: [['forum', '💬 Forum Manager'], ['reports', '🚩 Reports'], ['moderators', '🛡️ Moderators'], ['users', '👥 User Management'], ['team', '🧑‍💻 Editorial Team'], ['authors', '✍️ Author Profiles']] },
  { label: 'Content & Engagement', items: [['trends', '🔥 Trend Manager'], ['social', '🔗 Social Links'], ['polls', '🗳️ Poll Analytics'], ['products', '🛍️ Products / Resources']] },
  { label: 'Services & Updates', items: [['jobs', '💼 Jobs & Scholarships'], ['fuel', '⛽ Fuel Prices'], ['dataplans', '📱 Data Plans'], ['fixtures', '⚽ Fixtures & Scores']] },
  { label: 'Website Tools', items: [['sitemap', '🗺️ Sitemap'], ['tools', '🛠️ Admin Tools']] },
];

// Tabs with a real implementation below. Everything else in TABS renders
// a plain "coming soon" placeholder — kept visible so the panel's shape
// matches the original, but honest about what's actually built.
const BUILT_TABS = new Set(['overview', 'new', 'manage', 'story-tips', 'ai-newsroom', 'moderators', 'reports', 'breaking', 'jobs', 'forum', 'trends', 'dataplans', 'fuel', 'social', 'products', 'fixtures', 'polls', 'users', 'team', 'authors', 'tools', 'sitemap']);

export default function AdminPanel() {
  const { userEmail, isAdmin, isEditor, isWriter, isModerator, canModerate } = useAuth();
  const { showToast } = useToast();
  const { darkMode, card, border, text, muted } = useTheme();

  const [activeSection, setActiveSection] = useState(isAdmin ? 'overview' : isModerator ? 'forum' : isEditor ? 'story-tips' : 'new');
  const visibleMenuGroups = isAdmin ? ADMIN_MENU_GROUPS : isModerator
    ? ADMIN_MENU_GROUPS.filter((group) => group.label === 'Community & Users').map((group) => ({ ...group, items: group.items.filter(([key]) => key === 'forum' || key === 'reports') }))
    : ADMIN_MENU_GROUPS.filter((group) => group.label === 'Articles & Publishing').map((group) => ({
        ...group,
        items: group.items.filter(([key]) => key === 'new' || key === 'manage' || (isEditor && key === 'story-tips')),
      }));
  const [pendingCount, setPendingCount] = useState(0);
  // Count of forum threads waiting for approval (shown on the Queue tab).
  useEffect(() => {
    supabase.from('forum_threads').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? 0));
  }, [activeSection]);

  // Articles
  const [posts, setPosts] = useState<AdminPostRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [articleStatusFilter, setArticleStatusFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [articleSearch, setArticleSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [commentTotal, setCommentTotal] = useState<number>(0);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingArticleImage, setGeneratingArticleImage] = useState(false);
  const [articleImagePrompt, setArticleImagePrompt] = useState('');
  const imgInputRef = useRef<HTMLInputElement>(null);

  // Moderators
  const [moderators, setModerators] = useState<string[]>([]);
  const [modRequests, setModRequests] = useState<ModRequest[]>([]);
  const [addEmail, setAddEmail] = useState('');

  // Reports
  const [reports, setReports] = useState<ForumReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [forumThreads, setForumThreads] = useState<ForumThread[]>([]);
  const [reportSearch, setReportSearch] = useState('');

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: darkMode ? '#111520' : '#f5f7fa',
    color: text,
    fontSize: 14,
    marginBottom: 12,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Georgia,serif',
  };
  const statCard: React.CSSProperties = { background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 16, textAlign: 'center' };

  // ---------- Articles ----------

  const loadPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id,title,excerpt,category,image,author,read_time,breaking,hot,featured,sponsored,tags,views,upvotes,comments,published,created_at,updated_at'
        )
        .order('created_at', { ascending: false })
        .limit(300);
      if (!error && data) {
        setPosts(data as AdminPostRow[]);
        const { count: visibleCommentCount, error: commentsError } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('is_hidden', false);
        if (!commentsError) setCommentTotal(visibleCommentCount ?? 0);
        else console.error('Could not load visible comment total:', commentsError.message);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadSubscriberCount = async () => {
    try {
      const { count, error } = await supabase.from('subscribers').select('*', { count: 'exact', head: true });
      if (!error) setSubscriberCount(count);
    } catch {}
  };

  useEffect(() => {
    loadPosts();
    loadSubscriberCount();
    loadModerators();
  }, []);

  const logActivity = async (action: string, detail: string) => {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;
      await fetch('/api/admin/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ action, detail }),
      });
    } catch {
      /* Activity logging is best-effort and must not interrupt editorial work. */
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const compressed: Blob = await new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const MAX = 1200;
          let { width, height } = img;
          if (width > MAX) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas empty'))), 'image/jpeg', 0.8);
        };
        img.onerror = reject;
        img.src = url;
      });
      const formData = new FormData();
      formData.append('file', compressed, 'article.jpg');
      formData.append('upload_preset', CLOUDINARY_PRESET);
      formData.append('folder', 'naijatorday/articles');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setForm((f) => ({ ...f, image: data.secure_url }));
        showToast('Image uploaded to Cloudinary! 🎉');
      } else {
        showToast('Cloudinary upload preset needed — see setup instructions or paste URL manually.');
        console.error('Cloudinary error:', data);
      }
    } catch (err) {
      showToast('Upload error: ' + (err instanceof Error ? err.message : 'Connection error'));
    }
    setUploadingImage(false);
    e.target.value = '';
  };

  const handleGenerateManualArticleImage = async () => {
    if (!form.title.trim() && !articleImagePrompt.trim()) {
      showToast('Enter an article title or describe the image you want.');
      return;
    }
    setGeneratingArticleImage(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) throw new Error('Your admin session has expired. Please sign in again.');

      const response = await fetch('/.netlify/functions/generate-manual-article-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          title: form.title,
          excerpt: form.excerpt,
          content: form.content,
          category: form.category,
          custom_prompt: articleImagePrompt,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.image_url) throw new Error(result.error || 'Image generation failed.');
      setForm((current) => ({ ...current, image: result.image_url }));
      showToast('Editorial image generated and added to your article! 🎉');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Image generation failed.');
    } finally {
      setGeneratingArticleImage(false);
    }
  };

  const handleSave = async (publish = true) => {
    if (!form.title || !form.excerpt || !form.content) {
      showToast('Please fill in title, excerpt and content');
      return;
    }
    setSaving(true);
    const tagsArray = form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    const { pollQuestion, pollOptions, ...rest } = form;
    const payload = { ...rest, tags: tagsArray, published: isWriter ? false : publish };
    const validPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);

    try {
      let postId: string | null = editId;
      if (editId) {
        const { error } = await supabase.from('posts').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editId);
        if (error) {
          showToast('Error: ' + error.message);
          setSaving(false);
          return;
        }
      } else {
        const { data, error } = await supabase
          .from('posts')
          .insert([{ ...payload, views: 0, upvotes: 0, comments: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
          .select();
        if (error) {
          showToast('Error: ' + error.message);
          setSaving(false);
          return;
        }
        postId = data?.[0]?.id ?? null;
      }

      if (postId) {
        if (pollQuestion.trim() && validPollOptions.length >= 2) {
          const { data: existing } = await supabase.from('polls').select('id').eq('post_id', postId).limit(1);
          if (existing && existing.length > 0) {
            await supabase.from('polls').update({ question: pollQuestion.trim(), options: validPollOptions }).eq('id', existing[0].id);
          } else {
            await supabase.from('polls').insert([{ post_id: postId, question: pollQuestion.trim(), options: validPollOptions }]);
          }
        } else if (editId) {
          await supabase.from('polls').delete().eq('post_id', postId);
        }
      }

      if (editId) {
        showToast('Article updated! ✅');
        logActivity('Updated article', form.title);
        setEditId(null);
        setForm(emptyForm);
        loadPosts();
      } else {
        showToast(publish ? 'Article published! 🎉' : 'Article saved as draft.');
        logActivity(publish ? 'Published article' : 'Saved article draft', form.title);
        setForm(emptyForm);
        loadPosts();
        setActiveSection('manage');
      }
    } catch {
      showToast('Connection error');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const deletedPost = posts.find((p) => p.id === id);
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) showToast('Error: ' + error.message);
      else {
        showToast('Article deleted');
        setDeleteConfirm(null);
        loadPosts();
        logActivity('Deleted article', deletedPost?.title || `#${id}`);
      }
    } catch {
      showToast('Connection error');
    }
  };

  const togglePostSelect = (id: string) => setSelectedPosts((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const visibleManagePosts = posts.filter((post) => {
    const matchesStatus = articleStatusFilter === 'all'
      || (articleStatusFilter === 'published' && post.published !== false)
      || (articleStatusFilter === 'unpublished' && post.published === false);
    const query = articleSearch.trim().toLowerCase();
    const matchesSearch = !query || [post.title, post.category, post.author].some((value) => (value || '').toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });
  const toggleSelectAll = () => setSelectedPosts((selected) => {
    const visibleIds = visibleManagePosts.map((post) => post.id);
    return visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id))
      ? selected.filter((id) => !visibleIds.includes(id))
      : [...new Set([...selected, ...visibleIds])];
  });

  const handleBulkDelete = async () => {
    if (selectedPosts.length === 0) return;
    if (!window.confirm(`Delete ${selectedPosts.length} article(s)? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('posts').delete().in('id', selectedPosts);
      if (error) showToast('Error: ' + error.message);
      else {
        showToast(`${selectedPosts.length} article(s) deleted`);
        setSelectedPosts([]);
        loadPosts();
      }
    } catch {
      showToast('Connection error');
    }
  };

  const handleBulkToggle = async (field: 'published' | 'featured', value: boolean) => {
    if (selectedPosts.length === 0) return;
    try {
      const { error } = await supabase.from('posts').update({ [field]: value }).in('id', selectedPosts);
      if (error) showToast('Error: ' + error.message);
      else {
        showToast(`Updated ${selectedPosts.length} article(s)`);
        setSelectedPosts([]);
        loadPosts();
      }
    } catch {
      showToast('Connection error');
    }
  };

  const handleEdit = async (post: AdminPostRow) => {
    setForm({
      title: post.title,
      excerpt: post.excerpt ?? '',
      content: '',
      category: post.category,
      image: post.image || '📰',
      author: post.author || 'NaijaToday Desk',
      read_time: post.read_time || '3 min',
      breaking: post.breaking || false,
      hot: post.hot || false,
      featured: post.featured || false,
      sponsored: post.sponsored || false,
      tags: (post.tags || []).join(', '),
      pollQuestion: '',
      pollOptions: ['', ''],
    });
    setEditId(post.id);
    setActiveSection('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Loading article content...');
    try {
      const { data: full } = await supabase.from('posts').select('content').eq('id', post.id).maybeSingle();
      setForm((f) => ({ ...f, content: (full as { content?: string } | null)?.content || '' }));
      showToast('Editing article — make changes and click Update');
    } catch {
      showToast("⚠️ Couldn't load full content — try again");
    }
    try {
      const { data } = await supabase.from('polls').select('*').eq('post_id', post.id).limit(1);
      if (data && data.length > 0) {
        const p = data[0] as { question: string; options: string[] };
        setForm((f) => ({ ...f, pollQuestion: p.question, pollOptions: p.options.length >= 2 ? p.options : [...p.options, ''] }));
      }
    } catch {}
  };

  // ---------- Moderators ----------

  const loadModerators = async () => {
    try {
      const { data, error } = await supabase.from('moderators').select('email');
      if (!error && data) setModerators((data as { email: string }[]).map((m) => m.email));
    } catch {}
  };

  const loadModRequests = async () => {
    if (!isAdmin) return;
    try {
      const { data, error } = await supabase.from('mod_requests').select('*').order('requested_at', { ascending: false });
      if (!error && data) setModRequests(data as ModRequest[]);
    } catch {}
  };

  useEffect(() => {
    if (activeSection === 'moderators') loadModRequests();
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveModerators = async (list: string[]) => {
    const toAdd = list.filter((e) => !moderators.includes(e));
    const toRemove = moderators.filter((e) => !list.includes(e));
    try {
      if (toAdd.length > 0) {
        const { error } = await supabase.from('moderators').insert(toAdd.map((email) => ({ email })));
        if (error) {
          showToast('Error adding moderator: ' + error.message);
          return;
        }
      }
      if (toRemove.length > 0) {
        const { error } = await supabase.from('moderators').delete().in('email', toRemove);
        if (error) {
          showToast('Error removing moderator: ' + error.message);
          return;
        }
      }
      setModerators(list);
    } catch (e) {
      showToast('Error updating moderators: ' + (e instanceof Error ? e.message : 'connection error'));
    }
  };

  // ---------- Reports ----------

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const [{ data: reportData, error }, { data: threadData }] = await Promise.all([
        supabase.from('forum_reports').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('forum_threads').select('*'),
      ]);
      if (error) {
        showToast('Could not load reports: ' + error.message);
      } else if (reportData) {
        setReports(reportData as ForumReport[]);
      }
      if (threadData) setForumThreads(threadData as ForumThread[]);
    } catch {
      showToast('Connection error loading reports');
    }
    setLoadingReports(false);
  };

  useEffect(() => {
    if (activeSection === 'reports') loadReports();
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResolveReport = async (reportId: number) => {
    try {
      const { error } = await supabase.from('forum_reports').update({ status: 'resolved' }).eq('id', reportId);
      if (error) {
        showToast('Error: ' + error.message);
        return;
      }
      setReports((r) => r.filter((x) => x.id !== reportId));
      showToast('Report resolved ✅');
    } catch {
      showToast('Connection error');
    }
  };

  const handleDeleteReported = async (report: ForumReport) => {
    try {
      if (report.target_type === 'thread') {
        await supabase.from('forum_threads').delete().eq('id', report.target_id);
        showToast('Thread deleted.');
      } else {
        await supabase.from('forum_replies').delete().eq('id', report.target_id);
        showToast('Reply deleted.');
      }
    } catch {
      showToast('Connection error');
    }
    await handleResolveReport(report.id);
  };

  const handleBanFromReport = async (email: string | undefined) => {
    if (!email) {
      showToast("No email on record for this author — can't ban directly here.");
      return;
    }
    if (!window.confirm(`Ban ${email} from posting to the forum?`)) return;
    try {
      const { error } = await supabase
        .from('banned_users')
        .insert([{ email: email.toLowerCase(), reason: 'Banned from Reports queue', banned_at: new Date().toISOString() }]);
      if (error) {
        showToast('Error: ' + error.message);
        return;
      }
      showToast(`${email} banned ✅`);
    } catch {
      showToast('Connection error');
    }
  };

  // ---------- Derived (Overview) ----------

  const totalViews = posts.reduce((s, p) => s + (p.views || 0), 0);
  const totalUpvotes = posts.reduce((s, p) => s + (p.upvotes || 0), 0);

  const publishedCount = posts.filter((p) => p.published !== false).length;
  const unpublishedCount = posts.length - publishedCount;
  const catCounts: Record<string, number> = {};
  posts.forEach((p) => {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  });
  const catSorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const topPosts = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  const maxCat = catSorted.length > 0 ? catSorted[0][1] : 1;

  const filteredReports = reports.filter((report) => {
    const thread = forumThreads.find((item) => item.id === report.thread_id);
    const query = reportSearch.trim().toLowerCase();
    if (!query) return true;
    return [report.reason, report.reported_by, thread?.title || '', report.target_type]
      .some((value) => value.toLowerCase().includes(query));
  });

  const exportReports = () => {
    const rows = [
      ['Report ID', 'Content Type', 'Target ID', 'Thread', 'Reason', 'Reported By', 'Reported At'],
      ...filteredReports.map((report) => [
        String(report.id),
        report.target_type,
        String(report.target_id),
        forumThreads.find((item) => item.id === report.thread_id)?.title || '',
        report.reason,
        report.reported_by,
        report.created_at,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => '"' + value.replace(/"/g, '""') + '"').join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'naijatoday-forum-reports.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${G.greenDark}, #0a2018)`,
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: 'Georgia,serif' }}>⚡ NaijaToday Editorial Workspace</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Draft, review and manage NaijaToday content</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#fff' }}>👤 {userEmail}</div>
          <div style={{ background: G.green, borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#fff', fontWeight: 600 }}>{posts.length} Articles</div>
        </div>
      </div>

      {isAdmin && <AdminDiagnostic userEmail={userEmail} />}

      <div className="admin-menu-groups" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 24,
        padding: 16,
        background: card,
        border: `1px solid ${border}`,
        borderRadius: 12,
      }}>
        {visibleMenuGroups.map((group) => {
          const selected = group.items.some(([key]) => key === activeSection);
          return (
            <label key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <span style={{ color: muted, fontSize: 11, fontWeight: 800, letterSpacing: '.65px', textTransform: 'uppercase' }}>
                {group.label}
              </span>
              <select
                aria-label={group.label}
                value={selected ? activeSection : ''}
                onChange={(event) => {
                  if (event.target.value) setActiveSection(event.target.value);
                }}
                style={{
                  width: '100%',
                  minHeight: 43,
                  padding: '9px 34px 9px 11px',
                  border: `1px solid ${selected ? G.green : border}`,
                  borderRadius: 8,
                  background: darkMode ? '#111520' : '#fff',
                  color: selected ? (darkMode ? '#d7f5e2' : G.greenDark) : text,
                  fontSize: 13,
                  fontWeight: selected ? 700 : 600,
                  cursor: 'pointer',
                  outlineOffset: 2,
                }}
              >
                <option value="">Select {group.label}…</option>
                {group.items.map(([key, label]) => (
                  <option key={key} value={key}>
                    {key === 'forum' && pendingCount > 0 ? `${label} · ${pendingCount} pending` : label}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      {!BUILT_TABS.has(activeSection) && (
        <div style={{ textAlign: 'center', padding: 60, color: muted, background: card, border: `1px solid ${border}`, borderRadius: 12 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🚧</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: text, marginBottom: 6 }}>This tab is coming in a future update</div>
          <div style={{ fontSize: 13 }}>The core publishing workflow (Analytics, Write, Manage, Moderators, Reports) is live — the rest is on the way.</div>
        </div>
      )}

      {isAdmin && activeSection === 'overview' && (
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 16, fontFamily: 'Georgia,serif' }}>📊 Site Analytics</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div style={statCard}>
              <div style={{ fontSize: 22, fontWeight: 700, color: G.green }}>{posts.length}</div>
              <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase' }}>Total Articles</div>
            </div>
            <div style={statCard}>
              <div style={{ fontSize: 22, fontWeight: 700, color: G.green }}>{totalViews.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase' }}>Total Views</div>
            </div>
            <div style={statCard}>
              <div style={{ fontSize: 22, fontWeight: 700, color: G.green }}>{totalUpvotes.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase' }}>Total Upvotes</div>
            </div>
            <div style={statCard}>
              <div style={{ fontSize: 22, fontWeight: 700, color: G.green }}>{commentTotal.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase' }}>Total Comments</div>
            </div>
            <div style={statCard}>
              <div style={{ fontSize: 22, fontWeight: 700, color: G.green }}>{subscriberCount === null ? '…' : subscriberCount.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase' }}>Subscribers</div>
            </div>
            <div style={statCard}>
              <div style={{ fontSize: 22, fontWeight: 700, color: G.green }}>{publishedCount}</div>
              <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase' }}>Published</div>
            </div>
            {unpublishedCount > 0 && (
              <div style={statCard}>
                <div style={{ fontSize: 22, fontWeight: 700, color: muted }}>{unpublishedCount}</div>
                <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase' }}>Unpublished</div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 14, fontFamily: 'Georgia,serif' }}>📂 Articles by Category</div>
              {catSorted.length === 0 ? (
                <div style={{ fontSize: 13, color: muted }}>No articles yet.</div>
              ) : (
                catSorted.map(([cat, count]) => (
                  <div key={cat} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: text, marginBottom: 4 }}>
                      <span>{cat}</span>
                      <span style={{ color: muted }}>{count}</span>
                    </div>
                    <div style={{ height: 6, background: darkMode ? '#111520' : '#f0f4f8', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(count / maxCat) * 100}%`, background: G.green, borderRadius: 3 }} />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 14, fontFamily: 'Georgia,serif' }}>🏆 Top 5 Articles by Views</div>
              {topPosts.length === 0 ? (
                <div style={{ fontSize: 13, color: muted }}>No articles yet.</div>
              ) : (
                topPosts.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: i < topPosts.length - 1 ? `1px solid ${border}` : 'none' }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: i < 2 ? G.gold : muted, minWidth: 20 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: muted }}>{p.category}</div>
                    </div>
                    <span style={{ fontSize: 12, color: G.green, fontWeight: 700, flexShrink: 0 }}>👁 {(p.views || 0).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'new' && (
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 20, fontFamily: 'Georgia,serif' }}>
            {editId ? '✏️ Edit Article' : '✍️ Write New Article'}
          </div>

          <label style={{ fontSize: 13, fontWeight: 600, color: muted, display: 'block', marginBottom: 6 }}>Article Title *</label>
          <input
            type="text"
            placeholder="Enter a compelling headline..."
            style={{ ...inp, fontSize: 16, fontWeight: 600 }}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: muted, display: 'block', marginBottom: 6 }}>Category *</label>
              <select style={inp} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: muted, display: 'block', marginBottom: 6 }}>Article Icon</label>
              <select
                style={inp}
                value={form.image.startsWith('http') ? 'url' : form.image}
                onChange={(e) => {
                  if (e.target.value !== 'url') setForm((f) => ({ ...f, image: e.target.value }));
                }}
              >
                <option value="url">🔗 Use Image URL (paste below)</option>
                {EMOJIS.map((e) => (
                  <option key={e} value={e}>
                    {e} {e}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <input
            type="text"
            placeholder="Paste image URL from Cloudinary or elsewhere..."
            style={{ ...inp, marginTop: -8 }}
            value={form.image.startsWith('http') ? form.image : ''}
            onChange={(e) => setForm((f) => ({ ...f, image: e.target.value || '📰' }))}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: -8, marginBottom: 12 }}>
            <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            <button
              type="button"
              onClick={() => imgInputRef.current?.click()}
              disabled={uploadingImage}
              style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: uploadingImage ? 'not-allowed' : 'pointer' }}
            >
              {uploadingImage ? '⏳ Uploading…' : '☁️ Upload to Cloudinary'}
            </button>
            <span style={{ fontSize: 11, color: muted }}>auto-compressed · uploads to Cloudinary CDN · or paste a URL above</span>
          </div>
          <div style={{ background: darkMode ? '#111827' : '#f3f7f5', border: `1px solid ${border}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 5 }}>✨ AI Editorial Image Generator</div>
            <div style={{ fontSize: 12, color: muted, marginBottom: 10 }}>
              Generate an image from your article automatically, or describe the exact visual you want below. Uses Cloudflare Workers AI and saves the result to Cloudinary.
            </div>
            <label style={{ fontSize: 12, fontWeight: 700, color: muted, display: 'block', marginBottom: 6 }}>Your image prompt (optional)</label>
            <textarea
              value={articleImagePrompt}
              onChange={(e) => setArticleImagePrompt(e.target.value)}
              placeholder="Example: A wide editorial illustration of a busy Lagos market at sunrise, traders arranging fresh produce, warm natural light, professional news photography style..."
              maxLength={1000}
              rows={3}
              style={{ ...inp, minHeight: 76, resize: 'vertical', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleGenerateManualArticleImage}
                disabled={generatingArticleImage}
                style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: generatingArticleImage ? 'not-allowed' : 'pointer', opacity: generatingArticleImage ? 0.7 : 1 }}
              >
                {generatingArticleImage ? '⏳ Generating image…' : articleImagePrompt.trim() ? '🎨 Generate from My Prompt' : '✨ Generate from Article'}
              </button>
              <button
                type="button"
                onClick={() => setArticleImagePrompt('')}
                disabled={!articleImagePrompt || generatingArticleImage}
                style={{ background: 'none', color: muted, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 12px', fontSize: 12, cursor: !articleImagePrompt || generatingArticleImage ? 'not-allowed' : 'pointer' }}
              >
                Clear prompt
              </button>
              <span style={{ fontSize: 11, color: muted }}>Free daily allocation applies; generation may be limited by Cloudflare usage.</span>
            </div>
          </div>
          {form.image.startsWith('http') && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.image}
              alt="Article featured image preview"
              style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: muted, display: 'block', marginBottom: 6 }}>Author Name</label>
              <input type="text" placeholder="e.g. Chidi Okonkwo" style={inp} value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: muted, display: 'block', marginBottom: 6 }}>Read Time</label>
              <select style={inp} value={form.read_time} onChange={(e) => setForm((f) => ({ ...f, read_time: e.target.value }))}>
                {['1 min', '2 min', '3 min', '4 min', '5 min', '6 min', '7 min', '8 min', '10 min'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label style={{ fontSize: 13, fontWeight: 600, color: muted, display: 'block', marginBottom: 6 }}>
            Short Summary / Excerpt * <span style={{ fontWeight: 400 }}>(shown on homepage cards)</span>
          </label>
          <textarea
            placeholder="Write a 1-2 sentence summary of the article that will appear on the homepage..."
            style={{ ...inp, minHeight: 80, resize: 'vertical' }}
            value={form.excerpt}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
          />

          <label style={{ fontSize: 13, fontWeight: 600, color: muted, display: 'block', marginBottom: 6 }}>
            Full Article Content * <span style={{ fontWeight: 400 }}>(formatted text — use the toolbar, or &lt;/&gt; HTML to edit the code)</span>
          </label>
          <RichTextEditor key={editId || 'new'} value={form.content} onChange={(html) => setForm((f) => ({ ...f, content: html }))} />

          <label style={{ fontSize: 13, fontWeight: 600, color: muted, display: 'block', marginBottom: 6 }}>
            Tags <span style={{ fontWeight: 400 }}>(comma-separated — helps with related articles &amp; discovery)</span>
          </label>
          <input type="text" placeholder="e.g. davido, afrobeats, world cup" style={inp} value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />

          <label style={{ fontSize: 13, fontWeight: 600, color: muted, display: 'block', marginBottom: 6 }}>
            🗳️ Poll <span style={{ fontWeight: 400 }}>(optional — leave blank for no poll)</span>
          </label>
          <input
            type="text"
            placeholder="Poll question, e.g. Should Davido take a political break?"
            style={inp}
            value={form.pollQuestion}
            onChange={(e) => setForm((f) => ({ ...f, pollQuestion: e.target.value }))}
          />
          {form.pollOptions.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                placeholder={`Option ${i + 1}`}
                style={{ ...inp, marginBottom: 0, flex: 1 }}
                value={opt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pollOptions: f.pollOptions.map((o, oi) => (oi === i ? e.target.value : o)) }))
                }
              />
              {form.pollOptions.length > 2 && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, pollOptions: f.pollOptions.filter((_, oi) => oi !== i) }))}
                  style={{ background: 'none', border: `1px solid ${G.red}`, color: G.red, borderRadius: 8, padding: '0 14px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {form.pollOptions.length < 6 && (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, pollOptions: [...f.pollOptions, ''] }))}
              style={{ background: 'none', border: `1px solid ${border}`, color: muted, borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer', marginBottom: 16 }}
            >
              + Add Option
            </button>
          )}

          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            {(
              [
                ['breaking', '🔴 Breaking News', G.red],
                ['hot', '🔥 Hot / Trending', G.gold],
                ['featured', '⭐ Featured (Carousel)', G.green],
                ['sponsored', '💰 Sponsored Post', '#a855f7'],
              ] as const
            ).map(([key, label, color]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: text }}>
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: color }}
                />
                {label}
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              style={{
                background: 'transparent',
                color: text,
                border: `1px solid ${border}`,
                borderRadius: 10,
                padding: '14px 22px',
                fontSize: 14,
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                flex: 1,
                opacity: saving ? 0.7 : 1,
              }}
            >
              📝 Save as Draft
            </button>
            {!isWriter && <button
              onClick={() => handleSave(true)}
              disabled={saving}
              style={{
                background: G.green,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '14px 22px',
                fontSize: 16,
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                flex: 2,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : editId ? '✅ Update & Publish' : '🚀 Publish Article Now'}
            </button>}
          </div>
        </div>
      )}

      {activeSection === 'manage' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: text, fontFamily: 'Georgia,serif' }}>📋 Manage Articles ({visibleManagePosts.length} of {posts.length})</div>
            <button onClick={loadPosts} style={{ background: 'none', border: `1px solid ${border}`, color: muted, borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
              🔄 Refresh
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <input
              type="search"
              value={articleSearch}
              onChange={(event) => setArticleSearch(event.target.value)}
              placeholder="Search by article title, category or author…"
              style={{ flex: '1 1 240px', minWidth: 180, padding: '10px 12px', borderRadius: 8, border: `1px solid ${border}`, background: card, color: text, fontSize: 13, outline: 'none' }}
            />
            <select
              value={articleStatusFilter}
              onChange={(event) => { setArticleStatusFilter(event.target.value as 'all' | 'published' | 'unpublished'); setSelectedPosts([]); }}
              aria-label="Filter articles by publication status"
              style={{ flex: '0 1 210px', minWidth: 170, padding: '10px 12px', borderRadius: 8, border: `1px solid ${border}`, background: card, color: text, fontSize: 13, cursor: 'pointer' }}
            >
              <option value="all">All articles</option>
              <option value="published">Published</option>
              <option value="unpublished">Draft / Unpublished</option>
            </select>
          </div>

          {!isWriter && visibleManagePosts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap', background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: text, cursor: 'pointer' }}>
                <input type="checkbox" checked={visibleManagePosts.length > 0 && visibleManagePosts.every((post) => selectedPosts.includes(post.id))} onChange={toggleSelectAll} style={{ width: 16, height: 16, accentColor: G.green }} />
                {selectedPosts.length > 0 ? `${selectedPosts.length} selected` : 'Select all'}
              </label>
              {selectedPosts.length > 0 && (
                <>
                  <button onClick={() => handleBulkToggle('published', true)} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: `1px solid ${G.green}`, color: G.green, background: 'none', cursor: 'pointer' }}>
                    ✅ Publish
                  </button>
                  <button onClick={() => handleBulkToggle('published', false)} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: `1px solid ${muted}`, color: muted, background: 'none', cursor: 'pointer' }}>
                    🚫 Unpublish
                  </button>
                  <button onClick={() => handleBulkToggle('featured', true)} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '1px solid #A29BFE', color: '#A29BFE', background: 'none', cursor: 'pointer' }}>
                    ⭐ Feature
                  </button>
                  <button onClick={() => handleBulkToggle('featured', false)} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: `1px solid ${muted}`, color: muted, background: 'none', cursor: 'pointer' }}>
                    ☆ Unfeature
                  </button>
                  <button onClick={handleBulkDelete} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: `1px solid ${G.red}`, color: G.red, background: 'none', cursor: 'pointer' }}>
                    🗑 Delete Selected
                  </button>
                </>
              )}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: muted }}>Loading articles…</div>
          ) : visibleManagePosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: muted }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <div style={{ fontSize: 16, marginBottom: 8 }}>{posts.length === 0 ? 'No articles yet' : 'No articles match this filter'}</div>
              <div style={{ fontSize: 13, marginBottom: 20 }}>{posts.length === 0 ? 'Click “Write New Article” to publish your first story' : 'Try another publication status or search term.'}</div>
              {posts.length === 0 && <button onClick={() => setActiveSection('new')} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, cursor: 'pointer' }}>Write First Article</button>}
            </div>
          ) : (
            visibleManagePosts.map((post) => (
              <div
                key={post.id}
                style={{
                  background: card,
                  border: `1px solid ${selectedPosts.includes(post.id) ? G.green : border}`,
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 10,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                }}
              >
                {!isWriter && <input
                  type="checkbox"
                  checked={selectedPosts.includes(post.id)}
                  onChange={() => togglePostSelect(post.id)}
                  style={{ width: 16, height: 16, accentColor: G.green, marginTop: 4, flexShrink: 0 }}
                />}
                <div style={{ width: 56, height: 56, borderRadius: 8, background: darkMode ? '#1e2535' : '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, overflow: 'hidden' }}>
                  {post.image && post.image.startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.image} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    post.image || '📰'
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 5, flexWrap: 'wrap' }}>
                    <span style={{ background: G.green + '22', color: G.green, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>{post.category}</span>
                    {post.breaking && <span style={{ background: G.red, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3 }}>BREAKING</span>}
                    {post.hot && <span style={{ background: G.gold, color: '#000', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3 }}>🔥</span>}
                    {post.featured && <span style={{ background: '#A29BFE22', color: '#A29BFE', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3 }}>FEATURED</span>}
                    {post.published === false && <span style={{ background: muted + '33', color: muted, fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3 }}>UNPUBLISHED</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: text, lineHeight: 1.4, marginBottom: 4, fontFamily: 'Georgia,serif' }}>{post.title}</div>
                  <div style={{ fontSize: 11, color: muted }}>
                    ✍️ {post.author} · 📅 {new Date(post.created_at).toLocaleDateString('en-NG')} · 👁 {post.views || 0} views
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => handleEdit(post)} style={{ background: G.green + '22', color: G.green, border: `1px solid ${G.green}33`, borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    ✏️ Edit
                  </button>
                  {!isWriter && (deleteConfirm === post.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => handleDelete(post.id)} style={{ background: G.red, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Delete
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ background: 'none', color: muted, border: `1px solid ${border}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(post.id)} style={{ background: G.red + '22', color: G.red, border: `1px solid ${G.red}33`, borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      🗑️ Delete
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isAdmin && activeSection === 'moderators' && (
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 16 }}>🛡️ Moderator Management</div>

          {isAdmin && modRequests.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: G.gold, marginBottom: 12 }}>⚠️ Pending Moderator Requests ({modRequests.length})</div>
              {modRequests.map((req) => (
                <div key={req.id} style={{ background: card, border: `1px solid ${G.gold}`, borderRadius: 10, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: text }}>👤 {req.username}</div>
                    <div style={{ fontSize: 12, color: muted }}>{req.email} · Requested {new Date(req.requested_at).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={async () => {
                        await saveModerators([...moderators, req.email]);
                        await supabase.from('mod_requests').delete().eq('id', req.id);
                        setModRequests((r) => r.filter((x) => x.id !== req.id));
                        showToast(`${req.username} is now a moderator! 🛡️`);
                      }}
                      style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={async () => {
                        await supabase.from('mod_requests').delete().eq('id', req.id);
                        setModRequests((r) => r.filter((x) => x.id !== req.id));
                        showToast('Request declined.');
                      }}
                      style={{ background: G.red, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ❌ Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 12 }}>➕ Add Moderator by Email</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input type="email" placeholder="Enter user email address…" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} style={{ ...inp, flex: 1, margin: 0, minWidth: 200 }} />
              <button
                onClick={() => {
                  if (!addEmail || !addEmail.includes('@')) {
                    showToast('Enter a valid email');
                    return;
                  }
                  if (addEmail === userEmail) {
                    showToast("You're already the admin!");
                    return;
                  }
                  if (moderators.includes(addEmail)) {
                    showToast('Already a moderator');
                    return;
                  }
                  saveModerators([...moderators, addEmail]);
                  setAddEmail('');
                  showToast(`${addEmail} added as moderator! 🛡️`);
                }}
                style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                + Add
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 12 }}>🛡️ Active Moderators ({moderators.length})</div>
            {moderators.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: muted }}>No moderators yet. Add one above{isAdmin ? ' or approve a request' : ''}.</div>
            ) : (
              moderators.map((email) => (
                <div key={email} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 14, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>🛡️</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: text }}>{email}</div>
                      <div style={{ fontSize: 11, color: muted }}>Moderator · Can approve posts, manage forum &amp; jobs</div>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        saveModerators(moderators.filter((m) => m !== email));
                        showToast('Moderator removed.');
                      }}
                      style={{ background: G.red + '22', border: `1px solid ${G.red}`, color: G.red, borderRadius: 8, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {canModerate && activeSection === 'reports' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: text }}>🚩 Reported Content</div>
              <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>{reports.length} pending report(s)</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={loadReports} disabled={loadingReports} style={{ background: 'none', color: text, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px', cursor: loadingReports ? 'not-allowed' : 'pointer' }}>
                ↻ Refresh
              </button>
              <button onClick={exportReports} disabled={filteredReports.length === 0} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: filteredReports.length === 0 ? 'not-allowed' : 'pointer', opacity: filteredReports.length === 0 ? 0.5 : 1 }}>
                ↓ Export CSV
              </button>
            </div>
          </div>
          <input
            type="search"
            value={reportSearch}
            onChange={(event) => setReportSearch(event.target.value)}
            placeholder="Search reason, reporter, thread title or content type…"
            style={{ ...inp, marginBottom: 16 }}
          />
          {loadingReports ? (
            <div style={{ textAlign: 'center', padding: 40, color: muted }}>⏳ Loading reports…</div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: muted }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16 }}>No reports to review.</div>
            </div>
          ) : (
            filteredReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: muted }}>No reports match your search.</div>
            ) : filteredReports.map((report) => {
              const thread = forumThreads.find((t) => t.id === report.thread_id);
              return (
                <div key={report.id} style={{ background: card, border: `1px solid ${G.red}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ background: G.red + '22', color: G.red, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>
                      {report.target_type === 'thread' ? 'THREAD' : 'REPLY'}
                    </span>
                    <span style={{ background: G.gold + '22', color: G.gold, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>{report.reason}</span>
                  </div>
                  <div style={{ fontSize: 13, color: text, marginBottom: 6 }}>Thread: {thread ? thread.title : `#${report.thread_id}`}</div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>
                    Reported by {report.reported_by} · {new Date(report.created_at).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => handleDeleteReported(report)} style={{ background: G.red, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      🗑 Delete {report.target_type === 'thread' ? 'Thread' : 'Reply'}
                    </button>
                    <button onClick={() => handleResolveReport(report.id)} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      ✅ Dismiss
                    </button>
                    {report.target_type === 'thread' && thread?.author_email && (
                      <button
                        onClick={() => handleBanFromReport(thread.author_email ?? undefined)}
                        style={{ background: 'none', color: G.red, border: `1px solid ${G.red}`, borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                      >
                        🚫 Ban {thread.author}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {(isAdmin || isEditor) && activeSection === 'story-tips' && <StorySubmissionsPanel />}
      {isAdmin && activeSection === 'ai-newsroom' && <AINewsroomMonitor />
      {isAdmin && activeSection === 'breaking' && <BreakingNewsManager />}
      {isAdmin && activeSection === 'jobs' && <JobsScholarshipsManager />}
      {canModerate && activeSection === 'forum' && <ForumManager />}
      {isAdmin && activeSection === 'trends' && <TrendManagerPanel />}
      {isAdmin && activeSection === 'dataplans' && <DataPlansManagerPanel />}
      {isAdmin && activeSection === 'fuel' && <FuelPriceManagerPanel />}
      {isAdmin && activeSection === 'social' && <SocialLinksManagerPanel />}
      {isAdmin && activeSection === 'products' && <ProductsManagerPanel />}
      {isAdmin && activeSection === 'fixtures' && <FixturesManagerPanel />}
      {isAdmin && activeSection === 'polls' && <PollAnalyticsPanel />}
      {isAdmin && activeSection === 'team' && <EditorialTeamPanel />}
      {isAdmin && activeSection === 'authors' && <AuthorProfilesPanel />}
      {isAdmin && activeSection === 'users' && <UserManagementPanel />}
      {isAdmin && activeSection === 'tools' && <AdminToolsHub isAdmin={isAdmin} />}
      {isAdmin && activeSection === 'sitemap' && <SitemapPanel />}
    </div>
  );
}
