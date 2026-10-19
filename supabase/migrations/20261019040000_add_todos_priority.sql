-- Migration: add public.todos.priority
--
-- Adds a numeric priority to each todo, modeled as a small integer from 1
-- through 5 (3 = default/medium). NOT NULL with a default of 3 so existing
-- rows are backfilled to 3, and a CHECK constraint bounds the allowed range.

alter table public.todos
  add column if not exists priority smallint not null default 3;

alter table public.todos
  add constraint todos_priority_range check (priority between 1 and 5);

comment on column public.todos.priority is
  'Todo priority as an integer from 1 (lowest) through 5 (highest); defaults to 3.';
