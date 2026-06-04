/** Solo un video de fondo activo a la vez (límite Safari/iOS). */
let activeVideo: HTMLVideoElement | null = null;

export async function playBackgroundVideo(video: HTMLVideoElement): Promise<boolean> {
  if (activeVideo && activeVideo !== video && !activeVideo.paused) {
    activeVideo.pause();
  }

  activeVideo = video;

  try {
    await video.play();
    return true;
  } catch {
    if (activeVideo === video) activeVideo = null;
    return false;
  }
}

export function pauseBackgroundVideo(video: HTMLVideoElement): void {
  if (!video.paused) video.pause();
  if (activeVideo === video) activeVideo = null;
}
