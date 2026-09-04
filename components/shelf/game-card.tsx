"use client";

import { useEffect, useRef, useState } from "react";
import { SYSTEMS_BY_ID } from "@/lib/systems";
import { attachCover } from "@/lib/thumbnails";
import { createClient } from "@/lib/supabase/client";
import type { GameRow } from "@/lib/database.types";

interface GameCardProps {
  game: GameRow;
  isOwner: boolean;
  onLaunch: (game: GameRow) => void;
  onDelete: (game: GameRow) => void;
  onEdit: (game: GameRow) => void;
  onToggleFavorite: (game: GameRow) => void;
}

export function GameCard({ game, isOwner, onLaunch, onDelete, onEdit, onToggleFavorite }: GameCardProps) {
  const system = SYSTEMS_BY_ID[game.system_id];
  const imgRef = useRef<HTMLImageElement>(null);
  const [coverUrl, setCoverUrl] = useState(game.cover_url);
  const [showFallback, setShowFallback] = useState(!game.cover_url);

  // Se o registro do jogo mudar por fora (ex.: editou o sistema e limpamos o
  // cover_url), ressincroniza o estado local pra tentar buscar a capa de novo.
  useEffect(() => {
    setCoverUrl(game.cover_url);
    setShowFallback(!game.cover_url);
  }, [game.cover_url, game.id]);

  useEffect(() => {
    if (coverUrl || !imgRef.current) return;
    attachCover(
      imgRef.current,
      game.system_id,
      game.title,
      (url) => {
        setCoverUrl(url);
        setShowFallback(false);
        // Cacheia a URL encontrada — próxima vez não precisa reprocurar.
        // Visitante não tem permissão de UPDATE (RLS) e nem precisa: quem já
        // vai cachear essa capa pra todo mundo é o dono, na visita dele.
        if (!isOwner) return;
        const supabase = createClient();
        const patch = { cover_url: url, cover_source: "libretro-thumbnails" };
        supabase
          .from("games")
          .update(patch)
          .eq("id", game.id)
          .then(() => {});
      },
      () => setShowFallback(true)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverUrl, game.system_id, game.title, isOwner]);

  return (
    <div className="card" onClick={() => onLaunch(game)}>
      <div className="cover" style={{ background: system?.color ?? "#8d87ab" }}>
        <span className="sys-tag" style={{ background: system?.color ?? "#8d87ab" }}>
          {system?.short ?? game.system_id}
        </span>
        {isOwner && (
          <>
            <button
              className="action-btn action-edit"
              title="Editar"
              aria-label="Editar jogo"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(game);
              }}
            >
              ✎
            </button>
            <button
              className="action-btn action-delete"
              title="Remover"
              aria-label="Remover jogo"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(game);
              }}
            >
              ×
            </button>
            <button
              className={`action-favorite${game.favorite ? " is-favorite" : ""}`}
              title={game.favorite ? "Remover dos favoritos" : "Marcar como favorito"}
              aria-label={game.favorite ? "Remover dos favoritos" : "Marcar como favorito"}
              aria-pressed={game.favorite}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(game);
              }}
            >
              {game.favorite ? "★" : "☆"}
            </button>
          </>
        )}
        {/* Visitante não pode favoritar, mas ainda vê o que o dono já marcou
            — só não é clicável (não é <button>, não muda nada). */}
        {!isOwner && game.favorite && (
          <span className="action-favorite is-favorite" aria-hidden="true" style={{ cursor: "default", opacity: 1 }}>
            ★
          </span>
        )}
        {showFallback && <div className="fallback">{system?.short ?? game.system_id}</div>}
        <img
          ref={imgRef}
          alt=""
          style={{ display: showFallback ? "none" : "block" }}
          src={coverUrl ?? undefined}
          onError={() => {
            // URL cacheada parou de existir (raro) — volta a tentar do zero.
            setCoverUrl(null);
            setShowFallback(true);
          }}
        />
      </div>
      <div className="card-body">
        <div className="card-title">{game.title}</div>
        <div className="card-sys">
          {system?.label ?? game.system_id}
          {game.genre && <span className="card-genre"> · {game.genre}</span>}
        </div>
      </div>
    </div>
  );
}
