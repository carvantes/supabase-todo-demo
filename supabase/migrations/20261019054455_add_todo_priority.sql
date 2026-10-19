-- Migration: add priority to public.todos
--
-- Adds a per-todo priority level. The column is NOT NULL with a default of
-- 'medium', so every existing row is backfilled to 'medium' when this migration
-- applies. A check constraint restricts the value to exactly 'low', 'medium', or
-- 'high'. No RLS changes are needed: the existing owner-scoped policies already
-- govern every column of the row, including this one.

alter table public.todos
  add column if not exists priority text not null default 'medium';

-- Restrict priority to the three allowed levels.
alter table public.todos
  add constraint todos_priority_allowed
  check (priority in ('low', 'medium', 'high'));

comment on column public.todos.priority is
  'Todo priority level: one of low, medium, or high. Defaults to medium.';
