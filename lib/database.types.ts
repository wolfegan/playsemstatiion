// Tipos manuais espelhando supabase/schema.sql. Se você preferir, troque por
// `npx supabase gen types typescript` depois que o projeto estiver criado — mantive
// manual por enquanto pra não depender do CLI do Supabase configurado.

// `type`, não `interface` — interfaces não recebem assinatura de índice
// implícita nas checagens estruturais que o postgrest-js faz internamente
// (Row/Insert/Update precisam bater contra Record<string, unknown>), o que
// quebra silenciosamente os tipos de insert()/update() (viram `never`).
export type GameRow = {
  id: string;
  owner_id: string;
  system_id: string;
  title: string;
  original_filename: string;
  file_size_bytes: number;
  storage_path: string;
  // @deprecated não usado mais — BIOS agora é por sistema, não por jogo (ver
  // SystemBiosRow/tabela system_bios). Coluna deixada no banco sem uso pra não
  // mexer no schema já em produção; pode ser removida numa limpeza futura.
  bios_storage_path: string | null;
  cover_url: string | null;
  cover_source: string | null;
  genre: string | null;
  favorite: boolean;
  last_played_at: string | null;
  imported_at: string;
  updated_at: string;
}

// BIOS é por sistema (compartilhada entre todos os jogos daquele sistema),
// não por jogo — um upload de neogeo.zip vale pra qualquer jogo de Neo Geo.
export type SystemBiosRow = {
  id: string;
  owner_id: string;
  system_id: string;
  filename: string;
  storage_path: string;
  uploaded_at: string;
};

export type ControlPrefsRow = {
  id: string;
  owner_id: string;
  system_id: string;
  keyboard_map: Record<string, unknown> | null;
  gamepad_map: Record<string, unknown> | null;
  updated_at: string;
};

// Uma linha por conta (dono ou visitante) — só existe pra RLS decidir quem
// pode escrever. O app só lê a própria linha (`id = auth.uid()`), nunca lista
// todo mundo.
export type ProfileRow = {
  id: string;
  role: "owner" | "visitor";
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      games: {
        Row: GameRow;
        Insert: Omit<
          GameRow,
          | "id"
          | "owner_id"
          | "imported_at"
          | "updated_at"
          | "bios_storage_path"
          | "cover_url"
          | "cover_source"
          | "genre"
          | "favorite"
          | "last_played_at"
        > &
          Partial<
            Pick<
              GameRow,
              | "id"
              | "owner_id"
              | "imported_at"
              | "updated_at"
              | "bios_storage_path"
              | "cover_url"
              | "cover_source"
              | "genre"
              | "favorite"
              | "last_played_at"
            >
          >;
        Update: Partial<GameRow>;
        Relationships: [];
      };
      control_prefs: {
        Row: ControlPrefsRow;
        Insert: Omit<ControlPrefsRow, "id" | "owner_id" | "updated_at"> &
          Partial<Pick<ControlPrefsRow, "id" | "owner_id" | "updated_at">>;
        Update: Partial<ControlPrefsRow>;
        Relationships: [];
      };
      system_bios: {
        Row: SystemBiosRow;
        Insert: Omit<SystemBiosRow, "id" | "owner_id" | "uploaded_at"> &
          Partial<Pick<SystemBiosRow, "id" | "owner_id" | "uploaded_at">>;
        Update: Partial<SystemBiosRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "created_at"> & Partial<Pick<ProfileRow, "created_at">>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
