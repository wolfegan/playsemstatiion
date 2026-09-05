import { NextResponse } from "next/server";
import { signViewToken, VIEW_COOKIE_NAME, VIEW_COOKIE_MAX_AGE_SECONDS } from "@/lib/view-gate";

// POST: confere a senha de entrada e, se bater, planta o cookie assinado.
export async function POST(request: Request) {
  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Corpo inválido." }, { status: 400 });
  }

  const expected = process.env.VIEW_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "VIEW_PASSWORD não configurada no servidor." },
      { status: 500 }
    );
  }
  if (typeof password !== "string" || password !== expected) {
    return NextResponse.json({ ok: false, error: "Senha incorreta." }, { status: 401 });
  }

  const token = await signViewToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(VIEW_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VIEW_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

// DELETE: "sair" de quem só entrou com a senha de entrada (sem conta
// Supabase nenhuma pra deslogar) — só limpa o cookie.
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(VIEW_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
