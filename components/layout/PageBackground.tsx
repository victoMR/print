import type { ReactNode } from "react";

type PageBackgroundProps = {
  children: ReactNode;
};

export function PageBackground({ children }: PageBackgroundProps) {
  return (
    <div className="relative min-h-screen mesh-bg overflow-x-hidden">
      <div
        className="mesh-orb mesh-orb--1 -top-24 -left-24 h-72 w-72 md:h-96 md:w-96"
        aria-hidden
      />
      <div
        className="mesh-orb mesh-orb--2 top-1/3 -right-16 h-64 w-64 md:h-80 md:w-80"
        aria-hidden
      />
      <div
        className="mesh-orb mesh-orb--3 bottom-0 left-1/4 h-56 w-56"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
