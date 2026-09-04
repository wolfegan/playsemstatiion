-- Rode isto no SQL Editor do seu projeto Supabase (depois dos anteriores —
-- não altera nem apaga nada que já existe, só adiciona).
--
-- Objetivo: uma segunda conta ("visitante") que consegue VER e JOGAR tudo,
-- mas não consegue subir, editar ou apagar ROM/BIOS nem mexer em nada —
-- pra colegas testarem sem risco de desconfigurar sua estante.
--
-- Passo a passo:
-- 1. Rode este arquivo inteiro no SQL Editor.
-- 2. Em Authentication > Users > Add user, crie uma SEGUNDA conta
--    (ex.: visitante@seudominio.com + uma senha própria, diferente da sua).
-- 3. Copie o UID de cada usuário (Authentication > Users, coluna "UID") e
--    rode os dois INSERTs no fim deste arquivo, um pra cada.
-- 4. Adicione NEXT_PUBLIC_VISITOR_EMAIL=visitante@seudominio.com no
--    .env.local e nas Environment Variables da Vercel (não é segredo, é só
--    o identificador da conta — igual o NEXT_PUBLIC_AUTH_EMAIL já existente).
-- 5. A senha do visitante você combina direto com quem for testar — nunca
--    passa por código nem por mim.

create table if not exists profiles (
  id uuid primary key references auth.users(id),
  role text not null check (role in ('owner', 'visitor')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles
  for select
  using (id = auth.uid());

-- Funções auxiliares (security definer): centralizam a checagem de role sem
-- reabrir a RLS de `profiles` recursivamente, e deixam as policies de
-- games/system_bios/storage mais legíveis.
create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$;

create or replace function public.is_known_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid());
$$;

-- ---- games: leitura pra qualquer usuário conhecido, escrita só pro dono ----

drop policy if exists "own rows only" on games;

create policy "known users can read games" on games
  for select
  using (is_known_user());

create policy "owner can insert games" on games
  for insert
  with check (owner_id = auth.uid() and is_owner());

create policy "owner can update games" on games
  for update
  using (owner_id = auth.uid() and is_owner())
  with check (owner_id = auth.uid() and is_owner());

create policy "owner can delete games" on games
  for delete
  using (owner_id = auth.uid() and is_owner());

-- ---- system_bios: mesma ideia — todo mundo lê, só o dono escreve ----

drop policy if exists "own rows only" on system_bios;

create policy "known users can read system_bios" on system_bios
  for select
  using (is_known_user());

create policy "owner can insert system_bios" on system_bios
  for insert
  with check (owner_id = auth.uid() and is_owner());

create policy "owner can update system_bios" on system_bios
  for update
  using (owner_id = auth.uid() and is_owner())
  with check (owner_id = auth.uid() and is_owner());

create policy "owner can delete system_bios" on system_bios
  for delete
  using (owner_id = auth.uid() and is_owner());

-- control_prefs fica como está: cada usuário (dono ou visitante) só vê/edita
-- a própria linha (owner_id = auth.uid()) — isso já isola visitante do dono
-- sem precisar de mudança, e não afeta a estante compartilhada.

-- ---- Storage: leitura (jogar) pra qualquer usuário conhecido; ----
-- ---- upload/substituir/apagar continua só pro dono ----

drop policy if exists "own files only" on storage.objects;

create policy "owner manages own files" on storage.objects
  for all
  using (
    bucket_id = 'roms'
    and (storage.foldername(name))[1] = auth.uid()::text
    and is_owner()
  )
  with check (
    bucket_id = 'roms'
    and (storage.foldername(name))[1] = auth.uid()::text
    and is_owner()
  );

create policy "known users can read files" on storage.objects
  for select
  using (bucket_id = 'roms' and is_known_user());

-- ---- Preencha os UIDs reais aqui embaixo e rode (pode rodar cada um
-- separado, ou os dois de uma vez) ----

-- insert into profiles (id, role) values ('COLE-O-UID-DO-DONO-AQUI', 'owner');
-- insert into profiles (id, role) values ('COLE-O-UID-DO-VISITANTE-AQUI', 'visitor');
