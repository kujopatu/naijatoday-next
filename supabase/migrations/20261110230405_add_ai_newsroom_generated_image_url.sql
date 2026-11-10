alter table public.ai_newsroom_items
  add column if not exists generated_image_url text;
