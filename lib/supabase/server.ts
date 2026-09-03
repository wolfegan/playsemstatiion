// Client Supabase pra Server Components / Route Handlers, lendo a sessão do cookie
// que o middleware mantém atualizado. Nunca use a service_role key aqui — a RLS
// com a sessão do próprio usuário já basta (é single-user, mas RLS continua sendo
// a camada real de proteção, não a UI).
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado a partir de um Server Component sem permissão de escrita —
            // o middleware já cuida de manter a sessão atualizada nesse caso.
          }
        },
      },
    }
  );
}
