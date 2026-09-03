-- Rode isto no SQL Editor do seu projeto Supabase. Só adiciona colunas,
-- não mexe em nada que já existe.

alter table games add column if not exists genre text;
alter table games add column if not exists favorite boolean not null default false;
alter table games add column if not exists last_played_at timestamptz;
