"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { pauseBackgroundVideo, playBackgroundVideo } from "@/lib/video-playback-manager";

type BackgroundVideoProps = {
  src: string;
  srcHd?: string;
  poster: string;
  className?: string;
  videoClassName?: string;
  /** Hero / above-the-fold — observa visibilidad desde el montaje */
  priority?: boolean;
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
  priority = false,
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

    const onVisible = async (visible: boolean) => {
      if (visible) {
        const ok = await playBackgroundVideo(video);
        setPlaying(ok);
      } else {
        pauseBackgroundVideo(video);
        setPlaying(false);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible =
          entry.isIntersecting &&
          entry.intersectionRatio >= (priority ? 0.05 : 0.12);
        void onVisible(visible);
      },
      {
        rootMargin: priority ? "0px" : "80px 0px",
        threshold: [0, 0.05, 0.12, 0.25],
      },
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      pauseBackgroundVideo(video);
      setPlaying(false);
    };
  }, [reducedMotion, priority, resolvedSrc, instanceId]);

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
          preload={priority ? "metadata" : preload}
          poster={poster}
          aria-hidden
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500",
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
