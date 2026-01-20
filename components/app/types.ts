import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};

