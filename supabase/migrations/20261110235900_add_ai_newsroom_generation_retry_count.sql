alter table public.ai_newsroom_items
  add column if not exists generation_retry_count integer not null default 0;
