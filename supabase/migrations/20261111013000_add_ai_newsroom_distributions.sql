create table if not exists public.ai_newsroom_distributions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.ai_newsroom_items(id) on delete cascade,
  destination text not null check (destination in ('forum_thread','job','scholarship')),
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  confidence integer not null default 0 check (confidence between 0 and 100),
  reason text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (item_id, destination)
);
create index if not exists ai_newsroom_distributions_status_created_idx
  on public.ai_newsroom_distributions(status, created_at desc);
alter table public.ai_newsroom_distributions enable row level security;
revoke all on public.ai_newsroom_distributions from anon, authenticated;
grant all on public.ai_newsroom_distributions to service_role;
