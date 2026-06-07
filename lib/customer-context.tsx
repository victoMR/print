"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { CustomerSessionUser } from "./customer-session";
import { clearCustomerToken } from "./customer-session";
import { customerLogout, customerRefreshSession } from "./customer-api";
import { broadcastSession, subscribeSession } from "./session-broadcast";
import { useSessionKeepalive } from "./use-session-keepalive";

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
      const res = await fetch(`${V1}/auth/me`, { credentials: "include", cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { data: CustomerSessionUser | null };
        setUser(json.data ?? null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const slideRefresh = useCallback(async () => {
    if (!user) return;
    try {
      const next = await customerRefreshSession();
      setUser(next);
    } catch {
      setUser(null);
    }
  }, [user]);

  const logout = useCallback(() => {
    clearCustomerToken();
    broadcastSession({ type: "customer:logout" });
    void customerLogout();
    setUser(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return subscribeSession((event) => {
      if (event.type === "customer:logout") setUser(null);
      if (event.type === "customer:login" || event.type === "customer:refresh") void refresh();
    });
  }, [refresh]);

  useSessionKeepalive({ enabled: Boolean(user), onRefresh: slideRefresh });

  return (
    <CustomerContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  return useContext(CustomerContext);
}
