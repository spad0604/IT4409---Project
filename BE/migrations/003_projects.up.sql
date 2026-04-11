create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  key         text not null unique,
  description text not null default '',
  lead_id     uuid references public.users(id),
  icon        text not null default '',
  type        text not null default 'kanban'
                check (type in ('kanban', 'scrum')),
  created_by  uuid not null references public.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index if not exists idx_projects_key on public.projects(key);

create table if not exists public.project_members (
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  role        text not null default 'member'
                check (role in ('admin', 'member', 'viewer')),
  joined_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists idx_project_members_user on public.project_members(user_id);

create table if not exists public.project_issue_counters (
  project_id  uuid primary key references public.projects(id) on delete cascade,
  last_number integer not null default 0
);
