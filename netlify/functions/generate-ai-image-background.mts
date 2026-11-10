import { createClient } from '@supabase/supabase-js';

export const config = { background: true };

const ADMIN_EMAIL = 'kujopatu@gmail.com';
const CLOUDINARY_CLOUD = 'dywtb9ky3';
const CLOUDINARY_PRESET = 'naijatorday_upload';

export default async function generateAiImageBackground(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!url || !anon || !serviceKey || !geminiKey) {
    return new Response('Image generation is not configured. Check Supabase and Gemini environment variables.', { status: 500 });
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return new Response('Admin access required.', { status: 401 });

  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || authData.user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return new Response('Admin access required.', { status: 403 });
  }

  let body: { item_id?: string; title?: string; excerpt?: string; content?: string; category?: string };
  try { body = await request.json(); } catch { return new Response('Invalid request.', { status: 400 }); }
  if (!body.item_id || !/^[0-9a-f-]{36}$/i.test(body.item_id)) return new Response('A valid story ID is required.', { status: 400 });

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const title = String(body.title || '').trim().slice(0, 240);
  const excerpt = String(body.excerpt || '').trim().slice(0, 600);
  const content = String(body.content || '').replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 2600);
  const category = String(body.category || 'Nigeria').trim().slice(0, 80);
  if (!title || !content) return new Response('A headline and article content are required.', { status: 400 });

  const { error: startError } = await db.from('ai_newsroom_items').update({
    image_generation_status: 'generating',
    image_generation_error: null,
    updated_at: new Date().toISOString(),
  }).eq('id', body.item_id);
  if (startError) return new Response('Could not update image-generation status.', { status: 500 });

  try {
    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
    const prompt = [
      'Create one premium editorial cover image for a Nigerian digital news publication called NaijaToday.',
      'Landscape 16:9 composition, suitable for a professional news website article hero image.',
      'Create an original, visually compelling scene that communicates the verified subject of the article.',
      'Use a documentary-inspired editorial illustration or realistic environmental scene with generic, non-identifiable people only when needed.',
      'Do not depict or imitate a real identifiable person, public figure, politician, celebrity, journalist, or copyrighted character.',
      'Do not include text, headlines, captions, logos, watermarks, or fake newspaper layouts.',
      'Avoid sensationalism, graphic violence, injury, weapons, and misleading visual claims. Keep the image neutral, dignified, and suitable for a general audience.',
      'Category: ' + category,
      'Headline: ' + title,
      'Summary: ' + excerpt,
      'Article context: ' + content,
    ].join('\\n');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9', imageSize: '1K' } },
      }),
      signal: AbortSignal.timeout(180000),
    });
    if (!response.ok) {
      const detail = (await response.text()).replace(/\\s+/g, ' ').slice(0, 300);
      if (response.status === 429) throw new Error('Gemini image quota is busy. Wait and try again.');
      if (response.status === 503) throw new Error('Gemini image generation is temporarily unavailable. Try again shortly.');
      throw new Error(`Gemini image generation returned HTTP ${response.status}: ${detail}`);
    }

    const result = await response.json();
    const parts = result?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part: any) => part.inlineData?.data);
    if (!imagePart?.inlineData?.data) throw new Error('Gemini did not return an image. Check image model access and quota.');

    const mimeType = imagePart.inlineData.mimeType || 'image/png';
    const bytes = Buffer.from(imagePart.inlineData.data, 'base64');
    const uploadForm = new FormData();
    uploadForm.append('file', new Blob([Uint8Array.from(bytes)], { type: mimeType }), 'naijatoday-editorial.png');
    uploadForm.append('upload_preset', CLOUDINARY_PRESET);
    uploadForm.append('folder', 'naijatorday/articles/ai-generated');
    const upload = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
      method: 'POST',
      body: uploadForm,
      signal: AbortSignal.timeout(60000),
    });
    const uploaded = await upload.json();
    if (!upload.ok || !uploaded.secure_url) throw new Error(uploaded.error?.message || 'Cloudinary could not store the generated image.');

    const { error: saveError } = await db.from('ai_newsroom_items').update({
      generated_image_url: uploaded.secure_url,
      image_generation_status: 'generated',
      image_generation_error: null,
      updated_at: new Date().toISOString(),
    }).eq('id', body.item_id);
    if (saveError) throw saveError;
    console.log(`NaijaToday AI image generated for newsroom item ${body.item_id}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 800) : 'Image generation failed.';
    console.error('NaijaToday AI image generation failed:', message);
    await db.from('ai_newsroom_items').update({
      image_generation_status: 'failed',
      image_generation_error: message,
      updated_at: new Date().toISOString(),
    }).eq('id', body.item_id);
  }
  return new Response(null, { status: 202 });
}
