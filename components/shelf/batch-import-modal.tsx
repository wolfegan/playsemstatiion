"use client";

import { useMemo, useState } from "react";
import { SYSTEMS, guessSystemId } from "@/lib/systems";
import { GENRES } from "@/lib/genres";
import { createClient } from "@/lib/supabase/client";
import type { GameRow } from "@/lib/database.types";

interface BatchImportModalProps {
  files: File[];
  ownerId: string;
  onClose: () => void;
  onImported: (games: GameRow[]) => void;
}

interface ReviewRow {
  key: string;
  file: File;
  systemId: string;
  title: string;
  genre: string;
  selected: boolean;
}

type RowStatus = "pending" | "uploading" | "done" | "error";

function stripExt(name: string) {
  return name.replace(/\.[^/.]+$/, "");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

// Revisão em lote antes de importar (roadmap item 11): pensado pra quando você
// seleciona muitos arquivos de uma vez (ex: uma pasta inteira) e quer conferir/
// ajustar sistema e nome, e sobretudo ESCOLHER um subconjunto — útil enquanto o
// Storage estiver no plano gratuito e a coleção completa não couber.
export function BatchImportModal({ files, ownerId, onClose, onImported }: BatchImportModalProps) {
  const [rows, setRows] = useState<ReviewRow[]>(() =>
    files.map((file, i) => ({
      key: `${file.name}_${file.size}_${i}`,
      file,
      systemId: guessSystemId(file.name),
      title: stripExt(file.name),
      genre: "",
      selected: true,
    }))
  );
  const [phase, setPhase] = useState<"review" | "importing" | "done">("review");
  const [bulkSystem, setBulkSystem] = useState(SYSTEMS[0].id);
  const [bulkGenre, setBulkGenre] = useState<string>(GENRES[0]);
  const [statuses, setStatuses] = useState<Record<string, { status: RowStatus; error?: string }>>({});

  const selectedRows = rows.filter((r) => r.selected);
  const totalSelectedBytes = useMemo(
    () => selectedRows.reduce((sum, r) => sum + r.file.size, 0),
    [selectedRows]
  );
  const doneCount = Object.values(statuses).filter((s) => s.status === "done").length;
  const errorRows = Object.entries(statuses).filter(([, s]) => s.status === "error");

  function updateRow(key: string, patch: Partial<ReviewRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function toggleAll(selected: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, selected })));
  }

  function applyBulkSystem() {
    setRows((prev) => prev.map((r) => (r.selected ? { ...r, systemId: bulkSystem } : r)));
  }

  function applyBulkGenre() {
    setRows((prev) => prev.map((r) => (r.selected ? { ...r, genre: bulkGenre } : r)));
  }

  async function startImport() {
    setPhase("importing");
    const supabase = createClient();
    const imported: GameRow[] = [];

    // Sequencial, não em paralelo: com centenas de arquivos, subir tudo de
    // uma vez sobrecarrega a conexão e deixa o progresso ilegível. Um por vez
    // é mais lento, mas dá pra mostrar exatamente o que passou e o que falhou.
    for (const row of selectedRows) {
      setStatuses((prev) => ({ ...prev, [row.key]: { status: "uploading" } }));
      try {
        const id = crypto.randomUUID();
        const storagePath = `${ownerId}/${row.systemId}/${id}/${row.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("roms")
          .upload(storagePath, row.file, { upsert: false });
        if (uploadError) throw uploadError;

        const { data: inserted, error: insertError } = await supabase
          .from("games")
          .insert({
            id,
            owner_id: ownerId,
            system_id: row.systemId,
            title: row.title || stripExt(row.file.name),
            genre: row.genre || null,
            original_filename: row.file.name,
            file_size_bytes: row.file.size,
            storage_path: storagePath,
          })
          .select()
          .single();
        if (insertError) throw insertError;

        imported.push(inserted);
        setStatuses((prev) => ({ ...prev, [row.key]: { status: "done" } }));
      } catch (err) {
        setStatuses((prev) => ({
          ...prev,
          [row.key]: { status: "error", error: (err as Error).message },
        }));
      }
      // Repassa pra estante o que já deu certo a cada passo, em vez de esperar
      // o lote inteiro terminar — se a aba fechar no meio, o que já subiu fica.
      if (imported.length) onImported([...imported]);
    }
    setPhase("done");
  }

  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  return (
    <div className="modal-backdrop open">
      <div className="modal modal-lg">
        <h3>
          {phase === "review" && `Revisar importação (${files.length} arquivo${files.length === 1 ? "" : "s"})`}
          {phase === "importing" && `Importando... (${doneCount}/${selectedRows.length})`}
          {phase === "done" && `Importação concluída`}
        </h3>

        {phase === "review" && (
          <>
            <p className="fname">
              Desmarque o que você não quer subir agora — útil se o Storage ainda estiver no plano
              gratuito e não couber tudo de uma vez. Arquivos `.zip` de sistemas de cartucho podem
              vir marcados como Arcade por padrão — corrija com o atalho abaixo se precisar.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              <select
                value={bulkSystem}
                onChange={(e) => setBulkSystem(e.target.value)}
                style={{ marginBottom: 0, fontSize: 12, padding: "6px 8px", flex: "1 1 160px", width: "auto" }}
              >
                {SYSTEMS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                className="btn ghost"
                style={{ fontSize: 11, padding: "6px 10px", flex: "none" }}
                onClick={applyBulkSystem}
              >
                Aplicar aos marcados
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              <select
                value={bulkGenre}
                onChange={(e) => setBulkGenre(e.target.value)}
                style={{ marginBottom: 0, fontSize: 12, padding: "6px 8px", flex: "1 1 160px", width: "auto" }}
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <button
                className="btn ghost"
                style={{ fontSize: 11, padding: "6px 10px", flex: "none" }}
                onClick={applyBulkGenre}
              >
                Aplicar gênero aos marcados
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead style={{ position: "sticky", top: 0, background: "var(--panel-2)" }}>
                  <tr>
                    <th style={{ padding: 8, textAlign: "left" }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                        aria-label="Selecionar todos"
                      />
                    </th>
                    <th style={{ padding: 8, textAlign: "left" }}>Arquivo</th>
                    <th style={{ padding: 8, textAlign: "left" }}>Sistema</th>
                    <th style={{ padding: 8, textAlign: "left" }}>Nome</th>
                    <th style={{ padding: 8, textAlign: "left" }}>Gênero</th>
                    <th style={{ padding: 8, textAlign: "right" }}>Tamanho</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} style={{ borderTop: "1px solid var(--panel-2)" }}>
                      <td style={{ padding: 8 }}>
                        <input
                          type="checkbox"
                          checked={r.selected}
                          onChange={(e) => updateRow(r.key, { selected: e.target.checked })}
                          aria-label={`Incluir ${r.file.name}`}
                        />
                      </td>
                      <td style={{ padding: 8, color: "var(--ink-dim)", wordBreak: "break-all" }}>{r.file.name}</td>
                      <td style={{ padding: 8 }}>
                        <select
                          value={r.systemId}
                          onChange={(e) => updateRow(r.key, { systemId: e.target.value })}
                          style={{ marginBottom: 0, fontSize: 12, padding: "4px 6px" }}
                        >
                          {SYSTEMS.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.short}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: 8 }}>
                        <input
                          type="text"
                          value={r.title}
                          onChange={(e) => updateRow(r.key, { title: e.target.value })}
                          style={{ marginBottom: 0, fontSize: 12, padding: "4px 6px" }}
                        />
                      </td>
                      <td style={{ padding: 8 }}>
                        <select
                          value={r.genre}
                          onChange={(e) => updateRow(r.key, { genre: e.target.value })}
                          style={{ marginBottom: 0, fontSize: 12, padding: "4px 6px" }}
                        >
                          <option value="">—</option>
                          {GENRES.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: 8, textAlign: "right", color: "var(--ink-dim)" }}>
                        {formatBytes(r.file.size)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 16px" }}>
              {selectedRows.length} selecionado{selectedRows.length === 1 ? "" : "s"} · {formatBytes(totalSelectedBytes)}{" "}
              no total
            </p>
            <div className="row">
              <button className="btn ghost" onClick={onClose}>
                Cancelar
              </button>
              <button className="btn" onClick={startImport} disabled={selectedRows.length === 0}>
                Importar {selectedRows.length || ""}
              </button>
            </div>
          </>
        )}

        {(phase === "importing" || phase === "done") && (
          <>
            <div className="table-scroll">
              <table>
                <tbody>
                  {selectedRows.map((r) => {
                    const s = statuses[r.key]?.status ?? "pending";
                    const color =
                      s === "done" ? "var(--lime)" : s === "error" ? "var(--orange)" : "var(--ink-dim)";
                    const label =
                      s === "done" ? "OK" : s === "error" ? "FALHOU" : s === "uploading" ? "..." : "aguardando";
                    const errorDetail = statuses[r.key]?.error;
                    return (
                      <tr key={r.key} style={{ borderTop: "1px solid var(--panel-2)" }}>
                        <td style={{ padding: 8, wordBreak: "break-all" }}>
                          {r.file.name}
                          {errorDetail && (
                            <div style={{ color: "var(--orange)", fontSize: 11, marginTop: 2 }}>{errorDetail}</div>
                          )}
                        </td>
                        <td style={{ padding: 8, textAlign: "right", color, textTransform: "uppercase", verticalAlign: "top" }}>
                          {label}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {phase === "done" && (
              <p style={{ fontSize: 12, color: errorRows.length ? "var(--orange)" : "var(--lime)", margin: "0 0 16px" }}>
                {doneCount} importado{doneCount === 1 ? "" : "s"}
                {errorRows.length > 0 && ` · ${errorRows.length} falharam (veja acima)`}
              </p>
            )}
            <div className="row">
              <button className="btn" onClick={onClose} disabled={phase === "importing"}>
                {phase === "importing" ? "Importando..." : "Fechar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
