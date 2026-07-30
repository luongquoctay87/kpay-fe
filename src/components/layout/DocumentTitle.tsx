"use client";

import { useEffect } from "react";

/** Sync browser tab title (client i18n / route titles). */
export function DocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    if (!title) return;
    document.title = title;
  }, [title]);

  return null;
}
