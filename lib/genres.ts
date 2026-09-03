// Gêneros pré-definidos, estilo frontend de fliperama (RetroBat/EmulationStation).
// Lista fixa e curta de propósito — fácil de escolher no import/edição, sem
// virar um campo de texto livre bagunçado.
export const GENRES = [
  "Ação",
  "Aventura",
  "RPG",
  "Plataforma",
  "Luta",
  "Tiro",
  "Corrida",
  "Esporte",
  "Puzzle",
  "Estratégia",
  "Terror",
  "Outro",
] as const;

export type Genre = (typeof GENRES)[number];
