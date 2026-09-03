import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Roda em tudo, exceto assets estáticos do Next e o favicon — inclusive em
  // chamadas diretas de API/rota digitadas na URL, que é justamente o caso que
  // precisa ficar coberto (ver checklist de teste no README).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
