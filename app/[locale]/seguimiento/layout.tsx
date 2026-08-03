import type { Metadata } from "next";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Seguimiento de pedido",
  robots: noIndexRobots,
};

export default function SeguimientoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
