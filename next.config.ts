import type { NextConfig } from "next";

/** Trailing `/api` is tolerated so a backend-style `BE_URI=http://host:8756/api` also works. */
const backendOrigin = (
  process.env.BACKEND_ORIGIN ??
  process.env.BE_URI ??
  "http://localhost:8756"
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

/**
 * Browser calls same-origin `/api/*`; Spring Boot runs with
 * `server.servlet.context-path=/api`, so the proxy maps 1:1 (no prefix rewriting):
 * `/api/merchants` → `BACKEND_ORIGIN/api/merchants`.
 *
 * Hot reload: keep `npm run dev` running. Edits under `src/` refresh automatically.
 * Restart ONLY when changing this file or `.env*`.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  // Faster / more reliable refresh in monorepo or networked FS
  reactStrictMode: true,
  // Hide the Next.js Dev Tools "N" badge in the corner during `npm run dev`
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
