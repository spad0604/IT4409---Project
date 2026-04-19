-- Nhãn (labels): Mỗi dự án có bộ nhãn riêng, gắn vào công việc qua bảng trung gian
create table if not exists public.labels (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  color       text not null default '#6366f1',
  created_at  timestamptz not null default now()
);

create index if not exists idx_labels_project on public.labels(project_id);

-- Bảng trung gian: Gắn nhãn vào công việc (quan hệ nhiều-nhiều)
create table if not exists public.issue_labels (
  issue_id    uuid not null references public.issues(id) on delete cascade,
  label_id    uuid not null references public.labels(id) on delete cascade,
  primary key (issue_id, label_id)
);
