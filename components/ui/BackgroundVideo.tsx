"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type BackgroundVideoProps = {
  src: string;
  srcHd?: string;
  poster: string;
  className?: string;
  videoClassName?: string;
  /** Hero / above-the-fold — loads immediately */
  priority?: boolean;
  preload?: "none" | "metadata" | "auto";
};

function setWebkitPlaysInline(video: HTMLVideoElement) {
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
}

export function BackgroundVideo({
  src,
  srcHd,
  poster,
  className,
  videoClassName,
  priority = false,
  preload = "none",
}: BackgroundVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(priority);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hdSrc, setHdSrc] = useState(false);

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
    if (priority || reducedMotion) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, reducedMotion]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active || reducedMotion || failed) return;

    setWebkitPlaysInline(video);

    const tryPlay = () => {
      video.play().catch(() => setFailed(true));
    };

    if (video.readyState >= 2) tryPlay();
    else video.addEventListener("canplay", tryPlay, { once: true });

    return () => video.removeEventListener("canplay", tryPlay);
  }, [active, reducedMotion, failed, hdSrc]);

  const showVideo = active && !failed && !reducedMotion;
  const resolvedSrc = hdSrc && srcHd ? srcHd : src;

  return (
    <div ref={containerRef} className={cn("absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute inset-0 bg-cover bg-center bg-secondary"
        style={{ backgroundImage: `url(${poster})` }}
        aria-hidden
      />
      {showVideo && (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          autoPlay={priority}
          preload={priority ? "metadata" : preload}
          poster={poster}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-center",
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
