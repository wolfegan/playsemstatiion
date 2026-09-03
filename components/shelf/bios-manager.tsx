"use client";

import { useEffect, useRef, useState } from "react";
import { SYSTEMS } from "@/lib/systems";
import { createClient } from "@/lib/supabase/client";
import type { SystemBiosRow } from "@/lib/database.types";

interface BiosManagerProps {
  ownerId: string;
  onClose: () => void;
}

// Sistemas que têm pelo menos um arquivo de BIOS conhecido no catálogo —
// só esses aparecem aqui. Ver lib/systems.ts para o campo `bios` de cada um.
const SYSTEMS_WITH_BIOS = SYSTEMS.filter((s) => s.bios && s.bios.length > 0);

export function BiosManager({ ownerId, onClose }: BiosManagerProps) {
  const [rows, setRows] = useState<Record<string, SystemBiosRow>>({});
  const [loading, setLoading] = useState(true);
  const [busySystem, setBusySystem] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("system_bios")
      .select("*")
      .then(({ data }) => {
        const bySystem: Record<string, SystemBiosRow> = {};
        for (const row of data ?? []) bySystem[row.system_id] = row;
        setRows(bySystem);
        setLoading(false);
      });
  }, []);

  async function uploadBios(systemId: string, file: File) {
    setBusySystem(systemId);
    const supabase = createClient();
    try {
      const existing = rows[systemId];
      if (existing) {
        // Substitui: apaga o arquivo antigo antes de subir o novo, pra não
        // deixar lixo órfão no Storage.
        await supabase.storage.from("roms").remove([existing.storage_path]);
      }
      const storagePath = `${ownerId}/_bios/${systemId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("roms")
        .upload(storagePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: inserted, error: upsertError } = await supabase
        .from("system_bios")
        .upsert(
          { owner_id: ownerId, system_id: systemId, filename: file.name, storage_path: storagePath },
          { onConflict: "owner_id,system_id" }
        )
        .select()
        .single();
      if (upsertError) throw upsertError;

      setRows((prev) => ({ ...prev, [systemId]: inserted }));
    } catch (err) {
      alert("Falha ao enviar a BIOS. Tente novamente.\n" + (err as Error).message);
    } finally {
      setBusySystem(null);
    }
  }

  async function removeBios(systemId: string) {
    const row = rows[systemId];
    if (!row) return;
    if (!confirm(`Remover a BIOS de ${systemId}? Jogos desse sistema que precisam dela param de funcionar.`)) return;
    setBusySystem(systemId);
    const supabase = createClient();
    try {
      await supabase.storage.from("roms").remove([row.storage_path]);
      await supabase.from("system_bios").delete().eq("id", row.id);
      setRows((prev) => {
        const next = { ...prev };
        delete next[systemId];
        return next;
      });
    } finally {
      setBusySystem(null);
    }
  }

  return (
    <div className="modal-backdrop open">
      <div className="modal" style={{ maxWidth: 560 }}>
        <h3>BIOS por sistema</h3>
        <p className="fname">
          Alguns sistemas precisam de um arquivo de BIOS além da ROM do jogo. É um upload só por
          sistema — vale pra todos os jogos daquele sistema.
        </p>
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-dim)" }}>Carregando...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {SYSTEMS_WITH_BIOS.map((system) => {
              const row = rows[system.id];
              const busy = busySystem === system.id;
              const requiredNames = system.bios!.filter((b) => b.required).map((b) => b.filename);
              return (
                <div
                  key={system.id}
                  className="bios-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "8px 10px",
                    background: "var(--void)",
                    border: "2px solid var(--chrome-lo)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: "var(--ink)" }}>{system.label}</div>
                    <div style={{ fontSize: 11, color: row ? "var(--lime)" : "var(--ink-dim)" }}>
                      {row
                        ? row.filename
                        : requiredNames.length
                          ? `sem BIOS — precisa de ${requiredNames.join(" ou ")}`
                          : "sem BIOS (opcional)"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flex: "none" }}>
                    <input
                      ref={(el) => {
                        fileInputs.current[system.id] = el;
                      }}
                      type="file"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadBios(system.id, file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      className="btn ghost"
                      style={{ fontSize: 11, padding: "6px 10px" }}
                      disabled={busy}
                      onClick={() => fileInputs.current[system.id]?.click()}
                    >
                      {busy ? "..." : row ? "Substituir" : "Enviar"}
                    </button>
                    {row && (
                      <button
                        className="btn ghost"
                        style={{ fontSize: 11, padding: "6px 10px" }}
                        disabled={busy}
                        onClick={() => removeBios(system.id)}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="row">
          <button className="btn" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
