-- 创建商品评价表
create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid references sku(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  content text not null,
  images jsonb default '[]'::jsonb,
  is_anonymous boolean default false,
  likes_count integer default 0,
  follow_up_content text,
  follow_up_images jsonb default '[]'::jsonb,
  follow_up_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 创建评价点赞表（有用性投票）
create table if not exists product_review_likes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references product_reviews(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(review_id, user_id)
);

-- 创建系统报错申请表
create table if not exists system_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null, -- 'system_error', 'ui_issue', 'feature_request', 'other'
  description text not null,
  images jsonb default '[]'::jsonb,
  status text default 'pending', -- 'pending', 'resolved', 'ignored'
  admin_reply text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 启用 RLS
alter table product_reviews enable row level security;
alter table product_review_likes enable row level security;
alter table system_reports enable row level security;

-- 商品评价 RLS 策略
create policy "Anyone can read reviews" on product_reviews
  for select using (true);

create policy "Authenticated users can create reviews" on product_reviews
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own reviews" on product_reviews
  for update using (auth.uid() = user_id);

-- 评价点赞 RLS 策略
create policy "Anyone can see review likes" on product_review_likes
  for select using (true);

create policy "Authenticated users can like reviews" on product_review_likes
  for insert with check (auth.uid() = user_id);

create policy "Users can unlike reviews" on product_review_likes
  for delete using (auth.uid() = user_id);

-- 系统报错 RLS 策略
create policy "Users can read their own reports" on system_reports
  for select using (auth.uid() = user_id);

create policy "Users can submit reports" on system_reports
  for insert with check (auth.uid() = user_id);

create policy "Admins can read all reports" on system_reports
  for select using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );
  
create policy "Admins can update reports" on system_reports
  for update using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 添加触发器自动更新 updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_product_reviews_updated_at
    before update on product_reviews
    for each row
    execute procedure update_updated_at_column();

create trigger update_system_reports_updated_at
    before update on system_reports
    for each row
    execute procedure update_updated_at_column();
