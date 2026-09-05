"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// O link do e-mail de redefinição chega com um token de recuperação (no hash
// da URL, nunca vai pro servidor) — o próprio SDK do Supabase detecta isso
// sozinho ao carregar a página e dispara o evento "PASSWORD_RECOVERY" com
// uma sessão temporária válida. É essa sessão que deixa updateUser()
// funcionar, sem precisar saber a senha antiga.
export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    async function processRecoveryHash() {
      // O link do e-mail chega com o token no HASH da URL
      // (#access_token=...&refresh_token=...&type=recovery) — lemos e
      // aplicamos isso na mão com setSession(), em vez de confiar só na
      // detecção automática do SDK (que não estava disparando a tempo).
      const rawHash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(rawHash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (accessToken && refreshToken && type === "recovery") {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // Limpa o hash da URL assim que processado — não deixa o token
        // visível na barra de endereço/histórico por mais tempo que precisa.
        window.history.replaceState(null, "", window.location.pathname);
        if (!error && !settled) {
          settled = true;
          setReady("ready");
          return;
        }
      }

      // Fallback: talvez o SDK já tenha processado tudo sozinho antes deste
      // efeito rodar (ex.: em outro formato de link).
      const { data } = await supabase.auth.getSession();
      if (!settled && data.session) {
        settled = true;
        setReady("ready");
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && !settled) {
        settled = true;
        setReady("ready");
      }
    });

    processRecoveryHash();

    // Depois de alguns segundos sem nada, ou o link é inválido/expirado, ou
    // não veio token nenhum (alguém abriu esta página direto).
    const timeout = setTimeout(() => {
      if (!settled) setReady("invalid");
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    setStatus("ok");
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1200);
  }

  if (ready === "checking") {
    return (
      <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: 0 }}>Verificando o link...</p>
    );
  }

  if (ready === "invalid") {
    return (
      <>
        <p style={{ fontSize: 13, color: "var(--orange)", margin: 0 }}>
          Link inválido ou expirado. Peça um novo e-mail de redefinição no painel do Supabase
          (Authentication → Users → sua conta → Reset/Send password recovery).
        </p>
        <a className="btn ghost" href="/login" style={{ textDecoration: "none", textAlign: "center", marginTop: 16 }}>
          Voltar pro login
        </a>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <p className="blink" style={{ fontSize: 13, color: "var(--orange)", letterSpacing: "0.08em", margin: 0 }}>
        ▸ ESCOLHA A NOVA SENHA DE ADMIN
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "var(--void)",
          border: "2px solid var(--chrome-lo)",
          padding: "0.75rem 1rem",
        }}
      >
        <span style={{ color: "var(--blue)" }}>&gt;</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          aria-label="Nova senha"
          autoFocus
          minLength={6}
          required
          style={{
            flex: 1,
            background: "transparent",
            border: 0,
            outline: 0,
            color: "var(--ink)",
            fontFamily: "var(--mono)",
            fontSize: 16,
            letterSpacing: "0.2em",
          }}
        />
      </div>
      <button className="btn" type="submit" style={{ width: "100%" }} disabled={status === "loading"}>
        {status === "loading" ? "Salvando..." : "Salvar nova senha"}
      </button>
      <p
        role="status"
        style={{
          fontSize: 12,
          letterSpacing: "0.08em",
          minHeight: "1.2em",
          margin: 0,
          color: status === "error" ? "var(--orange)" : "var(--lime)",
        }}
      >
        {status === "ok" ? "SENHA ALTERADA — entrando..." : status === "error" ? errorMsg.toUpperCase() : ""}
      </p>
    </form>
  );
}
