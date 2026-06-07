-- Bình luận (comments): Người A viết logic, Người B tạo bảng SQL
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  issue_id    uuid not null references public.issues(id) on delete cascade,
  user_id     uuid not null references public.users(id),
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_comments_issue on public.comments(issue_id);
create index if not exists idx_comments_user on public.comments(user_id);
