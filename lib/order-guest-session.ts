const STORAGE_KEY = "mrpaps-guest-order";

type GuestOrderAccess = {
  trackingCode: string;
  email: string;
};

export function saveGuestOrderAccess(trackingCode: string, email: string) {
  if (typeof window === "undefined") return;
  const payload: GuestOrderAccess = {
    trackingCode: trackingCode.trim(),
    email: email.trim().toLowerCase(),
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function getGuestOrderAccess(trackingCode?: string): GuestOrderAccess | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as GuestOrderAccess;
    if (!parsed.trackingCode || !parsed.email) return null;
    if (trackingCode && parsed.trackingCode !== trackingCode.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearGuestOrderAccess() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
