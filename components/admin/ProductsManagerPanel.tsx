'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/products';
import { G } from '@/lib/theme';
import { useToast } from '../ToastProvider';
import { useTheme } from '../ThemeProvider';

const CLOUDINARY_CLOUD = 'dywtb9ky3';
const CLOUDINARY_PRESET = 'naijatorday_upload';

type ProductForm = {
  title: string;
  short_description: string;
  full_description: string;
  price_naira: string;
  price_usd: string;
  cover_image: string;
  selar_link: string;
  gumroad_link: string;
  category: string;
  active: boolean;
  sort_order: string;
};
const emptyProduct: ProductForm = {
  title: '',
  short_description: '',
  full_description: '',
  price_naira: '',
  price_usd: '',
  cover_image: '',
  selar_link: '',
  gumroad_link: '',
  category: 'Business Templates',
  active: true,
  sort_order: '0',
};

export default function ProductsManagerPanel() {
  const { showToast } = useToast();
  const { card, border, text, muted, darkMode } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const imgInputRef = useRef<HTMLInputElement>(null);

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

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('products').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
      if (!error && data) setProducts(data as Product[]);
      else if (error) showToast('Error loading products: ' + error.message);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas empty'))), 'image/jpeg', 0.85);
        };
        img.onerror = reject;
        img.src = url;
      });
      const formData = new FormData();
      formData.append('file', compressed, 'product-cover.jpg');
      formData.append('upload_preset', CLOUDINARY_PRESET);
      formData.append('folder', 'naijatorday/products');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setForm((f) => ({ ...f, cover_image: data.secure_url }));
        showToast('Cover image uploaded! 🎉');
      } else {
        showToast('Upload failed — check Cloudinary preset.');
        console.error('Cloudinary error:', data);
      }
    } catch (err) {
      showToast('Upload error: ' + (err instanceof Error ? err.message : 'Connection error'));
    }
    setUploadingImage(false);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!form.title || !form.short_description) {
      showToast('Please fill in at least a title and short description');
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      short_description: form.short_description,
      full_description: form.full_description,
      price_naira: form.price_naira ? parseInt(form.price_naira, 10) : null,
      price_usd: form.price_usd ? parseFloat(form.price_usd) : null,
      cover_image: form.cover_image,
      selar_link: form.selar_link,
      gumroad_link: form.gumroad_link,
      category: form.category,
      active: form.active,
      sort_order: form.sort_order ? parseInt(form.sort_order, 10) : 0,
      updated_at: new Date().toISOString(),
    };
    try {
      if (editId !== null) {
        const { error } = await supabase.from('products').update(payload).eq('id', editId);
        if (error) {
          showToast('Error: ' + error.message);
          setSaving(false);
          return;
        }
        showToast('Product updated! ✅');
      } else {
        const { error } = await supabase.from('products').insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) {
          showToast('Error: ' + error.message);
          setSaving(false);
          return;
        }
        showToast('Product added! 🎉');
      }
      setForm(emptyProduct);
      setEditId(null);
      setShowForm(false);
      loadProducts();
    } catch {
      showToast('Connection error');
    }
    setSaving(false);
  };

  const handleEdit = (p: Product) => {
    setForm({
      title: p.title || '',
      short_description: p.short_description || '',
      full_description: p.full_description || '',
      price_naira: p.price_naira ? String(p.price_naira) : '',
      price_usd: p.price_usd ? String(p.price_usd) : '',
      cover_image: p.cover_image || '',
      selar_link: p.selar_link || '',
      gumroad_link: p.gumroad_link || '',
      category: p.category || 'Business Templates',
      active: p.active !== false,
      sort_order: p.sort_order ? String(p.sort_order) : '0',
    });
    setEditId(p.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      showToast('Delete failed: ' + error.message);
      return;
    }
    showToast('Product deleted');
    loadProducts();
  };

  const handleToggleActive = async (p: Product) => {
    const { error } = await supabase.from('products').update({ active: !p.active }).eq('id', p.id);
    if (error) {
      showToast('Error: ' + error.message);
      return;
    }
    loadProducts();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: text, fontFamily: 'Georgia,serif' }}>🛍️ Products / Resources Manager</div>
        <button
          onClick={() => {
            setShowForm((s) => !s);
            if (showForm) {
              setEditId(null);
              setForm(emptyProduct);
            }
          }}
          style={{ background: showForm ? 'none' : G.green, color: showForm ? text : '#fff', border: `1px solid ${showForm ? border : G.green}`, borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          {showForm ? '✕ Cancel' : '➕ Add New Product'}
        </button>
      </div>

      <div style={{ background: darkMode ? '#0d1520' : '#f0fdf4', border: `1px solid ${darkMode ? '#1a2a1a' : '#bbf7d0'}`, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: darkMode ? '#86efac' : '#166534' }}>
        💡 Each product appears automatically on your <b>/resources</b> page. Toggle &quot;Active&quot; to hide one without deleting it.
      </div>

      {showForm && (
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 14 }}>{editId !== null ? '✏️ Edit Product' : '➕ New Product'}</div>

          <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Product Title *</label>
          <input style={inp} placeholder="e.g. The Complete Nigerian Import/Export Guide" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />

          <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Short Description * (shown on cards)</label>
          <input style={inp} placeholder="One-line hook" value={form.short_description} onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))} />

          <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Full Description</label>
          <textarea style={{ ...inp, minHeight: 100, resize: 'vertical' }} placeholder="Longer description, features, who it's for..." value={form.full_description} onChange={(e) => setForm((f) => ({ ...f, full_description: e.target.value }))} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Price (₦)</label>
              <input style={inp} type="number" placeholder="5000" value={form.price_naira} onChange={(e) => setForm((f) => ({ ...f, price_naira: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Price ($)</label>
              <input style={inp} type="number" step="0.01" placeholder="7.00" value={form.price_usd} onChange={(e) => setForm((f) => ({ ...f, price_usd: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Category</label>
              <select style={inp} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {['Business Templates', 'Funding & Grants', 'Import & Export', 'Business Registration', 'Career & Freelance', 'Other'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Sort Order</label>
              <input style={inp} type="number" placeholder="0 = first" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
            </div>
          </div>

          <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Cover Image</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            <button
              type="button"
              disabled={uploadingImage}
              onClick={() => imgInputRef.current?.click()}
              style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: uploadingImage ? 'not-allowed' : 'pointer', opacity: uploadingImage ? 0.6 : 1 }}
            >
              {uploadingImage ? '⏳ Uploading…' : '📤 Upload Cover Image'}
            </button>
            {form.cover_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.cover_image} alt="cover preview" style={{ width: 60, height: 80, objectFit: 'cover', borderRadius: 6, border: `1px solid ${border}` }} />
            )}
          </div>
          <input style={inp} placeholder="...or paste an image URL directly" value={form.cover_image} onChange={(e) => setForm((f) => ({ ...f, cover_image: e.target.value }))} />

          <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Selar Link</label>
          <input style={inp} placeholder="https://selar.co/your-product" value={form.selar_link} onChange={(e) => setForm((f) => ({ ...f, selar_link: e.target.value }))} />

          <label style={{ fontSize: 11, color: muted, display: 'block', marginBottom: 4 }}>Gumroad Link</label>
          <input style={inp} placeholder="https://gumroad.com/l/your-product" value={form.gumroad_link} onChange={(e) => setForm((f) => ({ ...f, gumroad_link: e.target.value }))} />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: text, marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            Active (visible on the site)
          </label>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: G.green, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : editId !== null ? '💾 Update Product' : '🚀 Publish Product'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: muted }}>⏳ Loading products…</div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: muted }}>No products yet — click &quot;Add New Product&quot; to create your first one.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {products.map((p) => (
            <div key={p.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 14, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', opacity: p.active ? 1 : 0.5 }}>
              {p.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_image} alt={p.title} style={{ width: 50, height: 68, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 50, height: 68, borderRadius: 6, background: darkMode ? '#1a1f2b' : '#eef1f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📄</div>
              )}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: text }}>{p.title}</div>
                <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                  {p.category} {p.price_naira ? `· ₦${p.price_naira.toLocaleString()}` : ''} {p.price_usd ? `· $${p.price_usd}` : ''}
                </div>
                <div style={{ fontSize: 11, color: p.active ? G.green : G.red, marginTop: 2, fontWeight: 600 }}>{p.active ? '● Active' : '○ Hidden'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => handleToggleActive(p)} style={{ background: 'none', border: `1px solid ${border}`, color: text, borderRadius: 6, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>
                  {p.active ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => handleEdit(p)} style={{ background: 'none', border: `1px solid ${border}`, color: text, borderRadius: 6, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>
                  ✏️ Edit
                </button>
                <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: `1px solid ${G.red}`, color: G.red, borderRadius: 6, padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
