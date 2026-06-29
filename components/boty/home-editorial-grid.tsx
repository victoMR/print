"use client";

import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/ui/Logo";

const blocks = [
  {
    label: "COLECCIONES",
    href: "/shop",
    bgColor: "#1E3A2A",
    textColor: "#f8f9fa",
    image: "/images/home/Photo1.webp",
    imageAlt: "Colecciones Mr. Paps",
  },
  {
    label: "NUESTRA HISTORIA",
    href: "/",
    bgColor: "#F5F0E6",
    textColor: "#2A2726",
    image: null,
    imageAlt: "",
    isLogo: true,
  },
  {
    label: "CALIDAD Y DETALLES",
    href: "/shop",
    bgColor: "#2A2726",
    textColor: "#f8f9fa",
    image: "/images/home/Photo2.webp",
    imageAlt: "Calidad y detalles Mr. Paps",
  },
  {
    label: "PIEZAS EXCLUSIVAS",
    href: "/shop",
    bgColor: "#3A0F18",
    textColor: "#f8f9fa",
    image: "/images/home/Photo3.webp",
    imageAlt: "Piezas exclusivas Mr. Paps",
  },
];

export function HomeEditorialGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4">
      {blocks.map((block) => (
        <Link
          key={block.label}
          href={block.href}
          className="group relative h-[38vh] overflow-hidden"
          style={{ backgroundColor: block.bgColor }}
        >
          {/* Background image */}
          {block.image && (
            <Image
              src={block.image}
              alt={block.imageAlt}
              fill
              className="object-cover opacity-60 group-hover:scale-105 boty-transition"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          )}

          {/* Logo block */}
          {block.isLogo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
              <Logo color="#2A2726" className="w-36 sm:w-40 mb-3" />
              <span className="text-[10px] tracking-[0.3em] uppercase font-sans text-[#2A2726]/50">
                EST. 2024
              </span>
            </div>
          )}

          {/* Label at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span
              className="text-[11px] tracking-[0.22em] uppercase font-sans block mb-2"
              style={{ color: block.textColor }}
            >
              {block.label}
            </span>
            <div
              className="w-8 h-px"
              style={{ backgroundColor: block.textColor, opacity: 0.6 }}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
