-- Migration: create public.todos
--
-- A per-user todo list. Every row is owned by a row in auth.users (via user_id).
-- Row Level Security ensures an authenticated user can only read or modify their
-- own rows. Anonymous Supabase Auth users become real auth.users rows after
-- sign-in and use the `authenticated` Postgres role, so the same policies apply
-- to them. The `anon` role (no session) is granted nothing on this table.

create table if not exists public.todos (
  id          uuid        primary key default gen_random_uuid(),
  -- Ownership: defaults to the caller's id so clients cannot forge another
  -- user's id, and cascades if the auth user is removed.
  user_id     uuid        not null default auth.uid()
                          references auth.users (id) on delete cascade,
  title       text        not null,
  is_complete boolean     not null default false,
  created_at  timestamptz not null default now(),

  -- Title validation: non-blank after trimming, and bounded in length.
  constraint todos_title_not_blank check (char_length(btrim(title)) > 0),
  constraint todos_title_max_length check (char_length(title) <= 500)
);

comment on table public.todos is
  'Per-user todo items. Each row is owned by the auth.users row referenced by user_id and protected by RLS.';

-- Index for the primary access pattern: a single user''s todos, newest first.
create index if not exists todos_user_id_created_at_idx
  on public.todos (user_id, created_at desc);

-- Enforce Row Level Security. With RLS enabled and no permissive policy matched,
-- access is denied by default.
alter table public.todos enable row level security;

-- Least privilege: drop inherited defaults, then grant only the CRUD verbs the
-- `authenticated` role needs. `anon` (unauthenticated) receives nothing.
-- `service_role` is intentionally never referenced here; this app never uses a
-- service-role key.
revoke all on table public.todos from anon;
revoke all on table public.todos from authenticated;
grant select, insert, update, delete on table public.todos to authenticated;

-- RLS policies. auth.uid() is wrapped in a scalar sub-select so Postgres
-- evaluates it once per statement (recommended Supabase performance pattern).
create policy "Owners can select their todos"
  on public.todos
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owners can insert their todos"
  on public.todos
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owners can update their todos"
  on public.todos
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners can delete their todos"
  on public.todos
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
