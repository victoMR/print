/** Fuerza scroll al inicio (útil tras navegación desde checkout largo). */
export function scrollToTop(behavior: ScrollBehavior = "instant"): void {
  if (typeof window === "undefined") return;
  const opts: ScrollToOptions = { top: 0, left: 0, behavior };
  const prev = window.history.scrollRestoration;
  window.history.scrollRestoration = "manual";
  window.scrollTo(opts);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  let el: HTMLElement | null = document.body;
  while (el) {
    if (el.scrollTop > 0) el.scrollTo(opts);
    el = el.parentElement;
  }
  window.history.scrollRestoration = prev;
}

/** Varios intentos tras navegación (Next puede restaurar scroll después del paint). */
export function scrollToTopAfterNav(): void {
  scrollToTop();
  requestAnimationFrame(() => scrollToTop());
  window.setTimeout(() => scrollToTop(), 0);
  window.setTimeout(() => scrollToTop(), 80);
  window.setTimeout(() => scrollToTop(), 200);
}
