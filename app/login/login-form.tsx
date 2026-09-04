"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Só pede a senha — o e-mail é fixo e não-secreto (NEXT_PUBLIC_AUTH_EMAIL ou
// NEXT_PUBLIC_VISITOR_EMAIL, conforme o modo escolhido). Quem sabe a senha de
// verdade é só o Supabase Auth; ela nunca é comparada no código do frontend.
export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"owner" | "visitor">("owner");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const ownerEmail = process.env.NEXT_PUBLIC_AUTH_EMAIL;
  const visitorEmail = process.env.NEXT_PUBLIC_VISITOR_EMAIL;
  const email = mode === "owner" ? ownerEmail : visitorEmail;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      return;
    }
    setStatus("ok");
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* A conta de visitante é opcional — só aparece a escolha se a variável
          de ambiente estiver configurada, senão a tela fica igual à de sempre. */}
      {visitorEmail && (
        <div className="tabs" role="tablist" aria-label="Tipo de acesso" style={{ justifyContent: "center" }}>
          <button
            type="button"
            className="tab"
            role="tab"
            aria-selected={mode === "owner"}
            onClick={() => {
              setMode("owner");
              setStatus("idle");
            }}
          >
            Dono
          </button>
          <button
            type="button"
            className="tab"
            role="tab"
            aria-selected={mode === "visitor"}
            onClick={() => {
              setMode("visitor");
              setStatus("idle");
            }}
          >
            Visitante
          </button>
        </div>
      )}
      <p className="blink" style={{ fontSize: 13, color: "var(--orange)", letterSpacing: "0.08em", margin: 0 }}>
        ▸ INSERT PASSWORD TO CONTINUE
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
          aria-label="Senha"
          autoFocus
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
        {status === "loading" ? "Verificando..." : "Confirmar"}
      </button>
      <p role="status" style={{ fontSize: 12, letterSpacing: "0.08em", minHeight: "1.2em", margin: 0, color: status === "error" ? "var(--orange)" : "var(--lime)" }}>
        {status === "ok" ? "ACCESS GRANTED" : status === "error" ? "ACCESS DENIED — TRY AGAIN" : ""}
      </p>
    </form>
  );
}
