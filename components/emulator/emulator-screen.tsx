"use client";

import { useEffect, useRef, useState } from "react";
import { SYSTEMS_BY_ID } from "@/lib/systems";
import type { GameRow } from "@/lib/database.types";

declare global {
  interface Window {
    [key: `EJS_${string}`]: unknown;
  }
}

// Módulo-escopo: o patch só precisa acontecer uma vez por sessão de página,
// não a cada troca de jogo.
let wakeLockPatched = false;

interface EmulatorScreenProps {
  game: GameRow;
  isOwner: boolean;
  // URL assinada da ROM e (se o sistema precisar) da BIOS — já resolvidas no
  // servidor (ver app/(shelf)/play/[gameId]/page.tsx), com a service role
  // key. O navegador nunca fala direto com o Storage do Supabase: isso é o
  // que mantém os arquivos protegidos mesmo pra quem só tem a senha de
  // entrada (sem sessão Supabase nenhuma pra passar pela RLS).
  romUrl: string;
  biosUrl?: string;
  // Se o servidor já sabe que falta uma BIOS obrigatória, chega pronto aqui
  // — nem tenta montar o emulador, só mostra o erro direto.
  biosError?: string;
}

export function EmulatorScreen({ game, isOwner, romUrl, biosUrl, biosError }: EmulatorScreenProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(biosError ? "error" : "loading");
  const [errorMessage, setErrorMessage] = useState(biosError ?? "");

  const system = SYSTEMS_BY_ID[game.system_id];

  useEffect(() => {
    if (biosError) return;

    // O EmulatorJS pede Wake Lock (impedir a tela de apagar) sem tratar a
    // rejeição quando o navegador nega o pedido — isso vira uma promise
    // rejeitada "não tratada" (inofensiva: o jogo roda normal do mesmo
    // jeito). Envolvemos a API aqui pra engolir essa rejeição específica,
    // em vez de deixar aparecer como erro pro usuário.
    if (typeof navigator !== "undefined" && navigator.wakeLock && !wakeLockPatched) {
      const originalRequest = navigator.wakeLock.request.bind(navigator.wakeLock);
      navigator.wakeLock.request = (...args: Parameters<typeof originalRequest>) =>
        originalRequest(...args).catch(() => null) as ReturnType<typeof originalRequest>;
      wakeLockPatched = true;
    }

    // Limpa qualquer instância anterior do EmulatorJS antes de configurar de novo.
    // Algumas propriedades que o core anterior deixou (ex.: EJS_Runtime)
    // são não-configuráveis e `delete` nelas lança TypeError — por isso
    // cada uma é tentada isoladamente, sem travar a limpeza das outras.
    // Defesa em profundidade: o normal é nem chegar aqui com sobra de
    // estado, já que launch() e goBack() agora fazem navegação completa
    // (recarrega a página) exatamente pra evitar esse tipo de resíduo.
    Object.keys(window)
      .filter((k) => k.startsWith("EJS_"))
      .forEach((k) => {
        try {
          delete (window as unknown as Record<string, unknown>)[k];
        } catch {
          try {
            (window as unknown as Record<string, unknown>)[k] = undefined;
          } catch {
            // Não dá pra limpar essa em particular — segue em frente mesmo assim.
          }
        }
      });
    document.querySelectorAll("script[data-ejs]").forEach((s) => s.remove());

    window.EJS_player = "#game";
    window.EJS_core = system?.core ?? game.system_id;
    window.EJS_gameName = game.title;
    window.EJS_gameID = game.id;
    window.EJS_color = "#ff2ec4";
    window.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
    window.EJS_gameUrl = romUrl;
    window.EJS_startOnLoaded = true;
    if (biosUrl) {
      window.EJS_biosUrl = biosUrl;
      // Sistemas de arcade (FBNeo/MAME) leem o romset de BIOS como um
      // .zip de verdade, igual fazem com o jogo — diferente de sistemas
      // como PS1/Saturn, que precisam dos arquivos já soltos/extraídos.
      // Sem isso, o EmulatorJS descompacta a BIOS antes de entregar, e o
      // core não reconhece os arquivos soltos como o romset esperado.
      if (system?.category === "arcade") {
        window.EJS_dontExtractBIOS = true;
      }
    }
    // TODO (item 6 do roadmap): validar EJS_VirtualGamepadSettings por sistema
    // e o toggle automático do gamepad virtual em connect/disconnect.

    const script = document.createElement("script");
    script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
    script.setAttribute("data-ejs", "1");
    script.onerror = () => setStatus("error");
    document.body.appendChild(script);

    setStatus("ready");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id, romUrl, biosUrl, biosError]);

  function goBack() {
    document.getElementById("game")?.replaceChildren();
    // Navegação completa (não router.push): garante uma página nova de
    // verdade, sem nenhum resíduo global do EmulatorJS pra atrapalhar o
    // próximo jogo que for aberto.
    window.location.href = "/";
  }

  function toggleFullscreen() {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div className="player-bar">
        <button className="btn ghost" onClick={goBack}>
          ⟵ Estante
        </button>
        <div className="title">
          <b>{game.title}</b> &nbsp;·&nbsp; {system?.label ?? game.system_id}
          {!isOwner && " · visitante"}
        </div>
        <button className="btn ghost" onClick={toggleFullscreen}>
          ⛶ Tela cheia
        </button>
      </div>
      <div id="stage" ref={stageRef} style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <div id="game" style={{ width: "100%", height: "100%" }} />
        {status === "loading" && (
          <p style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-dim)" }}>
            Carregando...
          </p>
        )}
        {status === "error" && (
          <p style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--orange)", padding: "2rem", textAlign: "center" }}>
            Não deu pra carregar este jogo. {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
