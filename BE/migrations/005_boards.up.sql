-- Bảng (boards): Mỗi dự án có thể có nhiều bảng Kanban
create table if not exists public.boards (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_boards_project on public.boards(project_id);

-- Cột (board_columns): Mỗi bảng có nhiều cột (VD: To Do, In Progress, Done)
create table if not exists public.board_columns (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  name        text not null,
  position    integer not null default 0,
  status_map  text not null default 'todo'
                check (status_map in ('todo','in_progress','in_review','done')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_board_columns_board on public.board_columns(board_id);
