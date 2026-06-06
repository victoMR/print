"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { CustomerSessionUser } from "./customer-session";
import { clearCustomerToken } from "./customer-session";
import { customerLogout } from "./customer-api";

const V1 = "/api/v1";

export type CustomerContextValue = {
  user: CustomerSessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
};

const CustomerContext = createContext<CustomerContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: () => {},
});

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      // Auth via HttpOnly cookie — no token in localStorage needed.
      const res = await fetch(`${V1}/auth/me`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json() as { data: CustomerSessionUser };
        setUser(json.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearCustomerToken(); // clean up any legacy localStorage value
    void customerLogout(); // ask server to clear the HttpOnly cookie
    setUser(null);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <CustomerContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  return useContext(CustomerContext);
}
