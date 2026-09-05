import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Cliente com a service_role key — ignora TODA a RLS (lê e escreve qualquer
// linha, de qualquer "dono"). Por isso:
//
// 1. NUNCA importe este arquivo de um componente "use client" — ele só pode
//    rodar em código de servidor (Server Component, Route Handler).
// 2. Só chame createServiceClient() depois que o middleware (ver
//    lib/supabase/middleware.ts) já confirmou que quem está pedindo passou
//    pela senha de entrada OU é o dono de verdade logado — este cliente,
//    sozinho, não checa nada disso.
// 3. SUPABASE_SERVICE_ROLE_KEY nunca leva o prefixo NEXT_PUBLIC_ e nunca
//    pode aparecer no bundle do navegador.
//
// É usado só pra LEITURA (listar jogos, gerar URL assinada de ROM/BIOS) —
// toda ESCRITA (subir, editar, apagar) continua passando pelo cliente do
// navegador com a anon key, protegida pela RLS de sempre (só o dono real,
// autenticado via Supabase Auth, consegue escrever).
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.");
  }
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
