/** Copy text to clipboard; falls back when Clipboard API is unavailable/denied. */
export async function writeClipboard(text: string): Promise<void> {
  const value = text ?? "";
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // insecure context / permission — try legacy path
    }
  }

  if (typeof document === "undefined") {
    throw new Error("clipboard unavailable");
  }

  const ta = document.createElement("textarea");
  ta.value = value;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "0";
  ta.style.left = "0";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
  if (!ok) throw new Error("copy failed");
}
