-- Enable UUID generation (Supabase usually has this enabled; if not, enable it in Database -> Extensions)
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_email on public.users (email);
