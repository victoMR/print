"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRef, type ReactNode } from "react";

type ParallaxSectionProps = {
  children: ReactNode;
  className?: string;
  speed?: number;
  id?: string;
};

export function ParallaxSection({
  children,
  className,
  speed = 0.35,
  id,
}: ParallaxSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [speed * -80, speed * 80]);

  return (
    <section ref={ref} id={id} className={cn("relative overflow-hidden", className)}>
      <motion.div style={{ y }} className="relative z-10">
        {children}
      </motion.div>
    </section>
  );
}
