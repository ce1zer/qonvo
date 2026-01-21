"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type TenantOrganization = {
  id: string;
  name: string;
  slug: string;
  credits_balance: number;
};

export type TenantProfile = {
  user_id: string;
  organization_id: string | null;
  role: "member" | "organization_admin" | "platform_admin";
};

export type TenantContextValue = {
  organization: TenantOrganization;
  profile: TenantProfile;
  creditsBalance: number;
  setCreditsBalance: (next: number) => void;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within TenantProvider.");
  }
  return ctx;
}

export function TenantProvider({
  value,
  children
}: {
  value: Omit<TenantContextValue, "creditsBalance" | "setCreditsBalance">;
  children: React.ReactNode;
}) {
  const [creditsBalance, setCreditsBalance] = useState<number>(value.organization.credits_balance);

  const ctx = useMemo<TenantContextValue>(() => {
    return {
      ...value,
      creditsBalance,
      setCreditsBalance
    };
  }, [value, creditsBalance]);

  return <TenantContext.Provider value={ctx}>{children}</TenantContext.Provider>;
}

