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
  /** hero = viewport inicial; feature = secciones inferiores con 3+ videos */
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
  preload = "none",
}: BackgroundVideoProps) {
  const instanceId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hdSrc, setHdSrc] = useState(false);
  const [playing, setPlaying] = useState(false);
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
    registerBackgroundVideo(instanceId, video, 0, tier);

    const syncOpacity = () => {
      setPlaying(!video.paused && video.readyState >= 2);
    };
    video.addEventListener("playing", syncOpacity);
    video.addEventListener("pause", syncOpacity);
    video.addEventListener("loadeddata", syncOpacity);

    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
        updateBackgroundVideoVisibility(instanceId, ratio);
      },
      {
        rootMargin: tier === "hero" ? "0px" : "60px 0px",
        threshold: [0, 0.06, 0.15, 0.35, 0.5, 0.75, 1],
      },
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      video.removeEventListener("playing", syncOpacity);
      video.removeEventListener("pause", syncOpacity);
      video.removeEventListener("loadeddata", syncOpacity);
      unregisterBackgroundVideo(instanceId);
      setPlaying(false);
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
          muted
          loop
          playsInline
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          preload={tier === "hero" ? "metadata" : preload}
          poster={poster}
          aria-hidden
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700",
            playing ? "opacity-100" : "opacity-0",
            videoClassName,
          )}
        >
          <source
            src={resolvedSrc}
            type="video/mp4; codecs=avc1.42E01E, mp4a.40.2"
          />
        </video>
      )}
    </div>
  );
}
