/** Splash inicial — sin video; evita layout shift en Safari iOS. */
export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F0E4E6] safe-top safe-bottom"
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <div className="flex flex-col items-center gap-4 px-6">
        <p className="font-serif text-3xl tracking-wider text-foreground">Mr. Paps</p>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full w-full origin-left animate-pulse rounded-full bg-primary/80" />
        </div>
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    </div>
  );
}
