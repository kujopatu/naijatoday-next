'use client';

import { useMemo, useState } from 'react';
import { ForumThread } from '@/lib/forum';
import { CATEGORIES, G } from '@/lib/theme';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

export default function ForumList({ threads: allThreads }: { threads: ForumThread[] }) {
  const { card, border, text, muted, darkMode } = useTheme();
  const { loggedIn, openModal } = useAuth();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const sorted = useMemo(
    () => [...allThreads].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)),
    [allThreads]
  );
  const catFiltered = filter === 'All' ? sorted : sorted.filter((t) => t.category === filter);
  const threads = search.trim()
    ? catFiltered.filter(
        (t) =>
          t.title?.toLowerCase().includes(search.toLowerCase()) ||
          t.preview?.toLowerCase().includes(search.toLowerCase()) ||
          t.author?.toLowerCase().includes(search.toLowerCase())
      )
    : catFiltered;

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          [String(allThreads.length), 'Threads'],
          [String(allThreads.reduce((s, t) => s + (t.replies || 0), 0)), 'Replies'],
        ].map(([n, l]) => (
          <div
            key={l}
            style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '16px 12px', textAlign: 'center' }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: G.green }}>{n}</div>
            <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase' }}>{l}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: G.gold + '22',
          border: `1px solid ${G.gold}`,
          borderRadius: 10,
          padding: '10px 16px',
          marginBottom: 16,
          fontSize: 13,
          color: G.gold,
          fontWeight: 600,
        }}
      >
        💬 Browsing is open to everyone. Sign in to save your spot — starting new threads is coming very soon.
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search discussions…"
          style={{
            width: '100%',
            padding: '10px 14px 10px 36px',
            borderRadius: 8,
            border: `1px solid ${border}`,
            background: darkMode ? '#111520' : '#f7fbf9',
            color: text,
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: muted }}>🔍</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['All', ...CATEGORIES.map((c) => c.name)].map((f) => {
            const cat = CATEGORIES.find((c) => c.name === f);
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: active ? cat?.color || G.green : 'none',
                  color: active ? '#fff' : muted,
                  border: `1px solid ${active ? cat?.color || G.green : border}`,
                  padding: '5px 12px',
                  borderRadius: 16,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {cat ? `${cat.icon} ${f}` : `🌐 ${f}`}
              </button>
            );
          })}
        </div>
        <button
          onClick={() =>
            loggedIn
              ? alert("Starting new threads is coming very soon — you're signed in and ready for it.")
              : openModal('login')
          }
          style={{
            background: G.green,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '9px 18px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          + New Thread
        </button>
      </div>

      {threads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: muted }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
          No discussions found{search ? ` for "${search}"` : ''}.
        </div>
      ) : (
        threads.map((thread) => (
          <div
            key={thread.id}
            style={{
              background: card,
              border: `1px solid ${thread.pinned ? G.gold : border}`,
              borderRadius: 10,
              padding: 16,
              marginBottom: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {thread.pinned && (
                    <span style={{ background: G.gold, color: '#000', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>
                      📌 PINNED
                    </span>
                  )}
                  {thread.closed && (
                    <span style={{ background: '#444', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>
                      🔒 CLOSED
                    </span>
                  )}
                  {thread.hot && (
                    <span style={{ background: G.gold, color: '#000', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>
                      🔥 HOT
                    </span>
                  )}
                  {thread.category && (
                    <span
                      style={{
                        background: (CATEGORIES.find((c) => c.name === thread.category)?.color || G.green) + '22',
                        color: CATEGORIES.find((c) => c.name === thread.category)?.color || G.green,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 4,
                      }}
                    >
                      {thread.category}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: thread.closed ? muted : text, marginBottom: 6, fontFamily: 'Georgia,serif' }}>
                  {thread.title}
                </div>
                <div style={{ fontSize: 13, color: muted, lineHeight: 1.5 }}>{thread.preview}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: muted, whiteSpace: 'nowrap', flexShrink: 0 }}>
                <div>👁 {thread.views}</div>
                <div style={{ marginTop: 4 }}>💬 {thread.replies}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11, color: muted, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>👤 {thread.author || 'Anonymous'}</span>
              <span>⏰ {timeAgo(thread.created_at)}</span>
              {typeof thread.upvotes === 'number' && thread.upvotes > 0 && <span>👍 {thread.upvotes}</span>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
