// Gate de "senha de entrada" (ver/jogar) — separado da senha de admin (essa
// aqui não é uma conta Supabase, é só um cookie assinado). Roda tanto no
// middleware (Edge runtime) quanto em Route Handlers (Node), por isso usa só
// a Web Crypto API global (`crypto.subtle`), sem `require("crypto")` do Node.
//
// O cookie guarda um HMAC-SHA256 de um texto fixo, assinado com
// VIEW_PASSWORD como chave — nunca a senha em texto puro. Trocar
// VIEW_PASSWORD invalida sozinho todo cookie antigo, sem precisar de lista
// de sessões nem expiração manual.

const TOKEN_PAYLOAD = "playsemstation-view-ok";

async function hmac(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(TOKEN_PAYLOAD));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signViewToken(): Promise<string> {
  const secret = process.env.VIEW_PASSWORD;
  if (!secret) throw new Error("VIEW_PASSWORD não configurada.");
  return hmac(secret);
}

export async function isValidViewToken(token: string | undefined | null): Promise<boolean> {
  const secret = process.env.VIEW_PASSWORD;
  if (!secret || !token) return false;
  const expected = await hmac(secret);
  // Comparação simples (não em tempo constante): o segredo aqui é uma senha
  // compartilhada de baixo risco pra colegas testarem, não uma chave
  // criptográfica de alto valor — não justifica a complexidade extra.
  return token === expected;
}

export const VIEW_COOKIE_NAME = "view_session";
export const VIEW_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 dias
