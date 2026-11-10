'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { G } from '@/lib/theme';
import { useTheme } from '../ThemeProvider';

type Campaign = {
  id: string;
  campaign_name: string;
  advertiser_name: string;
  placement: string;
  status: string;
  amount_ngn: number | string;
  start_date: string | null;
  end_date: string | null;
  target_url: string | null;
  notes: string | null;
  created_at: string;
};

type CampaignForm = {
  campaign_name: string;
  advertiser_name: string;
  placement: string;
  status: string;
  amount_ngn: string;
  start_date: string;
  end_date: string;
  target_url: string;
  notes: string;
};

const blank: CampaignForm = {
  campaign_name: '',
  advertiser_name: '',
  placement: 'Homepage banner',
  status: 'prospect',
  amount_ngn: '',
  start_date: '',
  end_date: '',
  target_url: '',
  notes: '',
};

const statuses = ['prospect', 'booked', 'live', 'completed', 'invoiced', 'paid', 'cancelled'];
const placements = ['Homepage banner', 'Article page banner', 'Category page banner', 'Sponsored article', 'Newsletter', 'Social media', 'Other'];

const money = (value: number | string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value) || 0);

export default function AdvertisingManager() {
  const { card, border, text, muted, darkMode } = useTheme();
  const [items, setItems] = useState<Campaign[]>([]);
  const [form, setForm] = useState<CampaignForm>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');

  const field: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${border}`, background: darkMode ? '#111520' : '#f7f8fa',
    color: text, fontSize: 13, boxSizing: 'border-box',
  };
  const label: React.CSSProperties = { display: 'block', color: muted, fontSize: 11, fontWeight: 700, marginBottom: 5 };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ad_campaigns').select('*').order('created_at', { ascending: false });
    if (error) setMessage('Could not load campaigns: ' + error.message);
    else setItems((data || []) as Campaign[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (key: keyof CampaignForm, value: string) => setForm((old) => ({ ...old, [key]: value }));

  const edit = (item: Campaign) => {
    setEditing(item.id);
    setForm({
      campaign_name: item.campaign_name,
      advertiser_name: item.advertiser_name,
      placement: item.placement,
      status: item.status,
      amount_ngn: String(item.amount_ngn ?? ''),
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      target_url: item.target_url || '',
      notes: item.notes || '',
    });
    setMessage('');
  };

  const reset = () => { setEditing(null); setForm(blank); };

  const save = async () => {
    if (!form.campaign_name.trim() || !form.advertiser_name.trim()) {
      setMessage('Enter both the campaign name and advertiser.');
      return;
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setMessage('The end date cannot be earlier than the start date.');
      return;
    }
    setSaving(true);
    setMessage('');
    const payload = {
      campaign_name: form.campaign_name.trim(),
      advertiser_name: form.advertiser_name.trim(),
      placement: form.placement,
      status: form.status,
      amount_ngn: Number(form.amount_ngn) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      target_url: form.target_url.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const result = editing
      ? await supabase.from('ad_campaigns').update(payload).eq('id', editing)
      : await supabase.from('ad_campaigns').insert(payload);
    if (result.error) setMessage('Save failed: ' + result.error.message);
    else { setMessage(editing ? 'Campaign updated.' : 'Campaign added.'); reset(); await load(); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this advertising campaign record?')) return;
    const { error } = await supabase.from('ad_campaigns').delete().eq('id', id);
    if (error) setMessage('Delete failed: ' + error.message);
    else { setMessage('Campaign deleted.'); await load(); }
  };

  const visible = filter === 'all' ? items : items.filter((item) => item.status === filter);
  const bookedValue = items.filter((x) => ['booked', 'live', 'completed', 'invoiced', 'paid'].includes(x.status)).reduce((sum, x) => sum + Number(x.amount_ngn || 0), 0);
  const receivedValue = items.filter((x) => x.status === 'paid').reduce((sum, x) => sum + Number(x.amount_ngn || 0), 0);
  const outstandingValue = items.filter((x) => ['booked', 'live', 'completed', 'invoiced'].includes(x.status)).reduce((sum, x) => sum + Number(x.amount_ngn || 0), 0);

  const statusColor = (status: string) => status === 'paid' ? G.green : status === 'cancelled' ? G.red : status === 'live' ? '#2563eb' : muted;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: text, fontWeight: 800, fontSize: 17 }}>💼 Advertising & Revenue</div>
        <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>Track direct advertisers, sponsored placements, campaign dates and payments. These records do not publish adverts to the website.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 10, marginBottom: 20 }}>
        {[
          ['Campaigns', String(items.length)],
          ['Booked value', money(bookedValue)],
          ['Paid', money(receivedValue)],
          ['Outstanding', money(outstandingValue)],
        ].map(([name, value]) => (
          <div key={name} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 13 }}>
            <div style={{ color: muted, fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>{name}</div>
            <div style={{ color: text, fontSize: 19, fontWeight: 800, marginTop: 5 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 16, marginBottom: 18 }}>
        <div style={{ color: text, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{editing ? 'Edit campaign' : 'Add advertising campaign'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
          <label><span style={label}>Campaign name *</span><input style={field} value={form.campaign_name} onChange={(e) => update('campaign_name', e.target.value)} placeholder="e.g. December brand campaign" /></label>
          <label><span style={label}>Advertiser *</span><input style={field} value={form.advertiser_name} onChange={(e) => update('advertiser_name', e.target.value)} placeholder="Company or client" /></label>
          <label><span style={label}>Placement</span><select style={field} value={form.placement} onChange={(e) => update('placement', e.target.value)}>{placements.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label><span style={label}>Status</span><select style={field} value={form.status} onChange={(e) => update('status', e.target.value)}>{statuses.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></label>
          <label><span style={label}>Agreed amount (₦)</span><input style={field} type="number" min="0" value={form.amount_ngn} onChange={(e) => update('amount_ngn', e.target.value)} placeholder="0" /></label>
          <label><span style={label}>Start date</span><input style={field} type="date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} /></label>
          <label><span style={label}>End date</span><input style={field} type="date" value={form.end_date} onChange={(e) => update('end_date', e.target.value)} /></label>
          <label><span style={label}>Advertiser / campaign URL</span><input style={field} type="url" value={form.target_url} onChange={(e) => update('target_url', e.target.value)} placeholder="https://" /></label>
        </div>
        <label style={{ display: 'block', marginTop: 10 }}><span style={label}>Notes / invoice reference</span><textarea style={{ ...field, minHeight: 72, resize: 'vertical' }} value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Contact details, invoice reference, payment notes…" /></label>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={save} disabled={saving} style={{ background: G.green, color: '#fff', border: 0, borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'Saving…' : editing ? 'Save changes' : '+ Add campaign'}</button>
          {editing && <button onClick={reset} style={{ background: 'none', color: muted, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 16px', cursor: 'pointer' }}>Cancel</button>}
        </div>
        {message && <div style={{ color: message.toLowerCase().includes('failed') || message.toLowerCase().includes('could not') ? G.red : G.green, fontSize: 12, marginTop: 10 }}>{message}</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ color: text, fontWeight: 700, fontSize: 14 }}>Campaign register</div>
        <select aria-label="Filter campaigns" style={{ ...field, width: 'auto', minWidth: 150 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All campaigns</option>
          {statuses.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>
      {loading ? <div style={{ color: muted, padding: 24, textAlign: 'center' }}>Loading campaigns…</div> :
        visible.length === 0 ? <div style={{ color: muted, padding: 28, textAlign: 'center', border: `1px dashed ${border}`, borderRadius: 10 }}>No campaigns in this view yet.</div> :
        <div style={{ display: 'grid', gap: 9 }}>
          {visible.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 13 }}>
              <div style={{ minWidth: 190, flex: 1 }}>
                <div style={{ color: text, fontSize: 14, fontWeight: 700 }}>{item.campaign_name}</div>
                <div style={{ color: muted, fontSize: 12, marginTop: 3 }}>{item.advertiser_name} · {item.placement}</div>
                <div style={{ color: muted, fontSize: 11, marginTop: 5 }}>{item.start_date || 'No start date'} – {item.end_date || 'No end date'} · {money(item.amount_ngn)}</div>
                {item.notes && <div style={{ color: muted, fontSize: 11, marginTop: 5 }}>{item.notes}</div>}
                {item.target_url && <a href={item.target_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: 11, display: 'inline-block', marginTop: 5 }}>Open campaign URL ↗</a>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ color: statusColor(item.status), border: `1px solid ${statusColor(item.status)}66`, borderRadius: 20, padding: '4px 8px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{item.status}</span>
                <button onClick={() => edit(item)} style={{ color: text, background: 'none', border: `1px solid ${border}`, borderRadius: 7, padding: '6px 9px', cursor: 'pointer', fontSize: 11 }}>Edit</button>
                <button onClick={() => remove(item.id)} style={{ color: G.red, background: 'none', border: `1px solid ${G.red}66`, borderRadius: 7, padding: '6px 9px', cursor: 'pointer', fontSize: 11 }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
