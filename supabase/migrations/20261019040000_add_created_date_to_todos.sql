-- Migration: add public.todos.created_date
--
-- Experiment: a separate calendar-date field, distinct from the existing
-- created_at timestamptz. `not null default current_date` backfills every
-- existing row with today's date automatically, and Postgres auto-populates
-- the column on insert so clients never send it.

alter table public.todos
  add column if not exists created_date date not null default current_date;
