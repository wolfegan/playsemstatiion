"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Senha de "entrada" (ver/jogar) — não é login de verdade, não usa Supabase
// Auth. Só bate a senha contra VIEW_PASSWORD no servidor (ver
// app/api/enter/route.ts) e planta um cookie assinado se bater.
export function EnterForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("ok");
      router.push("/");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <p className="blink" style={{ fontSize: 13, color: "var(--orange)", letterSpacing: "0.08em", margin: 0 }}>
        ▸ INSERT COIN TO CONTINUE
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
          aria-label="Senha de entrada"
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
