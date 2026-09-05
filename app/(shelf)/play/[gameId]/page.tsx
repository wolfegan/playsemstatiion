import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SYSTEMS_BY_ID } from "@/lib/systems";
import { EmulatorScreen } from "@/components/emulator/emulator-screen";
import type { GameRow } from "@/lib/database.types";

const SIGNED_URL_TTL_SECONDS = 60 * 10; // só precisa durar o carregamento inicial

export default async function PlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;

  const authClient = await createClient();
  const { data: userData } = await authClient.auth.getUser();
  const isOwner = !!userData.user;

  // Pro dono, exatamente o client de sempre (anon key + sessão, RLS normal)
  // — não depende de nenhuma variável nova. Só quem entrou pela senha de
  // entrada (sem sessão Supabase) usa a service role — é o que deixa o
  // navegador dela nunca falar direto com o Storage do Supabase.
  const db = isOwner ? authClient : createServiceClient();

  const { data: game } = await db.from("games").select("*").eq("id", gameId).single();
  if (!game) notFound();

  const { data: romSigned, error: romError } = await db.storage
    .from("roms")
    .createSignedUrl((game as GameRow).storage_path, SIGNED_URL_TTL_SECONDS);
  if (romError || !romSigned) notFound();

  const system = SYSTEMS_BY_ID[game.system_id];
  let biosUrl: string | undefined;
  let biosError: string | undefined;

  // Mesma exceção de sempre: "arcade" (FBNeo) fica de fora — ver histórico
  // no README ("Limitações conhecidas") sobre o crash de BIOS de Neo Geo.
  if (system?.bios?.length && system.id !== "arcade") {
    const { data: biosRow } = await db
      .from("system_bios")
      .select("storage_path")
      .eq("system_id", game.system_id)
      .maybeSingle();

    if (biosRow) {
      const { data: biosSigned } = await db.storage
        .from("roms")
        .createSignedUrl(biosRow.storage_path, SIGNED_URL_TTL_SECONDS);
      biosUrl = biosSigned?.signedUrl;
    } else if (system.bios.some((b) => b.required)) {
      const filename = system.bios.find((b) => b.required)?.filename;
      biosError = isOwner
        ? `Este sistema precisa de uma BIOS (${filename}) que ainda não foi enviada. Use o botão "BIOS" na estante pra enviar.`
        : `Este sistema precisa de uma BIOS (${filename}) que o dono ainda não enviou. Avise ele.`;
    }
  }

  return (
    <EmulatorScreen
      game={game}
      isOwner={isOwner}
      romUrl={romSigned.signedUrl}
      biosUrl={biosUrl}
      biosError={biosError}
    />
  );
}
