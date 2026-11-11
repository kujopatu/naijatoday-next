import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TeamRole = 'editor' | 'writer' | 'moderator' | 'user';

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
  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;
  const admin = serviceClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  return profile?.role === 'admin' ? { id: data.user.id, email: data.user.email || '' } : null;
}

async function allAuthUsers(admin: ReturnType<typeof serviceClient>) {
  const users: { id: string; email: string }[] = [];
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const batch = (data.users || []).flatMap((user) => user.email ? [{ id: user.id, email: user.email }] : []);
    users.push(...batch);
    if ((data.users || []).length < 200) break;
  }
  return users;
}

export async function GET(request: NextRequest) {
  const actor = await authorisedAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  try {
    const admin = serviceClient();
    const users = await allAuthUsers(admin);
    const ids = users.map((user) => user.id);
    const { data: profiles, error } = ids.length
      ? await admin.from('profiles').select('id,role').in('id', ids)
      : { data: [], error: null };
    if (error) throw error;
    const roles = new Map((profiles || []).map((profile) => [profile.id, profile.role]));
    return NextResponse.json({
      users: users.map((user) => ({ ...user, role: roles.get(user.id) || 'user' }))
        .sort((a, b) => a.email.localeCompare(b.email)),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load team accounts.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const actor = await authorisedAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  try {
    const body = await request.json() as { email?: string; role?: string };
    const email = String(body.email || '').trim().toLowerCase();
    const role = String(body.role || '') as TeamRole;
    if (!email || !/^[^\s@]+@[^\s@]+\\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid account email.' }, { status: 400 });
    }
    if (!['editor', 'writer', 'moderator', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Unsupported role. Super Admin assignment is restricted.' }, { status: 400 });
    }
    if (email === actor.email.toLowerCase()) {
      return NextResponse.json({ error: 'You cannot change your own administrator role.' }, { status: 400 });
    }
    const admin = serviceClient();
    const users = await allAuthUsers(admin);
    const target = users.find((user) => user.email.toLowerCase() === email);
    if (!target) return NextResponse.json({ error: 'No registered account was found for that email.' }, { status: 404 });
    const { error } = await admin.from('profiles').upsert({ id: target.id, role }, { onConflict: 'id' });
    if (error) throw error;
    return NextResponse.json({ success: true, email, role });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update account role.' }, { status: 500 });
  }
}
