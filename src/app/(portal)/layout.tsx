"use client";

import { PortalShell } from "@/components/layout/PortalShell";
import type { ReactNode } from "react";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
