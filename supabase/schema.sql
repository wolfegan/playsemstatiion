-- Rode isto no SQL Editor do seu projeto Supabase.
-- Cobre: tabelas de metadados, RLS, e o bucket privado de Storage.

-- ---- Tabelas ----

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  system_id text not null,
  title text not null,
  original_filename text not null,
  file_size_bytes bigint not null,
  storage_path text not null,
  bios_storage_path text,
  cover_url text,
  cover_source text,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists control_prefs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) default auth.uid(),
  system_id text not null,
  keyboard_map jsonb,
  gamepad_map jsonb,
  updated_at timestamptz not null default now(),
  unique (owner_id, system_id)
);

alter table games enable row level security;
alter table control_prefs enable row level security;

drop policy if exists "own rows only" on games;
create policy "own rows only" on games
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "own rows only" on control_prefs;
create policy "own rows only" on control_prefs
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---- Storage ----
-- Bucket privado (public = false é o padrão, mas deixamos explícito).
insert into storage.buckets (id, name, public)
values ('roms', 'roms', false)
on conflict (id) do nothing;

drop policy if exists "own files only" on storage.objects;
create policy "own files only"
  on storage.objects
  for all
  using (bucket_id = 'roms' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'roms' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---- Usuário único (senha única, sem cadastro) ----
-- Crie o usuário pelo painel: Authentication > Users > Add user.
-- Guarde o e-mail escolhido em NEXT_PUBLIC_AUTH_EMAIL (.env.local e Vercel) —
-- não é secreto. A senha real fica só no Supabase Auth, nunca em código.
