# Playsemstation

Emulador pessoal no navegador — estante de jogos retrô (estética Y2K arcade)
onde você importa suas próprias ROMs, guardadas no seu Supabase privado,
atrás de uma senha única. Sem cadastro, sem compartilhamento entre usuários.

> "Play**sem**station" — joga *sem* estação/console físico: um fliperama
> pessoal que roda inteiro no navegador, multi-sistema.

Emulação via [EmulatorJS](https://emulatorjs.org) (núcleos libretro/RetroArch
em WebAssembly, carregados do CDN oficial em tempo de execução).

O protótipo original de arquivo único fica arquivado em [`legacy/estante-v2.html`](legacy/estante-v2.html)
como referência.

**Criado e desenvolvido por Victor Wolfegan** — [Instagram @victorwolfegan](https://instagram.com/victorwolfegan) · [GitHub /wolfegan](https://github.com/wolfegan)

> ⚠️ Uso pessoal. Este projeto **não inclui nenhuma ROM ou BIOS** — é só o
> app; cada usuário importa os arquivos da sua própria coleção, dos jogos
> que já possui legalmente. Nunca suba ROMs/BIOS de terceiros pra um
> repositório ou serviço público.

## Stack

- Next.js 15 (App Router) + TypeScript, deploy na Vercel
- Supabase: Auth (usuário único), Postgres (metadados), Storage (bucket privado `roms`)
- EmulatorJS via CDN (`cdn.emulatorjs.org`)

## Setup

### 1. Projeto Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Rode [`supabase/schema.sql`](supabase/schema.sql) no SQL Editor — cria as
   tabelas, RLS e o bucket privado `roms`.
   Depois rode também [`supabase/migrations/002_system_bios.sql`](supabase/migrations/002_system_bios.sql)
   — cria a tabela de BIOS por sistema (não mexe no que já existe).
3. Em **Authentication → Users → Add user**, crie o seu único usuário
   (e-mail + senha que só você sabe).
4. Em **Project Settings → API**, copie a `Project URL` e a `anon public key`.

### 2. Variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha:

```bash
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — do passo acima.
- `NEXT_PUBLIC_AUTH_EMAIL` — o e-mail do usuário único que você criou. Não é
  segredo (é só o identificador da conta); a senha nunca vai pro código.

**Nunca** coloque a `service_role key` do Supabase aqui — não é necessária,
a RLS com a anon key + sessão do usuário já cobre tudo.

### 3. Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` — vai redirecionar pra `/login`.

### 4. Deploy na Vercel

1. Importe o repositório na Vercel.
2. Em **Settings → Environment Variables**, cadastre as três variáveis do
   passo 2 (para Production, Preview e Development).
3. Deploy. O `vercel.json` já configura os headers de segurança/CSP.

## Como usar

### Login

Uma senha só, sem cadastro — a tela `/login` pede só a senha; o e-mail já
vem fixo da variável de ambiente.

### Importar jogos

- **+ Adicionar ROM**: escolhe um ou mais arquivos avulsos.
- **+ Importar pasta**: seleciona uma pasta inteira (ex.: `roms/snes/`) — abre
  uma tela de revisão antes de subir, onde dá pra:
  - desmarcar arquivos que você não quer subir agora (útil se o Storage
    tiver limite de espaço apertado);
  - corrigir o sistema detectado automaticamente (por extensão) e aplicar
    isso em lote pros marcados;
  - já definir um gênero em lote pros marcados.
  - O sistema (`.zip`) de placas de arcade também detecta por conteúdo, mas
    sempre vale conferir antes de confirmar.

O app já organiza ROMs em pastas por sistema — ver [`roms/`](roms/) neste
repositório pra saber que pasta usar pra cada sistema (o nome da pasta bate
com o `id` de cada sistema em [`lib/systems.ts`](lib/systems.ts)). Essas
pastas ficam vazias no repositório — cada um adiciona suas próprias ROMs
localmente antes de importar pela UI.

### BIOS

Alguns sistemas (PS1, Saturn, Sega CD, GBA, NDS, Atari 5200/7800, Lynx,
Neo Geo/arcade) usam uma BIOS compartilhada entre todos os jogos daquele
sistema. Botão **BIOS** na estante → escolhe o sistema → envia o arquivo
certo (nome exato importa: `scph5501.bin`, `saturn_bios.bin`,
`bios_CD_U.bin`, `neogeo.zip`, etc. — os nomes esperados aparecem ali
mesmo na tela).

### Organizar a estante

- **Editar** (ícone ✎ no hover do card): troca nome de exibição, sistema e
  gênero.
- **Favoritar** (ícone ★): fixa o jogo na aba "★ Favoritos" da busca.
- **Busca e ordenação**: barra de busca por nome, filtro por gênero,
  ordenar por mais recente/nome/jogado recentemente.
- **Jogados recentemente**: aparece automaticamente como uma fileira no
  topo assim que você começa a jogar (só quando nenhum filtro/busca está
  ativo).

### Área de visitante (opcional)

Dá pra criar uma segunda conta, **só-leitura**, pra colegas testarem e
jogarem sem poder subir, editar ou apagar nada:

1. Rode [`supabase/migrations/005_visitor_role.sql`](supabase/migrations/005_visitor_role.sql)
   no SQL Editor — cria a tabela `profiles` e reescreve as políticas de RLS
   pra separar "quem lê" (dono + visitante) de "quem escreve" (só dono).
2. Em **Authentication → Users → Add user**, crie a conta do visitante
   (outro e-mail, outra senha).
3. Copie o UID de cada conta (coluna "UID" na lista de usuários) e rode os
   dois `insert into profiles (...)` no fim do arquivo da migration — um
   marcando você como `owner`, outro marcando a nova conta como `visitor`.
4. Adicione `NEXT_PUBLIC_VISITOR_EMAIL` no `.env.local` e nas Environment
   Variables da Vercel, com o e-mail da conta visitante.
5. Combine a senha do visitante diretamente com quem for testar.

Com isso, a tela de login passa a mostrar um seletor **Dono / Visitante**.
Logado como visitante: dá pra navegar, buscar, filtrar e **jogar** qualquer
jogo — mas os botões de adicionar ROM, importar pasta, BIOS, editar,
apagar e favoritar somem da tela. A trava de verdade é no banco (RLS): a
conta de visitante fisicamente não consegue gravar nem apagar nada, mesmo
que alguém tente pela API direto.

Se você não quiser essa área, é só nunca rodar a migration 005 e nunca
configurar `NEXT_PUBLIC_VISITOR_EMAIL` — o app continua exatamente como
antes, single-user.

### Apagar um jogo

Ícone 🗑 no hover do card (ou sempre visível no celular) → confirma →
remove o arquivo do Storage **e** o registro no banco. Não tem "lixeira":
uma vez confirmado, é definitivo.

### Jogar

Clica no card → carrega em tela cheia dentro do navegador. Barra superior:
**⟵ Estante** (sai e recarrega a página, de propósito — evita resíduo de
um emulador anterior atrapalhar o próximo) e **⛶ Tela cheia**. Em
touchscreen, o EmulatorJS mostra automaticamente um controle virtual na
tela; com teclado/controle físico conectado, os botões padrão do
EmulatorJS já funcionam sem configuração.

## Checklist de segurança (rodar após cada deploy)

Este app fica com URL pública — a senha única é a única barreira, então:

- [ ] Acessar `/` sem estar logado → deve redirecionar pra `/login` (middleware).
- [ ] Chamar a REST API do Supabase direto (`GET {url}/rest/v1/games`) só com a
      anon key, sem sessão → deve voltar vazio/erro (RLS).
- [ ] Tentar baixar um objeto do bucket `roms` por URL pública direta (sem
      signed URL) → deve falhar (bucket privado).
- [ ] Conferir o bundle de produção (`.next/static`) em busca da senha real ou
      da `service_role key` em texto puro → não deve aparecer nada.
- [ ] Logar, importar um jogo, deslogar, tentar acessar `/play/<id>` do jogo
      diretamente → deve redirecionar pra `/login`.

## Roadmap (ver histórico da conversa para o detalhamento completo)

1. ~~Schema Supabase + fluxo de senha única~~
2. ~~Tela de senha com a estética Y2K arcade~~
3. ~~Migração da estante pra Supabase Storage + Postgres~~
4. ~~Deploy na Vercel + validação de segurança em produção~~ (checklist
   rodado várias vezes, inclusive depois de cada mudança de header/CSP)
5. Expandir sistemas suportados (já ampliado em `lib/systems.ts` — falta
   testar cada um na prática)
6. Testar os 3 modos de controle (físico, teclado, virtual) por família de
   botões e persistir preferência em `control_prefs`
7. Testar multiplayer local com 2+ controles físicos
8. ~~Upload opcional de BIOS por sistema~~ (feito — tabela `system_bios`,
   botão "BIOS" na estante, `components/shelf/bios-manager.tsx`; BIOS de
   arcade tem uma limitação conhecida, ver abaixo)
9. ~~Cache da capa encontrada~~ (feito em `components/shelf/game-card.tsx`)
10. ~~Tratamento de erro mais robusto~~ (mensagens claras pra BIOS faltando,
    erro por arquivo na importação em lote — falta cobrir "sem rede")
11. ~~Import em lote de uma pasta inteira, com revisão antes de confirmar~~
    (feito — `components/shelf/batch-import-modal.tsx`)
12. ~~Estante "estilo RetroBat": gêneros, favoritos, jogados recentemente,
    busca/ordenação~~ (feito — `lib/genres.ts`,
    `supabase/migrations/004_categories_favorites.sql`,
    `components/shelf/shelf-client.tsx`)
13. ~~Rebranding visual (wordmark com destaque no "SEM", botões com glow,
    crédito de autoria)~~
14. ~~Área de visitante só-leitura (RLS separando leitura de escrita,
    seletor Dono/Visitante no login)~~ (feito — opcional, ver seção acima;
    `supabase/migrations/005_visitor_role.sql`)

## Limitações conhecidas

- **BIOS de Neo Geo**: testamos dois cores diferentes e os dois travam. No
  sistema `arcade` (**FBNeo**), mesmo com um `neogeo.zip` correto (arquivos
  na raiz do zip, CRCs batendo), o core trava com um erro de baixo nível do
  WebAssembly (`table index out of bounds`) ao processar a BIOS. No sistema
  `arcade_mame` (**MAME2003+**, adicionado como segunda tentativa), o mesmo
  arquivo trava do mesmo jeito ("Carregando bios do videogame 100%" sem
  avançar), com um erro diferente (`ErrnoError`, aparentemente de sistema
  de arquivos, dentro do worker do core). Como dois cores distintos falham
  do mesmo jeito com o mesmo arquivo verificado (CRC batendo), a suspeita é
  que seja uma limitação de como o EmulatorJS processa BIOS de arcade no
  navegador, não do arquivo em si. Por isso a BIOS de Neo Geo não é anexada
  automaticamente no sistema `arcade` (dá o erro nativo "romset missing" do
  FBNeo, rápido e sem travar) — no `arcade_mame` ela é opcional e só é
  usada se enviada, então dá pra tentar outro arquivo/revisão manualmente
  se quiser insistir. Jogos de Arcade que **não** são Neo Geo (Street
  Fighter/CPS via FBNeo, Mortal Kombat/Midway via MAME2003+) funcionam
  normalmente.
- **CSP em produção precisa de `blob:` no `script-src` e do CDN do
  EmulatorJS no `style-src`** (ver `vercel.json`) — sem isso, o carregamento
  trava silenciosamente perto de 100% só em produção (o `next dev` local
  não aplica esses headers, então esse tipo de bug nunca aparece testando
  local, só depois do deploy).
