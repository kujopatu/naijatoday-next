'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

export default function ContactForm() {
  const { card, border, text, darkMode } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: darkMode ? '#111520' : '#f7fbf9',
    color: text,
    fontSize: 14,
    marginBottom: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Georgia,serif',
  };

  const handleSend = async () => {
    if (!name || !email || !message) {
      setStatus('Please fill in all required fields');
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([{ name, email, subject, message, sent_at: new Date().toISOString() }]);
      if (error) throw error;
      setStatus("Message sent! We'll get back to you soon 🎉");
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      setStatus('Please email us directly at kujopatu@gmail.com');
    }
    setSending(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 16px', fontFamily: 'Georgia,serif' }}>
      <div style={{ background: card, borderRadius: 16, padding: 32, border: `1px solid ${border}` }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: text, marginBottom: 8 }}>Contact Us</h1>
        <p style={{ fontSize: 14, color: '#8892a4', marginBottom: 32 }}>
          Have a story tip, partnership inquiry, or feedback? We&apos;d love to hear from you.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}
        >
          {[
            ['📧', 'Email Us', 'kujopatu@gmail.com'],
            ['📍', 'Location', 'Ikotun, Lagos, Nigeria'],
            ['⏰', 'Response Time', 'Within 24–48 hours'],
          ].map(([icon, label, val]) => (
            <div
              key={label}
              style={{
                background: darkMode ? '#111520' : '#f7fbf9',
                borderRadius: 10,
                padding: 16,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, color: G.green }}>{val}</div>
            </div>
          ))}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 20 }}>Send Us a Message</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input
            type="text"
            placeholder="Your Name *"
            style={inp}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Your Email *"
            style={inp}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <input
          type="text"
          placeholder="Subject"
          style={inp}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          placeholder="Your message *"
          style={{ ...inp, minHeight: 140, resize: 'vertical' }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {status && <div style={{ fontSize: 13, color: G.green, marginBottom: 14 }}>{status}</div>}
        <button
          onClick={handleSend}
          disabled={sending}
          style={{
            background: G.green,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '13px 32px',
            fontSize: 15,
            fontWeight: 700,
            cursor: sending ? 'not-allowed' : 'pointer',
            opacity: sending ? 0.7 : 1,
            width: '100%',
          }}
        >
          {sending ? 'Sending…' : 'Send Message 📨'}
        </button>
        <div style={{ borderTop: `1px solid ${border}`, paddingTop: 20, marginTop: 24 }}>
          <p style={{ fontSize: 12, color: '#555' }}>© 2026 NaijaToday Media Limited. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
