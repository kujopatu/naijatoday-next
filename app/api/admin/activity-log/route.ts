import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAIL } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server database credentials are not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function authorisedAdmin(request: NextRequest) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;
  const email = (data.user.email || '').toLowerCase();
  const admin = serviceClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (profile?.role !== 'admin' && email !== ADMIN_EMAIL.toLowerCase()) return null;
  return { email: data.user.email || '' };
}

export async function GET(request: NextRequest) {
  const actor = await authorisedAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  try {
    const admin = serviceClient();
    if (request.nextUrl.searchParams.get('countOnly') === '1') {
      const { count, error } = await admin.from('admin_activity_log').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return NextResponse.json({ count: count ?? 0 });
    }
    const { data, error } = await admin.from('admin_activity_log')
      .select('id,action,detail,admin_email,created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return NextResponse.json({ entries: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load activity records.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const actor = await authorisedAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  try {
    const body = await request.json() as { action?: unknown; detail?: unknown };
    const action = String(body.action ?? '').trim().slice(0, 100);
    const detail = String(body.detail ?? '').trim().slice(0, 500);
    if (!action) return NextResponse.json({ error: 'An activity action is required.' }, { status: 400 });
    const admin = serviceClient();
    const { error } = await admin.from('admin_activity_log').insert({
      action,
      detail: detail || null,
      admin_email: actor.email,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to record activity.' }, { status: 500 });
  }
}
