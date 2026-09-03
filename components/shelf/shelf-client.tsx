"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SYSTEMS } from "@/lib/systems";
import { GENRES } from "@/lib/genres";
import { createClient } from "@/lib/supabase/client";
import type { GameRow } from "@/lib/database.types";
import { GameCard } from "./game-card";
import { BatchImportModal } from "./batch-import-modal";
import { BiosManager } from "./bios-manager";
import { EditGameModal } from "./edit-game-modal";
import { SiteFooter } from "@/components/site-footer";

interface ShelfClientProps {
  initialGames: GameRow[];
  ownerId: string;
}

type SortOption = "recent" | "title" | "played";

export function ShelfClient({ initialGames, ownerId }: ShelfClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [games, setGames] = useState(initialGames);
  const [activeFilter, setActiveFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [batchFiles, setBatchFiles] = useState<File[] | null>(null);
  const [showBiosManager, setShowBiosManager] = useState(false);
  const [editingGame, setEditingGame] = useState<GameRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDragOver(e: DragEvent) {
      e.preventDefault();
    }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) setBatchFiles(files);
    }
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  function addImportedGames(newGames: GameRow[]) {
    setGames((prev) => {
      const existingIds = new Set(prev.map((g) => g.id));
      const merged = [...prev];
      for (const g of newGames) {
        if (!existingIds.has(g.id)) merged.push(g);
      }
      return merged;
    });
  }

  async function removeRom(game: GameRow) {
    if (!confirm(`Remover "${game.title}" da estante? Isso apaga o arquivo do Storage.`)) return;
    const { error: storageError } = await supabase.storage.from("roms").remove([game.storage_path]);
    if (storageError) {
      alert("Não deu pra apagar o arquivo. Tente de novo.\n" + storageError.message);
      return;
    }
    const { error: dbError } = await supabase.from("games").delete().eq("id", game.id);
    if (dbError) {
      alert("Arquivo removido, mas o registro não. Tente de novo.\n" + dbError.message);
      return;
    }
    setGames((prev) => prev.filter((g) => g.id !== game.id));
  }

  function toggleFavorite(game: GameRow) {
    const nextValue = !game.favorite;
    // Otimista: atualiza a tela na hora, sem esperar o servidor confirmar.
    setGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, favorite: nextValue } : g)));
    supabase
      .from("games")
      .update({ favorite: nextValue })
      .eq("id", game.id)
      .then(({ error }) => {
        if (error) {
          // Desfaz se der errado.
          setGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, favorite: !nextValue } : g)));
        }
      });
  }

  function launch(game: GameRow) {
    // Best-effort: registra "jogado agora" antes de navegar. Não espera a
    // resposta (a navegação não pode ficar lenta por causa disso) — no pior
    // caso, raramente, o registro de "jogado recentemente" não pega essa vez.
    supabase.from("games").update({ last_played_at: new Date().toISOString() }).eq("id", game.id).then(() => {});
    // Navegação completa (não router.push): o EmulatorJS deixa variáveis
    // globais não-configuráveis em window depois que roda — trocar de jogo
    // sem recarregar a página faz o próximo core esbarrar nesse resíduo e
    // falhar ao iniciar. Um reload de verdade garante estado limpo sempre.
    window.location.href = `/play/${game.id}`;
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const usedSystemIds = new Set(games.map((g) => g.system_id));
  const tabItems = [{ id: "all", short: "Todos" }, ...SYSTEMS.filter((s) => usedSystemIds.has(s.id))];
  const usedGenres = GENRES.filter((g) => games.some((game) => game.genre === g));

  const recentlyPlayed = useMemo(
    () =>
      games
        .filter((g) => g.last_played_at)
        .sort((a, b) => (b.last_played_at ?? "").localeCompare(a.last_played_at ?? ""))
        .slice(0, 8),
    [games]
  );

  const showRecentlyPlayed =
    recentlyPlayed.length > 0 &&
    activeFilter === "all" &&
    genreFilter === "all" &&
    !favoritesOnly &&
    !search.trim();

  const visibleGames = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = games.filter((g) => {
      if (activeFilter !== "all" && g.system_id !== activeFilter) return false;
      if (genreFilter !== "all" && g.genre !== genreFilter) return false;
      if (favoritesOnly && !g.favorite) return false;
      if (q && !g.title.toLowerCase().includes(q)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title, "pt-BR");
      if (sortBy === "played") return (b.last_played_at ?? "").localeCompare(a.last_played_at ?? "");
      return b.imported_at.localeCompare(a.imported_at);
    });
    return list;
  }, [games, activeFilter, genreFilter, favoritesOnly, search, sortBy]);

  return (
    <>
      <header className="app-header">
        <div className="marquee" style={{ fontSize: 16 }}>
          PLAY<span className="marquee-accent">SEM</span>STATION
        </div>
        <div className="tabs" role="tablist" aria-label="Sistemas">
          {tabItems.map((it) => (
            <button
              key={it.id}
              className="tab"
              role="tab"
              aria-selected={activeFilter === it.id}
              onClick={() => setActiveFilter(it.id)}
            >
              {it.short}
            </button>
          ))}
        </div>
        <div className="header-actions">
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            + Adicionar ROM
          </button>
          <button className="btn ghost" onClick={() => folderInputRef.current?.click()}>
            + Importar pasta
          </button>
          <button className="btn ghost" onClick={() => setShowBiosManager(true)}>
            BIOS
          </button>
          <button className="btn ghost" onClick={logout}>
            Sair
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) setBatchFiles(files);
            e.target.value = "";
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error -- webkitdirectory não tem tipo oficial no DOM lib, mas é suportado em Chrome/Edge/Firefox.
          webkitdirectory=""
          style={{ display: "none" }}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) setBatchFiles(files);
            e.target.value = "";
          }}
        />
      </header>

      {games.length > 0 && (
        <div className="shelf-toolbar">
          <input
            type="text"
            className="toolbar-search"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar jogo"
          />
          <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} aria-label="Filtrar por gênero">
            <option value="all">Todos os gêneros</option>
            {usedGenres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} aria-label="Ordenar por">
            <option value="recent">Mais recentes</option>
            <option value="title">Nome (A-Z)</option>
            <option value="played">Jogados recentemente</option>
          </select>
          <button
            className="tab"
            aria-pressed={favoritesOnly}
            aria-selected={favoritesOnly}
            onClick={() => setFavoritesOnly((v) => !v)}
          >
            ★ Favoritos
          </button>
        </div>
      )}

      <main className="library">
        {games.length === 0 ? (
          <div className="empty-state">
            <h2>Sua estante está vazia</h2>
            <p>
              Adicione ROMs que você já possui. Elas ficam guardadas no seu Storage privado do
              Supabase, atrás da sua senha — nada é compartilhado ou público.
            </p>
            <button className="btn" onClick={() => fileInputRef.current?.click()}>
              Adicionar ROM
            </button>
          </div>
        ) : (
          <>
            {showRecentlyPlayed && (
              <section className="shelf-section">
                <h2 className="shelf-section-title">Jogados recentemente</h2>
                <div className="grid grid-strip">
                  {recentlyPlayed.map((g) => (
                    <GameCard
                      key={"recent-" + g.id}
                      game={g}
                      onLaunch={launch}
                      onDelete={removeRom}
                      onEdit={setEditingGame}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              </section>
            )}

            {visibleGames.length === 0 ? (
              <div className="empty-state">
                <h2>Nenhum jogo encontrado</h2>
                <p>Ajuste a busca, o gênero ou o filtro de favoritos.</p>
              </div>
            ) : (
              <section className="shelf-section">
                {showRecentlyPlayed && <h2 className="shelf-section-title">Todos os jogos</h2>}
                <div className="grid">
                  {visibleGames.map((g) => (
                    <GameCard
                      key={g.id}
                      game={g}
                      onLaunch={launch}
                      onDelete={removeRom}
                      onEdit={setEditingGame}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <SiteFooter />

      {batchFiles && (
        <BatchImportModal
          files={batchFiles}
          ownerId={ownerId}
          onClose={() => setBatchFiles(null)}
          onImported={addImportedGames}
        />
      )}

      {showBiosManager && <BiosManager ownerId={ownerId} onClose={() => setShowBiosManager(false)} />}

      {editingGame && (
        <EditGameModal
          game={editingGame}
          onClose={() => setEditingGame(null)}
          onSaved={(updated) => setGames((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))}
        />
      )}
    </>
  );
}
