"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

const HEADER_HEIGHT = 112;
const MIN_HERO_VH = 52;
const ANIM_MS = 950;

type Phase = "open" | "closing" | "closed" | "opening";

export function Hero() {
  const [windowH, setWindowH] = useState(0);
  const [phase, setPhase] = useState<Phase>("open");
  const phaseRef = useRef<Phase>("open");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const update = () => setWindowH(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // If user navigates back to top while closed (back button, etc.), reset phase
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY === 0 && phaseRef.current === "closed") {
        phaseRef.current = "open";
        setPhase("open");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback(() => {
    if (phaseRef.current === "closed" || phaseRef.current === "closing") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    phaseRef.current = "closing";
    setPhase("closing");
    // After CSS transition finishes, silently jump scroll so page continues normally
    timerRef.current = setTimeout(() => {
      const threshold = Math.round(window.innerHeight * (1 - MIN_HERO_VH / 100));
      window.scrollTo({ top: threshold, behavior: "instant" });
      phaseRef.current = "closed";
      setPhase("closed");
    }, ANIM_MS);
  }, []);

  const open = useCallback(() => {
    if (phaseRef.current === "open" || phaseRef.current === "opening") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    // Jump scroll to top immediately so page is ready when animation finishes
    window.scrollTo({ top: 0, behavior: "instant" });
    phaseRef.current = "opening";
    setPhase("opening");
    timerRef.current = setTimeout(() => {
      phaseRef.current = "open";
      setPhase("open");
    }, ANIM_MS);
  }, []);

  useEffect(() => {
    if (windowH === 0) return;

    const onWheel = (e: WheelEvent) => {
      const cur = phaseRef.current;
      const threshold = Math.round(windowH * (1 - MIN_HERO_VH / 100));
      const inZone = window.scrollY <= threshold;

      if (cur !== "closed" || inZone) {
        e.preventDefault();
        if (e.deltaY > 0 && (cur === "open" || cur === "opening")) close();
        if (e.deltaY < 0 && cur !== "open" && cur !== "opening") open();
      }
    };

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => {
      const cur = phaseRef.current;
      const threshold = Math.round(windowH * (1 - MIN_HERO_VH / 100));
      if (cur !== "closed" || window.scrollY <= threshold) e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchStartY - e.changedTouches[0].clientY;
      const cur = phaseRef.current;
      if (Math.abs(dy) > 30) {
        if (dy > 0 && (cur === "open" || cur === "opening")) close();
        if (dy < 0 && cur !== "open" && cur !== "opening") open();
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
    };
  }, [windowH, close, open]);

  // heroVh is the TARGET of the CSS transition — React sets the new value,
  // CSS transition animates from the previous value to the new one.
  const heroVh = phase === "closed" || phase === "closing" ? MIN_HERO_VH : 100;
  const isTransitioning = phase === "closing" || phase === "opening";

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
          transition: isTransitioning
            ? `height ${ANIM_MS}ms cubic-bezier(0.76, 0, 0.24, 1)`
            : "none",
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
