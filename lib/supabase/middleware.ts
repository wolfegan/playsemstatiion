// Gate de acesso no edge da Vercel: roda antes de qualquer HTML ser gerado.
// Duas portas de entrada, independentes:
// - Sessão real do Supabase Auth (a conta única de sempre) -> acesso total
//   (ver, jogar, subir, editar, apagar).
// - Cookie de "senha de entrada" (view_session, ver lib/view-gate.ts) -> só
//   ver/jogar; nunca dá pra escrever nada com ele (a RLS exige uma sessão
//   Supabase de verdade pra qualquer INSERT/UPDATE/DELETE).
// Sem nenhum dos dois -> /enter. É a camada extra além da RLS (que protege
// os dados) — esta aqui protege a própria navegação/UI.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isValidViewToken, VIEW_COOKIE_NAME } from "@/lib/view-gate";

// /reset-password precisa ficar público: o link do e-mail de recuperação
// chega com o token só no HASH da URL (nunca vai pro servidor), então na
// primeira requisição o middleware ainda não vê sessão nenhuma — é só o
// JavaScript da página, já carregada, que processa esse token no navegador.
const PUBLIC_PATHS = ["/login", "/enter", "/api/enter", "/reset-password"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasViewAccess = !!user || (await isValidViewToken(request.cookies.get(VIEW_COOKIE_NAME)?.value));

  const isPublicPath = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!hasViewAccess && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/enter";
    return NextResponse.redirect(url);
  }

  // Já tem acesso (de um jeito ou de outro) e foi bater numa tela de
  // entrada -> manda direto pra estante, não faz sentido pedir de novo.
  if (hasViewAccess && (request.nextUrl.pathname === "/enter" || (user && request.nextUrl.pathname === "/login"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
