import { createClient } from "@/lib/supabase/server";
import { ShelfClient } from "@/components/shelf/shelf-client";

export default async function ShelfPage() {
  const supabase = await createClient();
  // RLS agora deixa qualquer usuário conhecido (dono OU visitante) ler a
  // estante inteira — não há filtro por owner_id aqui porque a política do
  // banco já cobre isso (ver supabase/migrations/005_visitor_role.sql).
  const [{ data: games }, { data: userData }] = await Promise.all([
    supabase.from("games").select("*").order("imported_at", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  // Papel do usuário logado — decide o que a UI deixa fazer (upload, editar,
  // apagar, BIOS...). A checagem que realmente importa pra segurança é a RLS
  // no banco (is_owner() em supabase/migrations/005_visitor_role.sql); isto
  // aqui é só pra esconder botões que não funcionariam mesmo. Por isso o
  // padrão é "dono" (não restringe) quando não há linha em `profiles` —
  // cobre quem ainda não rodou a migration 005, ou esqueceu de inserir a
  // própria linha nela; só vira "visitante" com uma linha explícita dizendo isso.
  const { data: profile } = await supabase.from("profiles").select("role").maybeSingle();
  const isOwner = profile?.role !== "visitor";

  return <ShelfClient initialGames={games ?? []} ownerId={userData.user!.id} isOwner={isOwner} />;
}
