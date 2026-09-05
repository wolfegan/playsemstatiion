import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ShelfClient } from "@/components/shelf/shelf-client";
import type { GameRow } from "@/lib/database.types";

export default async function ShelfPage() {
  const authClient = await createClient();
  const { data: userData } = await authClient.auth.getUser();
  const isOwner = !!userData.user;

  let games: GameRow[] | null;
  if (isOwner) {
    // Caminho de sempre, sem nenhuma mudança: client com a anon key + sessão
    // do dono, protegido pela RLS de sempre. Não depende de nenhuma
    // variável nova — continua funcionando mesmo se você nunca configurar
    // a área de visitante.
    ({ data: games } = await authClient.from("games").select("*").order("imported_at", { ascending: true }));
  } else {
    // Só chega aqui quem passou pela senha de entrada (o middleware já
    // barrou todo o resto) — sem sessão Supabase, a RLS normal não
    // serviria, então a leitura usa a service role, sempre só-leitura.
    const service = createServiceClient();
    ({ data: games } = await service.from("games").select("*").order("imported_at", { ascending: true }));
  }

  return <ShelfClient initialGames={games ?? []} ownerId={userData.user?.id ?? ""} isOwner={isOwner} />;
}
