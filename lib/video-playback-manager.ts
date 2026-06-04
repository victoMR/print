/** Orquestador global: reproduce el video más visible (Safari solo tolera uno activo). */

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

const MIN_RATIO = 0.06;
/** Hero conserva prioridad si aún ocupa gran parte del viewport. */
const HERO_HANDOFF_RATIO = 0.35;

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

function syncPlayback(): void {
  syncScheduled = false;
  const winner = pickWinner();

  for (const entry of registry.values()) {
    if (winner && entry.id === winner.id) {
      if (activeId !== entry.id) {
        activeId = entry.id;
        void entry.video.play().catch(() => {
          if (activeId === entry.id) activeId = null;
        });
      }
    } else if (!entry.video.paused) {
      entry.video.pause();
    }
  }

  if (!winner) activeId = null;
}

function scheduleSync(): void {
  if (syncScheduled) return;
  syncScheduled = true;
  requestAnimationFrame(syncPlayback);
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
  if (entry && !entry.video.paused) entry.video.pause();
  registry.delete(id);
  if (activeId === id) activeId = null;
  scheduleSync();
}

export function updateBackgroundVideoVisibility(
  id: string,
  ratio: number,
): void {
  const entry = registry.get(id);
  if (!entry) return;
  entry.ratio = ratio;
  scheduleSync();
}
