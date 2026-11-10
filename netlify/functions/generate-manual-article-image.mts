import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'kujopatu@gmail.com';
const CLOUDINARY_CLOUD = 'dywtb9ky3';
const CLOUDINARY_PRESET = 'naijatorday_upload';

export default async function generateManualArticleImage(request: Request) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!url || !anon || !cloudflareAccountId || !cloudflareApiToken) {
    return Response.json({ error: 'Image generation is not configured.' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return Response.json({ error: 'Admin access required.' }, { status: 401 });

  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || data.user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return Response.json({ error: 'Admin access required.' }, { status: 403 });
  }

  let body: { title?: string; excerpt?: string; content?: string; category?: string; custom_prompt?: string };
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }

  const title = String(body.title || '').trim().slice(0, 240);
  const excerpt = String(body.excerpt || '').trim().slice(0, 250);
  const content = String(body.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 250);
  const category = String(body.category || 'Nigeria').trim().slice(0, 80);
  const customPrompt = String(body.custom_prompt || '').trim().slice(0, 800);
  if (!title && !customPrompt) return Response.json({ error: 'Enter an article headline or a custom image prompt.' }, { status: 400 });

  try {
    const prompt = [
      'Create one premium editorial cover image for NaijaToday, a Nigerian digital news publication.',
      'Landscape 16:9 composition for a professional news article hero image. Original, compelling, polished editorial photography or illustration.',
      'Use generic, non-identifiable people only when needed. Do not imitate real identifiable people, politicians, celebrities, journalists, or copyrighted characters.',
      'No text, headlines, captions, logos, watermarks, fake newspaper layouts, graphic violence, injury, or weapons. Keep the image dignified and suitable for a general audience.',
      'Category: ' + category,
      title ? 'Headline: ' + title : '',
      excerpt ? 'Summary: ' + excerpt : '',
      customPrompt ? 'EDITOR IMAGE DIRECTION (follow this visual direction while keeping the image editorially appropriate): ' + customPrompt : '',
      content ? 'Article context: ' + content : '',
    ].filter(Boolean).join('\n').slice(0, 1950);

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cloudflareAccountId)}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cloudflareApiToken}` },
      body: JSON.stringify({ prompt, steps: 4 }),
      signal: AbortSignal.timeout(180000),
    });
    if (!response.ok) {
      const details = (await response.text()).replace(/\s+/g, ' ').slice(0, 700);
      return Response.json({ error: `Cloudflare image generation returned HTTP ${response.status}: ${details}` }, { status: 502 });
    }

    const result = await response.json();
    const imageBase64 = result?.result?.image || result?.image;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return Response.json({ error: 'Cloudflare did not return an image. Check model access and free daily allocation.' }, { status: 502 });
    }

    const bytes = Buffer.from(imageBase64, 'base64');
    const uploadForm = new FormData();
    uploadForm.append('file', new Blob([Uint8Array.from(bytes)], { type: 'image/jpeg' }), 'naijatoday-manual-editorial.jpg');
    uploadForm.append('upload_preset', CLOUDINARY_PRESET);
    uploadForm.append('folder', 'naijatorday/articles/ai-generated');
    const upload = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
      method: 'POST', body: uploadForm, signal: AbortSignal.timeout(60000),
    });
    const uploaded = await upload.json();
    if (!upload.ok || !uploaded.secure_url) {
      throw new Error(uploaded.error?.message || 'Cloudinary could not store the generated image.');
    }

    return Response.json({ image_url: uploaded.secure_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image generation failed.';
    console.error('Manual article image generation failed:', message);
    return Response.json({ error: message.slice(0, 800) }, { status: 500 });
  }
}
