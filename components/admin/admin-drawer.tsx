"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type AdminDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Ancho del panel (default: panel amplio para formularios) */
  widthClassName?: string;
};

export function AdminDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  widthClassName = "sm:max-w-2xl lg:max-w-3xl",
}: AdminDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent
        className={cn(
          "h-full w-full flex flex-col border-l border-border/80 bg-card/95 backdrop-blur-md",
          widthClassName,
        )}
      >
        <DrawerHeader className="shrink-0 border-b border-border/60 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 text-left">
              <DrawerTitle className="font-serif text-xl md:text-2xl leading-tight truncate">
                {title}
              </DrawerTitle>
              {description && (
                <DrawerDescription className="mt-1 font-mono text-xs truncate">
                  {description}
                </DrawerDescription>
              )}
            </div>
            <DrawerClose asChild>
              <button
                type="button"
                className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted boty-transition"
                aria-label="Cerrar panel"
              >
                <X className="w-5 h-5" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
