import { createClient } from "@/lib/supabase/server";
import { ShelfClient } from "@/components/shelf/shelf-client";

export default async function ShelfPage() {
  const supabase = await createClient();
  // RLS garante que só voltam jogos do próprio usuário autenticado — não há
  // filtro por owner_id aqui porque a política do banco já faz isso.
  const [{ data: games }, { data: userData }] = await Promise.all([
    supabase.from("games").select("*").order("imported_at", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  return <ShelfClient initialGames={games ?? []} ownerId={userData.user!.id} />;
}
