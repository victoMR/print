/** Pausa otros videos cuando uno empieza (Safari tolera mal varios a la vez). */

const videos = new Map<string, HTMLVideoElement>();

export function trackBackgroundVideo(id: string, video: HTMLVideoElement): void {
  videos.set(id, video);
}

export function untrackBackgroundVideo(id: string): void {
  videos.delete(id);
}

export function pauseOtherBackgroundVideos(activeId: string): void {
  for (const [id, video] of videos) {
    if (id !== activeId && !video.paused) video.pause();
  }
}
