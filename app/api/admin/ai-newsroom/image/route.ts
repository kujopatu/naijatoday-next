import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAIL } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  return !error && data.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'Gemini is not configured. Add GEMINI_API_KEY to Netlify and redeploy.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const title = String(body.title || '').trim().slice(0, 240);
    const excerpt = String(body.excerpt || '').trim().slice(0, 600);
    const content = String(body.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2600);
    const category = String(body.category || 'Nigeria').trim().slice(0, 80);
    if (!title || !content) {
      return NextResponse.json({ error: 'A headline and article content are required to create a matching image.' }, { status: 400 });
    }

    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
    const prompt = [
      'Create one premium editorial cover image for a Nigerian digital news publication called NaijaToday.',
      'Landscape 16:9 composition, suitable for a professional news website article hero image.',
      'Create an original, visually compelling scene that communicates the verified subject of the article.',
      'Use a documentary-inspired editorial illustration or realistic environmental scene with generic, non-identifiable people only when needed.',
      'Do not depict or imitate a real identifiable person, public figure, politician, celebrity, journalist, or copyrighted character.',
      'Do not include text, headlines, captions, logos, watermarks, flags used as decoration, or fake newspaper layouts.',
      'Avoid sensationalism, graphic violence, injury, weapons, and misleading visual claims. Keep the image neutral, dignified, and suitable for a general audience.',
      'Category: ' + category,
      'Headline: ' + title,
      'Summary: ' + excerpt,
      'Article context: ' + content,
    ].join('\n');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: '16:9', imageSize: '1K' },
        },
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 260);
      const status = response.status;
      const message = status === 429
        ? 'The image-generation quota is currently busy. Wait a little and try again.'
        : status === 503
          ? 'Gemini image generation is temporarily unavailable. Try again shortly.'
          : `Gemini image generation returned HTTP ${status}: ${detail}`;
      return NextResponse.json({ error: message }, { status: status === 429 || status === 503 ? 503 : 502 });
    }

    const result = await response.json();
    const parts = result?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part: any) => part.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
      const reason = result?.candidates?.[0]?.finishReason || 'No image returned';
      return NextResponse.json({ error: `Gemini did not return an image (${reason}). Check image model access and quota.` }, { status: 502 });
    }

    return NextResponse.json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || 'image/png',
      model,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.name.includes('Timeout') ? 'Image generation took too long. Please try again.' : error.message
      : 'Image generation failed. Please try again.';
    console.error('NaijaToday editorial image generation failed:', message);
    return NextResponse.json({ error: message.slice(0, 300) }, { status: 500 });
  }
}
