import type { Metadata } from "next";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Verificar correo",
  robots: noIndexRobots,
};

export default function VerificarEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
