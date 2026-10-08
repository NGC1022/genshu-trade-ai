-- 可持续更新：真实数据版本、政策文档、分析新鲜度和更新日志
create table if not exists public.trade_source_documents (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  source_name text not null,
  publisher text not null,
  source_url text not null,
  document_type text not null default 'statistics' check (document_type in ('statistics', 'policy', 'news')),
  content_hash text not null,
  published_at date,
  fetched_at timestamptz not null default now(),
  title text,
  summary text,
  raw_excerpt text,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique(source_key, content_hash)
);

create index if not exists trade_source_documents_current_idx
  on public.trade_source_documents(source_key, is_current, fetched_at desc);

create table if not exists public.trade_data_versions (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid references public.trade_source_documents(id) on delete set null,
  dataset_key text not null,
  version_label text not null,
  fetched_at timestamptz not null default now(),
  row_count integer not null default 0,
  data jsonb not null default '[]'::jsonb,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists trade_data_versions_current_idx
  on public.trade_data_versions(dataset_key, is_current, fetched_at desc);

create table if not exists public.ai_trade_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  analysis_type text not null,
  input_data jsonb not null default '{}'::jsonb,
  result_data jsonb not null default '{}'::jsonb,
  source_document_ids uuid[] not null default '{}',
  data_version_ids uuid[] not null default '{}',
  freshness_status text not null default 'current' check (freshness_status in ('current', 'stale', 'replaced', 'needs_review')),
  stale_reason text,
  analyzed_at timestamptz not null default now(),
  refreshed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ai_trade_analysis_freshness_idx
  on public.ai_trade_analysis_runs(freshness_status, analyzed_at desc);

alter table public.trade_source_documents enable row level security;
alter table public.trade_data_versions enable row level security;
alter table public.ai_trade_analysis_runs enable row level security;

-- 公开来源与当前版本可读；写入和过时标记只允许 Edge Function 的 service role。
drop policy if exists "trade source documents readable" on public.trade_source_documents;
create policy "trade source documents readable" on public.trade_source_documents for select using (true);
drop policy if exists "trade data versions readable" on public.trade_data_versions;
create policy "trade data versions readable" on public.trade_data_versions for select using (true);
drop policy if exists "users read own analysis runs" on public.ai_trade_analysis_runs;
create policy "users read own analysis runs" on public.ai_trade_analysis_runs for select using (auth.uid() = user_id);

comment on table public.trade_source_documents is '官方数据和政策来源的内容指纹与版本，防止过时分析继续被当成最新结论';
comment on table public.trade_data_versions is '真实贸易数据快照版本；新版本不会删除旧版本';
comment on table public.ai_trade_analysis_runs is 'AI分析运行记录；来源变化后标记 stale，需重新分析和人工复核';
