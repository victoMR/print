/**
 * Orquestador global de videos de fondo.
 * Safari/iOS solo reproduce de forma fiable un video a la vez, así que
 * elegimos el más visible del viewport y pausamos el resto.
 */

export type VideoTier = "hero" | "feature";

type VideoEntry = {
  id: string;
  video: HTMLVideoElement;
  ratio: number;
  tier: VideoTier;
};

const registry = new Map<string, VideoEntry>();
let activeId: string | null = null;
let syncScheduled = false;

/** Visibilidad mínima para considerar un video reproducible. */
const MIN_RATIO = 0.05;
/** El hero mantiene prioridad mientras ocupe buena parte de la pantalla. */
const HERO_HANDOFF_RATIO = 0.3;

function pickWinner(): VideoEntry | null {
  let hero: VideoEntry | null = null;
  let bestFeature: VideoEntry | null = null;

  for (const entry of registry.values()) {
    if (entry.ratio < MIN_RATIO) continue;
    if (entry.tier === "hero") {
      if (!hero || entry.ratio > hero.ratio) hero = entry;
    } else if (!bestFeature || entry.ratio > bestFeature.ratio) {
      bestFeature = entry;
    }
  }

  if (hero && hero.ratio >= HERO_HANDOFF_RATIO) return hero;
  if (bestFeature) return bestFeature;
  return hero;
}

function ensurePlaying(video: HTMLVideoElement): void {
  if (!video.paused) return;

  const attempt = video.play();
  if (attempt && typeof attempt.then === "function") {
    attempt.catch(() => {
      // Autoplay puede fallar si aún no hay datos: reintenta una vez al poder reproducir.
      const retry = () => {
        video.removeEventListener("canplay", retry);
        video.play().catch(() => {});
      };
      video.addEventListener("canplay", retry, { once: true });
    });
  }
}

function ensurePaused(video: HTMLVideoElement): void {
  if (!video.paused) video.pause();
}

function syncPlayback(): void {
  syncScheduled = false;
  const winner = pickWinner();

  for (const entry of registry.values()) {
    if (winner && entry.id === winner.id) {
      ensurePlaying(entry.video);
    } else {
      ensurePaused(entry.video);
    }
  }

  activeId = winner?.id ?? null;
}

function scheduleSync(): void {
  if (syncScheduled) return;
  syncScheduled = true;
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(syncPlayback);
  } else {
    setTimeout(syncPlayback, 16);
  }
}

export function registerBackgroundVideo(
  id: string,
  video: HTMLVideoElement,
  ratio: number,
  tier: VideoTier,
): void {
  registry.set(id, { id, video, ratio, tier });
  scheduleSync();
}

export function unregisterBackgroundVideo(id: string): void {
  const entry = registry.get(id);
  if (entry) ensurePaused(entry.video);
  registry.delete(id);
  if (activeId === id) activeId = null;
  scheduleSync();
}

export function updateBackgroundVideoVisibility(id: string, ratio: number): void {
  const entry = registry.get(id);
  if (!entry || entry.ratio === ratio) return;
  entry.ratio = ratio;
  scheduleSync();
}
