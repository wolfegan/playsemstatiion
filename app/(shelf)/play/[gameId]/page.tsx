import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmulatorScreen } from "@/components/emulator/emulator-screen";

export default async function PlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const supabase = await createClient();

  // RLS garante que só volta a linha se o usuário da sessão puder ler jogos
  // (dono ou visitante — ver supabase/migrations/005_visitor_role.sql); um
  // gameId inexistente simplesmente não aparece aqui, não dá erro 403 explícito.
  const [{ data: game }, { data: profile }] = await Promise.all([
    supabase.from("games").select("*").eq("id", gameId).single(),
    supabase.from("profiles").select("role").maybeSingle(),
  ]);

  if (!game) notFound();

  const isOwner = profile?.role !== "visitor";

  return <EmulatorScreen game={game} isOwner={isOwner} />;
}
