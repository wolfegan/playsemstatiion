"use client";

import { useState } from "react";
import { SYSTEMS } from "@/lib/systems";
import { GENRES } from "@/lib/genres";
import { createClient } from "@/lib/supabase/client";
import type { GameRow } from "@/lib/database.types";

interface EditGameModalProps {
  game: GameRow;
  onClose: () => void;
  onSaved: (game: GameRow) => void;
}

export function EditGameModal({ game, onClose, onSaved }: EditGameModalProps) {
  const [title, setTitle] = useState(game.title);
  const [systemId, setSystemId] = useState(game.system_id);
  const [genre, setGenre] = useState(game.genre ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    try {
      const systemChanged = systemId !== game.system_id;
      const { data, error } = await supabase
        .from("games")
        .update({
          title,
          system_id: systemId,
          genre: genre || null,
          // Se o sistema mudou, a capa cacheada pode estar errada (veio da
          // busca no sistema antigo) — limpa pra tentar de novo do zero.
          ...(systemChanged ? { cover_url: null, cover_source: null } : {}),
        })
        .eq("id", game.id)
        .select()
        .single();
      if (error) throw error;
      onSaved(data);
      onClose();
    } catch (err) {
      alert("Não deu pra salvar. Tente de novo.\n" + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop open">
      <div className="modal">
        <h3>Editar jogo</h3>
        <p className="fname">{game.original_filename}</p>
        <label htmlFor="edit-name">Nome de exibição</label>
        <input id="edit-name" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label htmlFor="edit-system">Sistema</label>
        <select id="edit-system" value={systemId} onChange={(e) => setSystemId(e.target.value)}>
          {SYSTEMS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <label htmlFor="edit-genre">Gênero</label>
        <select id="edit-genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option value="">Sem gênero</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <div className="row">
          <button className="btn ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
