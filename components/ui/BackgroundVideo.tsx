"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  pauseOtherBackgroundVideos,
  trackBackgroundVideo,
  untrackBackgroundVideo,
} from "@/lib/video-playback-manager";

type BackgroundVideoProps = {
  src: string;
  srcHd?: string;
  poster: string;
  className?: string;
  videoClassName?: string;
  /** Pausar al quitar el cursor (solo desktop). */
  pauseOnLeave?: boolean;
  preload?: "none" | "metadata" | "auto";
};

function configureSafariVideo(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.setAttribute("x-webkit-airplay", "deny");
  video.controls = false;
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
}

export function BackgroundVideo({
  src,
  srcHd,
  poster,
  className,
  videoClassName,
  pauseOnLeave = true,
  preload = "metadata",
}: BackgroundVideoProps) {
  const instanceId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hdSrc, setHdSrc] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const resolvedSrc = hdSrc && srcHd ? srcHd : src;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setCanHover(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  useEffect(() => {
    if (!srcHd || reducedMotion) return;
    const mq = window.matchMedia("(min-width: 768px) and (min-resolution: 2dppx)");
    setHdSrc(mq.matches);
    const onChange = () => setHdSrc(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [srcHd, reducedMotion]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;

    configureSafariVideo(video);
    if (video.src !== resolvedSrc) {
      video.src = resolvedSrc;
      video.load();
    }

    trackBackgroundVideo(instanceId, video);

    const onPlaying = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      untrackBackgroundVideo(instanceId);
      video.pause();
    };
  }, [reducedMotion, resolvedSrc, instanceId]);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;

    configureSafariVideo(video);
    if (video.src !== resolvedSrc) {
      video.src = resolvedSrc;
      video.load();
    }

    pauseOtherBackgroundVideos(instanceId);

    try {
      await video.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, [reducedMotion, resolvedSrc, instanceId]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
    setPlaying(false);
  }, []);

  const handlePointerEnter = () => {
    if (canHover) void play();
  };

  const handlePointerLeave = () => {
    if (canHover && pauseOnLeave) pause();
  };

  /** Tap / click = gesto de usuario (requerido por Safari iOS). */
  const handleActivate = () => {
    if (playing && pauseOnLeave) {
      pause();
    } else {
      void play();
    }
  };

  if (reducedMotion) {
    return (
      <div className={cn("absolute inset-0 overflow-hidden", className)}>
        <div
          className="absolute inset-0 bg-cover bg-center bg-secondary"
          style={{ backgroundImage: `url(${poster})` }}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 overflow-hidden cursor-pointer group/video",
        className,
      )}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={playing ? "Pausar video de fondo" : "Reproducir video de fondo"}
      aria-pressed={playing}
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-secondary"
        style={{ backgroundImage: `url(${poster})` }}
        aria-hidden
      />

      <video
        ref={videoRef}
        muted
        loop
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        preload={preload}
        poster={poster}
        aria-hidden
        className={cn(
          "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 pointer-events-none",
          playing ? "opacity-100" : "opacity-0",
          videoClassName,
        )}
      />

      {!playing && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover/video:opacity-100 group-focus-visible/video:opacity-100 transition-opacity duration-300 pointer-events-none"
          aria-hidden
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg backdrop-blur-sm">
            <Play className="h-6 w-6 ml-0.5 fill-current" />
          </span>
        </div>
      )}

      {!playing && !canHover && (
        <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white pointer-events-none sm:text-xs">
          Toca para reproducir
        </span>
      )}
    </div>
  );
}
