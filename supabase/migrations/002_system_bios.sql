-- Rode isto no SQL Editor do seu projeto Supabase (depois do schema.sql
-- original — não altera nem apaga nada que já existe, só adiciona).
--
-- BIOS é por sistema, compartilhada entre todos os jogos daquele sistema
-- (ex.: um único neogeo.zip vale pra qualquer jogo de Neo Geo) — por isso é
-- uma tabela própria, não uma coluna em `games`.

create table if not exists system_bios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  system_id text not null,
  filename text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  unique (owner_id, system_id)
);

alter table system_bios enable row level security;

drop policy if exists "own rows only" on system_bios;
create policy "own rows only" on system_bios
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Os arquivos de BIOS ficam no mesmo bucket privado `roms`, em
-- {owner_id}/_bios/{system_id}/{filename} — a policy de Storage já criada no
-- schema.sql cobre esse caminho, porque ela só olha o primeiro segmento
-- (owner_id), não precisa de nada novo aqui.
