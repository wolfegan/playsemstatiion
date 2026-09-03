// Catálogo dos sistemas suportados. Isto é configuração de app (revisada em código,
// não dado de usuário) — por isso vive aqui e não numa tabela do Supabase.
//
// Para adicionar um sistema novo: adicione uma entrada abaixo. Nada mais no app
// precisa mudar (grade, filtro por aba, upload, launch do EmulatorJS já leem daqui).
//
// Fontes:
// - lista de cores: https://emulatorjs.org/docs/cores (reconferir periodicamente,
//   a lib evolui)
// - `thumbnailsRepo`: nome da pasta correspondente em
//   https://github.com/libretro-thumbnails — os nomes exatos podem mudar; se uma
//   capa nunca for encontrada para um sistema, o primeiro lugar a checar é aqui.
//
// `maxPlayers` é a MELHOR ESTIMATIVA, não um fato validado — depende do core e,
// em alguns casos, do jogo (ex.: multitap). `maxPlayersConfirmed: false` significa
// "ainda não testamos isso na prática" — a UI deve tratar esse número como
// aproximado ("até N jogadores") enquanto não for validado (ver roadmap, item 7).

export type SystemCategory = "cartridge" | "optical" | "arcade";

export interface BiosRequirement {
  filename: string;
  required: boolean;
}

export interface SystemConfig {
  id: string;
  label: string;
  short: string;
  core: string;
  extensions: string[];
  category: SystemCategory;
  thumbnailsRepo: string | null;
  bios?: BiosRequirement[];
  maxPlayers: number;
  maxPlayersConfirmed: boolean;
  color: string; // acento de cor pra badge/tag do sistema na estante
}

export const SYSTEMS: SystemConfig[] = [
  {
    id: "nes",
    label: "Nintendo Entertainment System",
    short: "NES",
    core: "fceumm",
    extensions: ["nes", "fds", "unf"],
    category: "cartridge",
    thumbnailsRepo: "Nintendo_-_Nintendo_Entertainment_System",
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#ff2ec4",
  },
  {
    id: "snes",
    label: "Super Nintendo",
    short: "SNES",
    core: "snes9x",
    extensions: ["sfc", "smc", "fig", "swc"],
    category: "cartridge",
    thumbnailsRepo: "Nintendo_-_Super_Nintendo_Entertainment_System",
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#00c8ff",
  },
  {
    id: "gb",
    label: "Game Boy",
    short: "GB",
    core: "gambatte",
    extensions: ["gb"],
    category: "cartridge",
    thumbnailsRepo: "Nintendo_-_Game_Boy",
    maxPlayers: 1,
    maxPlayersConfirmed: true,
    color: "#ccff2e",
  },
  {
    id: "gbc",
    label: "Game Boy Color",
    short: "GBC",
    core: "gambatte",
    extensions: ["gbc"],
    category: "cartridge",
    thumbnailsRepo: "Nintendo_-_Game_Boy_Color",
    maxPlayers: 1,
    maxPlayersConfirmed: true,
    color: "#ff8a1e",
  },
  {
    id: "gba",
    label: "Game Boy Advance",
    short: "GBA",
    core: "mgba",
    extensions: ["gba"],
    category: "cartridge",
    thumbnailsRepo: "Nintendo_-_Game_Boy_Advance",
    bios: [{ filename: "gba_bios.bin", required: false }],
    maxPlayers: 1,
    maxPlayersConfirmed: true,
    color: "#9a4bff",
  },
  {
    id: "n64",
    label: "Nintendo 64",
    short: "N64",
    core: "mupen64plus_next",
    extensions: ["n64", "z64"],
    category: "cartridge",
    thumbnailsRepo: "Nintendo_-_Nintendo_64",
    maxPlayers: 4,
    maxPlayersConfirmed: false,
    color: "#ff2ec4",
  },
  {
    id: "nds",
    label: "Nintendo DS",
    short: "NDS",
    core: "melonds",
    extensions: ["nds"],
    category: "cartridge",
    thumbnailsRepo: "Nintendo_-_Nintendo_DS",
    bios: [{ filename: "bios7.bin", required: false }, { filename: "bios9.bin", required: false }, { filename: "firmware.bin", required: false }],
    maxPlayers: 1,
    maxPlayersConfirmed: true,
    color: "#00c8ff",
  },
  {
    id: "genesis",
    label: "Mega Drive / Genesis",
    short: "Genesis",
    core: "genesis_plus_gx",
    extensions: ["md", "gen", "smd", "bin"],
    category: "cartridge",
    thumbnailsRepo: "Sega_-_Mega_Drive_-_Genesis",
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#ccff2e",
  },
  {
    id: "mastersystem",
    label: "Master System",
    short: "SMS",
    core: "genesis_plus_gx",
    extensions: ["sms"],
    category: "cartridge",
    thumbnailsRepo: "Sega_-_Master_System_-_Mark_III",
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#ff8a1e",
  },
  {
    id: "gamegear",
    label: "Game Gear",
    short: "GG",
    core: "genesis_plus_gx",
    extensions: ["gg"],
    category: "cartridge",
    thumbnailsRepo: "Sega_-_Game_Gear",
    maxPlayers: 1,
    maxPlayersConfirmed: true,
    color: "#9a4bff",
  },
  {
    id: "segacd",
    label: "Sega CD",
    short: "Sega CD",
    core: "genesis_plus_gx",
    extensions: ["cue", "bin", "iso"],
    category: "optical",
    thumbnailsRepo: "Sega_-_Mega-CD_-_Sega_CD",
    bios: [{ filename: "bios_CD_U.bin", required: true }],
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#ff2ec4",
  },
  {
    id: "32x",
    label: "32X",
    short: "32X",
    core: "picodrive",
    extensions: ["32x"],
    category: "cartridge",
    thumbnailsRepo: "Sega_-_32X",
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#00c8ff",
  },
  {
    id: "saturn",
    label: "Saturn",
    short: "Saturn",
    core: "yabause",
    extensions: ["cue", "bin", "iso"],
    category: "optical",
    thumbnailsRepo: "Sega_-_Saturn",
    bios: [{ filename: "saturn_bios.bin", required: true }],
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#ccff2e",
  },
  {
    id: "psx",
    label: "PlayStation",
    short: "PS1",
    core: "pcsx_rearmed",
    extensions: ["cue", "bin", "iso", "pbp"],
    category: "optical",
    thumbnailsRepo: "Sony_-_PlayStation",
    bios: [
      { filename: "scph5501.bin", required: true },
      { filename: "scph5500.bin", required: false },
      { filename: "scph5502.bin", required: false },
    ],
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#ff8a1e",
  },
  {
    id: "psp",
    label: "PSP",
    short: "PSP",
    core: "ppsspp",
    extensions: ["iso", "cso"],
    category: "optical",
    thumbnailsRepo: "Sony_-_PlayStation_Portable",
    maxPlayers: 1,
    maxPlayersConfirmed: true,
    color: "#9a4bff",
  },
  {
    id: "atari2600",
    label: "Atari 2600",
    short: "2600",
    core: "stella2014",
    extensions: ["a26", "bin"],
    category: "cartridge",
    thumbnailsRepo: "Atari_-_2600",
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#ff2ec4",
  },
  {
    id: "atari5200",
    label: "Atari 5200",
    short: "5200",
    core: "a5200",
    extensions: ["a52", "bin"],
    category: "cartridge",
    thumbnailsRepo: "Atari_-_5200",
    bios: [{ filename: "5200.rom", required: true }],
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#00c8ff",
  },
  {
    id: "atari7800",
    label: "Atari 7800",
    short: "7800",
    core: "prosystem",
    extensions: ["a78", "bin"],
    category: "cartridge",
    thumbnailsRepo: "Atari_-_7800",
    bios: [{ filename: "7800 BIOS (U).rom", required: false }],
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#ccff2e",
  },
  {
    id: "lynx",
    label: "Atari Lynx",
    short: "Lynx",
    core: "handy",
    extensions: ["lnx"],
    category: "cartridge",
    thumbnailsRepo: "Atari_-_Lynx",
    bios: [{ filename: "lynxboot.img", required: false }],
    maxPlayers: 1,
    maxPlayersConfirmed: true,
    color: "#ff8a1e",
  },
  {
    id: "jaguar",
    label: "Atari Jaguar",
    short: "Jaguar",
    core: "virtualjaguar",
    extensions: ["jag", "j64"],
    category: "cartridge",
    thumbnailsRepo: "Atari_-_Jaguar",
    maxPlayers: 1,
    maxPlayersConfirmed: false,
    color: "#9a4bff",
  },
  {
    id: "coleco",
    label: "ColecoVision",
    short: "Coleco",
    core: "gearcoleco",
    extensions: ["col"],
    category: "cartridge",
    thumbnailsRepo: "Coleco_-_ColecoVision",
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#ff2ec4",
  },
  {
    // FBNeo cobre bem Capcom (CPS1/CPS2/CPS3 — Street Fighter) e SNK Neo Geo
    // (King of Fighters, Metal Slug, Fatal Fury...). Cada romset precisa bater
    // exatamente com a versão do FBNeo que o EmulatorJS usa — um .zip "quase
    // certo" de outra versão do MAME/FBNeo normalmente não boota.
    id: "arcade",
    label: "Arcade (FBNeo — Capcom/SNK)",
    short: "Arcade",
    core: "fbneo",
    extensions: ["zip"],
    category: "arcade",
    thumbnailsRepo: "FBNeo_-_Arcade_Games",
    // Jogos de Neo Geo (ex.: King of Fighters) exigem essa BIOS do sistema
    // além da ROM do jogo em si; jogos de CPS (Street Fighter) não precisam.
    // Obrigatória de verdade: sem ela o FBNeo carrega o core inteiro (o que é
    // lento, o core é grande) e só então falha com um erro críptico de "ROM
    // faltando" — melhor avisar antes de gastar esse tempo todo.
    bios: [{ filename: "neogeo.zip", required: true }],
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#00c8ff",
  },
  {
    // Placas que o FBNeo não cobre bem — ex.: Mortal Kombat original roda em
    // hardware Midway, mais coberto pelo MAME do que pelo FBNeo. Mesma
    // exigência de romset exato pra versão do core.
    id: "arcade_mame",
    label: "Arcade (MAME — outras placas)",
    short: "MAME",
    core: "mame2003_plus",
    extensions: ["zip"],
    category: "arcade",
    thumbnailsRepo: "MAME",
    // Experimento: MAME2003+ é uma implementação diferente do FBNeo pro Neo
    // Geo, então pode não bater no mesmo crash de WASM ("table index out of
    // bounds") que o FBNeo dá. `required: false` porque nem todo jogo desse
    // sistema é Neo Geo (o MAME também cobre outras placas) — se a BIOS
    // estiver enviada ela é anexada, se não, o jogo tenta carregar sem ela
    // normalmente (só falha se de fato precisar).
    bios: [{ filename: "neogeo.zip", required: false }],
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#9a4bff",
  },
  {
    id: "msx",
    label: "MSX",
    short: "MSX",
    core: "bluemsx",
    extensions: ["rom", "mx1", "mx2", "dsk"],
    category: "cartridge",
    thumbnailsRepo: "Microsoft_-_MSX",
    maxPlayers: 2,
    maxPlayersConfirmed: false,
    color: "#ccff2e",
  },
];

export const SYSTEMS_BY_ID: Record<string, SystemConfig> = Object.fromEntries(
  SYSTEMS.map((s) => [s.id, s])
);

export function guessSystemId(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const hit = SYSTEMS.find((s) => s.extensions.includes(ext));
  return hit ? hit.id : SYSTEMS[0].id;
}
