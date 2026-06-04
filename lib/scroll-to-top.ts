/** Fuerza scroll al inicio (útil tras navegación desde checkout largo). */
export function scrollToTop(behavior: ScrollBehavior = "instant"): void {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, left: 0, behavior });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
