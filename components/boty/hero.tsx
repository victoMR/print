"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const HEADER_HEIGHT = 112;
const MIN_HERO_VH = 52;
const ANIM_MS = 750;

// Fast start, smooth deceleration — feels immediately responsive
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export function Hero() {
  const [scrollY, setScrollY] = useState(0);
  const [windowH, setWindowH] = useState(0);
  const animatingRef = useRef(false);
  const animTargetRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => setWindowH(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (windowH === 0) return;

    const threshold = Math.round(windowH * (1 - MIN_HERO_VH / 100));

    const animateTo = (target: number) => {
      // Don't restart if already heading to the same target
      if (animatingRef.current && animTargetRef.current === target) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      animatingRef.current = true;
      animTargetRef.current = target;
      const start = window.scrollY;
      const diff = target - start;
      const startTime = performance.now();

      const step = (now: number) => {
        const t = Math.min((now - startTime) / ANIM_MS, 1);
        window.scrollTo({ top: start + diff * easeOutCubic(t), behavior: "instant" });
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          animatingRef.current = false;
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (window.scrollY < threshold || animatingRef.current) {
        e.preventDefault();
        const target = e.deltaY > 0 ? threshold : 0;
        animateTo(target);
      }
    };

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => {
      if (window.scrollY < threshold || animatingRef.current) e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 30 && (window.scrollY < threshold || animatingRef.current)) {
        animateTo(dy > 0 ? threshold : 0);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [windowH]);

  const heroVh = windowH > 0
    ? Math.max(MIN_HERO_VH, 100 * (1 - scrollY / windowH))
    : 100;

  const wrapperH = windowH > 0
    ? `${windowH + HEADER_HEIGHT}px`
    : `calc(100dvh + ${HEADER_HEIGHT}px)`;

  return (
    <div style={{ height: wrapperH, paddingTop: `${HEADER_HEIGHT}px` }} className="bg-[#2A2726]">
      <section
        className="sticky z-[15] flex items-center overflow-hidden bg-[#2A2726]"
        style={{
          top: `${HEADER_HEIGHT}px`,
          height: `${heroVh}vh`,
        }}
      >
        {/* Background photo */}
        <div className="absolute inset-0 z-0" aria-hidden>
          <Image
            src="/images/hero-photo.png"
            alt="Mr. Paps — Lujo Silencioso"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
            quality={90}
          />
          <div className="pointer-events-none absolute inset-0 bg-[#2A2726]/30" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#2A2726]/60 via-[#2A2726]/20 to-[#2A2726]/10" />
        </div>

        {/* Text — vertically centered, left-aligned */}
        <div className="relative z-10 w-full px-8 sm:px-12 lg:px-16 xl:px-24">
          <div className="max-w-3xl">
            <h1
              className="font-serif text-[#f8f9fa] uppercase leading-tight animate-blur-in opacity-0"
              style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
            >
              <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl tracking-[0.08em] mb-2">
                LUJO SILENCIOSO.
              </span>
              <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl tracking-[0.08em] whitespace-nowrap">
                PRESENCIA QUE PERMANECE.
              </span>
            </h1>

            <div
              className="mt-10 animate-blur-in opacity-0"
              style={{ animationDelay: "0.7s", animationFillMode: "forwards" }}
            >
              <Link
                href="/shop"
                className="inline-block bg-[#5C1A24] text-[#f8f9fa] px-10 py-4 text-[11px] tracking-[0.25em] uppercase font-sans hover:bg-[#4A1520] boty-transition"
              >
                DESCUBRIR COLECCIÓN
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
