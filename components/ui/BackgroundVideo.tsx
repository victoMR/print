"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  registerBackgroundVideo,
  unregisterBackgroundVideo,
  updateBackgroundVideoVisibility,
  type VideoTier,
} from "@/lib/video-playback-manager";

type BackgroundVideoProps = {
  src: string;
  srcHd?: string;
  poster: string;
  className?: string;
  videoClassName?: string;
  /** hero = viewport inicial; feature = secciones inferiores con varios videos */
  tier?: VideoTier;
  preload?: "none" | "metadata" | "auto";
};

function configureSafariVideo(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
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
  tier = "feature",
  preload = "metadata",
}: BackgroundVideoProps) {
  const instanceId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hdSrc, setHdSrc] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const resolvedSrc = hdSrc && srcHd ? srcHd : src;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
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
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video || reducedMotion) return;

    configureSafariVideo(video);
    // Asegura que el <video> tome el src actual (SD/HD) antes de reproducir.
    if (video.getAttribute("src") !== resolvedSrc) {
      video.setAttribute("src", resolvedSrc);
      video.load();
    }

    registerBackgroundVideo(instanceId, video, 0, tier);

    const onPlaying = () => setShowVideo(true);
    const onPause = () => setShowVideo(false);
    const onEnded = () => setShowVideo(false);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("timeupdate", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("emptied", onEnded);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
        updateBackgroundVideoVisibility(instanceId, ratio);
      },
      {
        rootMargin: tier === "hero" ? "0px" : "100px 0px",
        threshold: [0, 0.05, 0.15, 0.3, 0.5, 0.75, 1],
      },
    );
    observer.observe(container);

    return () => {
      observer.disconnect();
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("timeupdate", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("emptied", onEnded);
      unregisterBackgroundVideo(instanceId);
      setShowVideo(false);
    };
  }, [reducedMotion, tier, resolvedSrc, instanceId]);

  return (
    <div ref={containerRef} className={cn("absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute inset-0 bg-cover bg-center bg-secondary"
        style={{ backgroundImage: `url(${poster})` }}
        aria-hidden
      />
      {!reducedMotion && (
        <video
          ref={videoRef}
          // src se asigna en el efecto para controlar SD/HD y forzar load()
          muted
          loop
          playsInline
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          preload={tier === "hero" ? "auto" : preload}
          poster={poster}
          aria-hidden
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700",
            showVideo ? "opacity-100" : "opacity-0",
            videoClassName,
          )}
        />
      )}
    </div>
  );
}
