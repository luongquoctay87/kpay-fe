# Kpay Frontend

Admin Portal and public Pay URL for the Kpay payment platform.

| | |
|---|---|
| **Stack** | Next.js 15 · React 19 · TypeScript · Ant Design 6 · Tailwind 4 |
| **Backend** | [`kpay-backend`](../kpay-backend) — Spring Boot, context-path `/api` |
| **Node** | `>=20 <25` |

---

## What it covers

| Surface | Audience | Routes |
|---------|----------|--------|
| **Admin Portal** | Operators (JWT + TOTP) | Merchants, Agents, Payin, Payout, Bank accounts, Callback logs, Profile |
| **Pay URL** | End-users (public) | `/pay/[token]` — VietQR + transfer details |

Auth: Login → TOTP enroll/verify → access token + session cookie → portal shell.

---

## Quick start

```bash
# 1. Backend must be up (default http://localhost:8756)
# 2. Frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On the backend, set `FE_URI=http://localhost:3000` so CORS allows the portal origin.

---

## Environment

Copy from `.env.local.example`:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE` | `/api` | Browser API prefix (same-origin) |
| `BACKEND_ORIGIN` | `http://localhost:8756` | Backend origin only — do **not** append `/api` |

`next.config.ts` rewrites `/api/*` → `${BACKEND_ORIGIN}/api/*` (1:1 with Spring `context-path`).

```
Browser          Next rewrite              Spring Boot
/api/merchants → localhost:8756/api/merchants → /api + /merchants
```

`NEXT_PUBLIC_*` is baked at **build** time for Docker/production images. Change API base or origin → rebuild.

Restart `npm run dev` only when you change `.env*` or `next.config.ts`. Edits under `src/` hot-reload automatically (Turbopack).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run dev:webpack` | Dev server (Webpack fallback) |
| `npm run build` | Production build (`output: "standalone"`) |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |

---

## Product routes

| Path | Description |
|------|-------------|
| `/login`, `/totp` | Authentication |
| `/` | Dashboard |
| `/merchants`, `/merchants/new`, `/merchants/[id]` | Merchant CRUD, API key, IP whitelist |
| `/agents`, `/agents/new` | Agent management |
| `/payin` | Payin orders (search, finalize) |
| `/payout` | Payout orders (search, finalize) |
| `/bank-accounts` | Collect / payout bank accounts |
| `/callback-logs` | Outbound webhook logs + resend |
| `/profile` | Operator profile |
| `/pay/[token]` | Public payment page |

---

## Project layout

```
src/
  app/                 # App Router — thin pages (re-export features)
    (portal)/          # Authenticated shell
    login/ totp/       # Auth
    pay/[token]/      # Public Pay URL
  middleware.ts        # Soft session gate (cookie)
  components/          # Layout, shared UI, providers
  features/            # Domain modules (api + types + UI)
  i18n/                # VI / EN catalogs
  lib/                 # Axios client, formatters, theme tokens, constants
```

**Conventions**

- Routes stay thin; business UI lives in `features/<domain>/`.
- Shared HTTP client: `src/lib/api/client.ts` (Axios + refresh interceptor).
- Status enums match the backend (`pending` \| `active` \| `suspended` \| …).
- UI copy goes through i18n (`useI18n()` / `nav.*` keys) — avoid hardcoded strings.
- Prefer design tokens + `@/components/ui` (`Button`, `Field`, `Input`, `Select`) over raw Ant/HTML form controls.

---

## Docker

Standalone Next.js image. `BACKEND_ORIGIN` is baked at **build** time (used by `next.config.ts` rewrites):

```bash
docker build \
  --build-arg BACKEND_ORIGIN=http://backend:8756 \
  -t kpay/frontend:latest .

docker run --rm -p 3000:3000 kpay/frontend:latest
```

Compose (portal + API): [`kpay-backend`](../kpay-backend) `docker-compose.test.yml` / `docker-compose.prod.yml`.

---

## Related docs

| Doc | Topic |
|-----|--------|
| [`kpay-backend/README.md`](../kpay-backend/README.md) | API run, profiles, deploy |
| [`docs/PAYIN_API_TEST.md`](../docs/PAYIN_API_TEST.md) | Merchant payin HMAC QC |
| [`docs/PAYOUT_API_TEST.md`](../docs/PAYOUT_API_TEST.md) | Merchant payout HMAC QC |
| [`docs/CALLBACK_OUTBOUND.md`](../docs/CALLBACK_OUTBOUND.md) | Callback retry / resend |
| [`docs/BALANCE_IP_WHITELIST.md`](../docs/BALANCE_IP_WHITELIST.md) | Balance API + IP whitelist |
| Backend Swagger (dev) | `http://localhost:8756/api/swagger-ui.html` |
