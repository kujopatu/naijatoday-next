alter table public.ai_newsroom_items
  add column if not exists image_generation_status text not null default 'not_started',
  add column if not exists image_generation_error text;
