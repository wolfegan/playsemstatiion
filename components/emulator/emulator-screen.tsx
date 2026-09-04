"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SYSTEMS_BY_ID } from "@/lib/systems";
import type { GameRow } from "@/lib/database.types";

declare global {
  interface Window {
    [key: `EJS_${string}`]: unknown;
  }
}

const SIGNED_URL_TTL_SECONDS = 60 * 10; // só precisa durar o carregamento inicial

// Módulo-escopo: o patch só precisa acontecer uma vez por sessão de página,
// não a cada troca de jogo.
let wakeLockPatched = false;

interface EmulatorScreenProps {
  game: GameRow;
  isOwner: boolean;
}

export function EmulatorScreen({ game, isOwner }: EmulatorScreenProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const system = SYSTEMS_BY_ID[game.system_id];

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function boot() {
      try {
        const { data: romSigned, error: romError } = await supabase.storage
          .from("roms")
          .createSignedUrl(game.storage_path, SIGNED_URL_TTL_SECONDS);
        if (romError || !romSigned) throw romError ?? new Error("Não foi possível gerar a URL da ROM.");

        // BIOS é por sistema (compartilhada entre os jogos daquele sistema),
        // não por jogo — busca na tabela system_bios, não no registro do jogo.
        //
        // Exceção: "arcade" (FBNeo) fica de fora. Dentro desse único
        // system_id convivem romsets que precisam da BIOS (Neo Geo) e que
        // não precisam (CPS/Street Fighter) — anexar a mesma BIOS pra todos
        // quebrou os jogos que não precisavam dela (ficavam travados em
        // "Carregando bios 100%"). Neo Geo especificamente também esbarrou
        // num erro de baixo nível do próprio FBNeo/EmulatorJS ao processar
        // o zip da BIOS (WebAssembly "table index out of bounds"). O sistema
        // "arcade_mame" (MAME2003+) é uma implementação diferente e não tem
        // essa exclusão — é o experimento em andamento pra ver se o Neo Geo
        // funciona por esse core em vez do FBNeo.
        let biosUrl: string | undefined;
        if (system?.bios?.length && system.id !== "arcade") {
          const { data: biosRow } = await supabase
            .from("system_bios")
            .select("storage_path")
            .eq("system_id", game.system_id)
            .maybeSingle();

          if (biosRow) {
            const { data: biosSigned, error: biosError } = await supabase.storage
              .from("roms")
              .createSignedUrl(biosRow.storage_path, SIGNED_URL_TTL_SECONDS);
            if (biosError || !biosSigned) throw biosError ?? new Error("Não foi possível gerar a URL da BIOS.");
            biosUrl = biosSigned.signedUrl;
          } else if (system.bios.some((b) => b.required)) {
            const filename = system.bios.find((b) => b.required)?.filename;
            throw new Error(
              isOwner
                ? `Este sistema precisa de uma BIOS (${filename}) que ainda não foi enviada. Use o botão "BIOS" na estante pra enviar.`
                : `Este sistema precisa de uma BIOS (${filename}) que o dono ainda não enviou. Avise ele.`
            );
          }
        }

        if (cancelled) return;

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
        window.EJS_gameUrl = romSigned.signedUrl;
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
      } catch (err) {
        if (cancelled) return;
        setErrorMessage((err as Error).message ?? "Erro desconhecido.");
        setStatus("error");
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id]);

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
