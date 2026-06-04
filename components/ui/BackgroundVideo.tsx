"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
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
  /** Pausar al quitar el cursor (solo desktop con hover). */
  pauseOnLeave?: boolean;
  /** Reproducir al entrar en viewport (hero al cargar). */
  playInView?: boolean;
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
  playInView = false,
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

  /** Desktop: hover entra → play, hover sale → pause (sin botón). */
  const handlePointerEnter = () => {
    if (canHover) void play();
  };

  const handlePointerLeave = () => {
    if (canHover && pauseOnLeave) pause();
  };

  /** Móvil / hero: autoplay muted al estar visible en viewport. */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || reducedMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.intersectionRatio;
        const visible = entry.isIntersecting && ratio >= 0.2;

        if (canHover) {
          if (playInView && visible && ratio >= 0.3) void play();
          return;
        }

        if (visible) void play();
        else if (pauseOnLeave) pause();
      },
      { threshold: [0, 0.2, 0.3, 0.5, 0.75] },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [canHover, playInView, pauseOnLeave, play, pause, reducedMotion]);

  if (reducedMotion) {
    return (
      <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden>
        <div
          className="absolute inset-0 bg-cover bg-center bg-secondary"
          style={{ backgroundImage: `url(${poster})` }}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden", className)}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-secondary"
        style={{ backgroundImage: `url(${poster})` }}
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
        className={cn(
          "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 pointer-events-none",
          playing ? "opacity-100" : "opacity-0",
          videoClassName,
        )}
      />
    </div>
  );
}
