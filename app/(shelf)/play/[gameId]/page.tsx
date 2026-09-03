import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmulatorScreen } from "@/components/emulator/emulator-screen";

export default async function PlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const supabase = await createClient();

  // RLS garante que só volta a linha se ela pertencer ao usuário da sessão —
  // um gameId de outro dono (hipotético, já que hoje só existe um usuário)
  // simplesmente não aparece aqui, não dá erro 403 explícito.
  const { data: game } = await supabase.from("games").select("*").eq("id", gameId).single();

  if (!game) notFound();

  return <EmulatorScreen game={game} />;
}
