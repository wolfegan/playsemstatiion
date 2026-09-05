#!/usr/bin/env node
// Troca a senha da conta de admin sem depender de e-mail (evita o rate
// limit do envio de e-mail do Supabase). Roda 100% na sua máquina: lê a URL
// e a service_role key do seu .env.local (nunca comitado, nunca enviado pra
// lugar nenhum além do seu próprio projeto Supabase), pede o e-mail e a
// senha nova direto no terminal, acha o UID sozinho e troca a senha pela
// Admin API do Supabase.
//
// Uso:
//   node scripts/set-admin-password.mjs
//
// Observação: o terminal mostra a senha enquanto você digita (não mascara
// os caracteres) — script simples de uso único, rode num lugar sem
// ninguém olhando por cima do ombro.

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

async function main() {
  let env;
  try {
    env = loadEnvLocal();
  } catch {
    console.error("Não achei o .env.local na raiz do projeto. Rode este script de dentro da pasta do projeto.");
    process.exit(1);
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const defaultEmail = env.NEXT_PUBLIC_AUTH_EMAIL;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local. Adicione as duas antes de rodar este script."
    );
    process.exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const emailInput = await rl.question(`E-mail da conta [${defaultEmail ?? "obrigatório"}]: `);
  const email = emailInput.trim() || defaultEmail;
  const password = await rl.question("Senha nova (mínimo 6 caracteres): ");
  rl.close();

  if (!email) {
    console.error("Precisa de um e-mail.");
    process.exit(1);
  }
  if (!password || password.length < 6) {
    console.error("Senha precisa ter pelo menos 6 caracteres.");
    process.exit(1);
  }

  // 1. Acha o UID a partir do e-mail — assim você não precisa copiar/colar
  //    UID nenhum manualmente.
  const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const listData = await listRes.json();
  const user = listData?.users?.[0];
  if (!listRes.ok || !user) {
    console.error("Não achei nenhum usuário com esse e-mail:", JSON.stringify(listData));
    process.exit(1);
  }

  // 2. Troca a senha desse usuário.
  const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
    method: "PUT",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (updateRes.ok) {
    console.log("✅ Senha atualizada. Já pode logar em /login com a senha nova.");
  } else {
    console.error("❌ Falhou:", await updateRes.text());
    process.exit(1);
  }
}

main();
