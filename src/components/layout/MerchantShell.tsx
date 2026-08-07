"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppFooter } from "@/components/layout/AppFooter";
import { AgentHeader } from "@/components/layout/AgentHeader";
import { AgentSidebar } from "@/components/layout/AgentSidebar";
import { MerchantHeader } from "@/components/layout/MerchantHeader";
import {
  MerchantSidebar,
  readSidebarCollapsed,
} from "@/components/layout/MerchantSidebar";
import { isSidebarNarrowViewport } from "@/components/layout/AppSidebar";
import { portalAuthApi } from "@/features/auth/api";
import {
  hasPortalRole,
  isAgentUser,
  isMerchantPortalUser,
} from "@/features/auth/portal-role";
import {
  clearProactiveRefresh,
  refreshSession,
  scheduleProactiveRefresh,
} from "@/features/auth/refresh";
import { useAuthStore } from "@/features/auth/store";
import {
  clearAuthStorage,
  clearAccessToken,
  clearTwoFaToken,
  getAccessToken,
  getStoredUserJson,
  isAccessTokenFresh,
  setAuthRealm,
} from "@/features/auth/token";
import type { User } from "@/features/auth/types";
import { useI18n } from "@/i18n/use-i18n";
import { portalLoginHref, ROUTES } from "@/lib/constants/routes";
import { ApiError } from "@/lib/types/api";

function parseStoredUser(): User | null {
  const raw = getStoredUserJson();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/**
 * Restore portal session: in-memory access JWT, or silent refresh via
 * HttpOnly {@code X-Portal-Refresh-Cookie}.
 */
async function portalHydrate(setUser: (u: User | null) => void): Promise<boolean> {
  setAuthRealm("portal");
  if (isAccessTokenFresh()) {
    scheduleProactiveRefresh();
    const stored = parseStoredUser();
    if (stored) setUser(stored);
    return true;
  }

  clearAccessToken();
  clearTwoFaToken();

  const result = await refreshSession();
  if (result?.accessToken) {
    // refreshSession already applied tokens + scheduled proactive refresh
    setUser(result.user ?? parseStoredUser());
    return true;
  }

  clearAuthStorage();
  clearProactiveRefresh();
  setUser(null);
  return false;
}

export function MerchantShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await portalHydrate(setUser);
      if (cancelled) return;
      setAuthed(ok);
      const narrow =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 767px)").matches;
      setCollapsed(narrow || readSidebarCollapsed());
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      if (mq.matches) setCollapsed(true);
    };
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!authed || !getAccessToken()) {
      router.replace(portalLoginHref(pathname));
    }
  }, [ready, authed, pathname, router]);

  useEffect(() => {
    if (!ready || !authed || !getAccessToken()) return;
    let cancelled = false;
    void (async () => {
      try {
        const me = await portalAuthApi.me();
        if (!cancelled) setUser(me);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          clearAuthStorage();
          clearProactiveRefresh();
          setUser(null);
          if (!cancelled) router.replace(ROUTES.portalLogin);
          return;
        }
        if (!hasPortalRole(useAuthStore.getState().user)) {
          clearAuthStorage();
          clearProactiveRefresh();
          setUser(null);
          if (!cancelled) router.replace(ROUTES.portalLogin);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authed, setUser, router]);

  useEffect(() => {
    if (!ready || !authed || !getAccessToken()) return;
    if (!hasPortalRole(user)) return;
    if (isAgentUser(user)) {
      if (
        pathname.startsWith(ROUTES.portalPayin) ||
        pathname.startsWith(ROUTES.portalPayout)
      ) {
        router.replace(ROUTES.portalHome);
      }
      return;
    }
    if (isMerchantPortalUser(user) && pathname.startsWith(ROUTES.portalCommissions)) {
      router.replace(ROUTES.portalHome);
    }
  }, [ready, authed, user, pathname, router]);

  const showShell =
    ready && authed && Boolean(getAccessToken()) && hasPortalRole(user);

  function collapseIfNarrow() {
    if (isSidebarNarrowViewport()) setCollapsed(true);
  }

  if (!showShell) {
    return (
      <div className="kpay-text-body-muted flex min-h-screen items-center justify-center bg-surface">
        {t("common.loading")}
      </div>
    );
  }

  if (isAgentUser(user)) {
    return (
      <div className="kpay-shell flex min-h-dvh w-full overflow-x-hidden bg-canvas font-sans text-ink">
        <AgentSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          onNavigate={collapseIfNarrow}
        />
        <div className="flex min-w-0 flex-1 flex-col bg-canvas">
          <AgentHeader />
          <main className="min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-canvas">
            {children}
          </main>
          <AppFooter variant="portal" />
        </div>
      </div>
    );
  }

  return (
    <div className="kpay-shell flex min-h-dvh w-full overflow-x-hidden bg-canvas font-sans text-ink">
      <MerchantSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        onNavigate={collapseIfNarrow}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <MerchantHeader />
        <main className="min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-canvas">
          {children}
        </main>
        <AppFooter variant="portal" />
      </div>
    </div>
  );
}
