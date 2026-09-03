// Busca de capas no libretro-thumbnails (repositório público, só imagens de arte —
// nunca ROMs). Tenta algumas variações de nome de arquivo até achar uma que exista.
// Isso é client-side puro (nenhuma autenticação envolvida, é um repo público),
// então pode rodar tanto no componente da estante quanto num script utilitário.

import { SYSTEMS_BY_ID } from "./systems";

export function coverCandidates(systemId: string, gameName: string): string[] {
  const system = SYSTEMS_BY_ID[systemId];
  if (!system?.thumbnailsRepo) return [];
  const base = `https://raw.githubusercontent.com/libretro-thumbnails/${system.thumbnailsRepo}/master/Named_Boxarts/`;
  const variants = [
    `${gameName} (USA).png`,
    `${gameName} (World).png`,
    `${gameName} (Europe).png`,
    `${gameName} (Japan).png`,
    `${gameName} (USA, Europe).png`,
    `${gameName}.png`,
  ];
  return variants.map((v) => base + encodeURIComponent(v));
}

// Tenta cada candidato em sequência num <img>; chama onFound com a URL que carregou,
// ou onExhausted se nenhuma existir. O chamador decide o que fazer com onFound
// (por ex. cachear em games.cover_url pra não reprocurar da próxima vez).
export function attachCover(
  imgEl: HTMLImageElement,
  systemId: string,
  gameName: string,
  onFound: (url: string) => void,
  onExhausted: () => void
) {
  const candidates = coverCandidates(systemId, gameName);
  let i = 0;
  function tryNext() {
    if (i >= candidates.length) {
      onExhausted();
      return;
    }
    imgEl.onerror = () => {
      i++;
      tryNext();
    };
    imgEl.onload = () => onFound(candidates[i]);
    imgEl.src = candidates[i];
  }
  if (candidates.length === 0) {
    onExhausted();
    return;
  }
  tryNext();
}
