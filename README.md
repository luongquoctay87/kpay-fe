# Kpay Frontend

Admin Portal and public Pay URL for the Kpay payment platform.

| | |
|---|---|
| **Stack** | Next.js 15 · React 19 · TypeScript · Ant Design 6 · Tailwind 4 · Zustand |
| **Backend** | [`kpay-backend`](../kpay-backend) — Spring Boot, context-path `/api` |
| **Node** | `>=20 <25` (Docker image: **Node 22**) |
| **Output** | `standalone` (production / Docker) |

---

## What it covers

| Surface | Audience | Routes |
|---------|----------|--------|
| **Admin Portal** | Operators (JWT + TOTP) | Overview, Merchants, Agents, Payin, Payout, Bank accounts, Callback logs, Profile |
| **Pay URL** | End-users (public) | `/pay/[token]` — VietQR + transfer details |

Auth: Login → TOTP enroll/verify → access token + soft session cookie → portal shell.

---

## Prerequisites

- Node.js 20–24 (`node -v`)
- npm 10+ (lockfile: `package-lock.json`)
- Running [`kpay-backend`](../kpay-backend) (default `http://localhost:8756`)

---

## Quick start

```bash
# 1. Backend must be up (default http://localhost:8756)
# 2. Frontend
cp .env.local.example .env.local
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On the backend, set `FE_URI=http://localhost:3000` so CORS / Origin checks allow the portal.

---

## Environment

Copy from [`.env.local.example`](./.env.local.example):

| Variable | Default | When | Description |
|----------|---------|------|-------------|
| `NEXT_PUBLIC_API_BASE` | `/api` | Build | Browser API prefix (same-origin) |
| `BACKEND_ORIGIN` | `http://localhost:8756` | Build | Backend **origin only** — do **not** append `/api` |
| `NEXT_PUBLIC_APP_ENV` | `staging` | Build | Env badge in header (`staging` / `production` / `development`) |
| `NEXT_PUBLIC_COOKIE_SECURE` | *(auto)* | Build | Soft session cookie `Secure`: auto on `https://`; force with `true` / `false` |

`next.config.ts` rewrites `/api/*` → `${BACKEND_ORIGIN}/api/*` (1:1 with Spring `context-path`):

```
Browser              Next rewrite                 Spring Boot
/api/merchants  →  {BACKEND_ORIGIN}/api/merchants  →  /api + /merchants
```

**Important**

- `NEXT_PUBLIC_*` and `BACKEND_ORIGIN` are baked at **build** time for Docker images. Change them → **rebuild** the image (runtime `docker run -e` will not rewrite the proxy target).
- Never commit `.env.local` (gitignored). Docker builds must not bake local secrets — see [`.dockerignore`](./.dockerignore).
- Restart `npm run dev` only when you change `.env*` or `next.config.ts`. Edits under `src/` hot-reload (Turbopack).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run dev:webpack` | Dev server (Webpack fallback) |
| `npm run build` | Production build (`output: "standalone"`) + lint/typecheck |
| `npm start` | Serve production build (after `npm run build`) |
| `npm run lint` | ESLint only |

Local smoke before deploy:

```bash
npm ci
npm run lint
npm run build
npm start   # http://localhost:3000
```

---

## Product routes

| Path | Description |
|------|-------------|
| `/login`, `/totp` | Authentication |
| `/` | Overview (dashboard) |
| `/merchants`, `/merchants/new`, `/merchants/[id]` | Merchant CRUD, credentials, IP whitelist, fees |
| `/agents`, `/agents/new` | Agent list / create / edit |
| `/payin` | Payin orders (advanced search, export, finalize) |
| `/payout` | Payout orders (advanced search, export, finalize) |
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

Multi-stage image (`node:22-alpine` → standalone `node server.js`).  
Build args are **required** for correct API rewrites inside Compose / ECS.

### Build & push to ECR

```bash
export AWS_ACCOUNT_ID=…
export AWS_REGION=ap-southeast-1
export BACKEND_ORIGIN=http://api.kpay.staging.local:8756   # or http://backend:8756 for Compose
export NEXT_PUBLIC_APP_ENV=staging

./scripts/push-ecr.sh              # → kpay/kpay-fe:<git-sha> + :latest
./scripts/push-ecr.sh v1.0.0
```

`BACKEND_ORIGIN` is **required** (baked at image build). See [`scripts/push-ecr.sh`](./scripts/push-ecr.sh).

### Build (Compose network) — manual docker

Service name in [`docker-compose.test.yml`](../kpay-backend/docker-compose.test.yml) / [`docker-compose.prod.yml`](../kpay-backend/docker-compose.prod.yml) is `backend` on port `8756`:

```bash
# Staging / test
docker build \
  --platform=linux/amd64 \
  --build-arg BACKEND_ORIGIN=http://backend:8756 \
  --build-arg NEXT_PUBLIC_APP_ENV=staging \
  -t kpay/kpay-fe:latest \
  .

# Production
docker build \
  --platform=linux/amd64 \
  --build-arg BACKEND_ORIGIN=http://backend:8756 \
  --build-arg NEXT_PUBLIC_APP_ENV=production \
  -t kpay/kpay-fe:latest \
  .
```

> Default `BACKEND_ORIGIN` in the Dockerfile is `http://localhost:8756` (local only).  
> Inside Docker Compose / ECS that value is **wrong** — always pass `http://backend:8756` (or the real backend DNS).

### Run locally

```bash
docker run --rm -p 3000:3000 kpay/kpay-fe:latest
```

### Deploy with Compose

Compose files **pull** the image (they do not build FE):

| File | Profile | Image |
|------|---------|--------|
| [`kpay-backend/docker-compose.test.yml`](../kpay-backend/docker-compose.test.yml) | test | `${ECR_REGISTRY}/kpay/kpay-fe:${IMAGE_TAG}` |
| [`kpay-backend/docker-compose.prod.yml`](../kpay-backend/docker-compose.prod.yml) | prod | same |

Push the image you built to ECR as `kpay/kpay-fe`, then:

```bash
cd ../kpay-backend
# set ECR_REGISTRY, IMAGE_TAG, FE_URI, secrets in .env
docker compose -f docker-compose.test.yml up -d
```

Align backend `FE_URI` with the public portal origin (e.g. `https://portal-test.example.com`).

### Checklist before test / prod

- [ ] `npm run lint` and `npm run build` pass locally
- [ ] Image built with correct `BACKEND_ORIGIN` for the target network
- [ ] `NEXT_PUBLIC_APP_ENV` matches the environment badge you want
- [ ] Backend `FE_URI` matches the portal public URL (CORS / Origin / Pay URL)
- [ ] HTTPS on test/prod (session cookie gets `Secure` automatically)
- [ ] `.env.local` is **not** present in the Docker context (covered by `.dockerignore`)

---

## Related docs

| Doc | Topic |
|-----|--------|
| [`docs/GUIDELINE.md`](../docs/GUIDELINE.md) | Architecture & deploy topology |
| [`kpay-backend/README.md`](../kpay-backend/README.md) | API run, profiles, deploy |
| [`docs/PAYIN_API_TEST.md`](../docs/PAYIN_API_TEST.md) | Merchant payin HMAC QC |
| [`docs/PAYOUT_API_TEST.md`](../docs/PAYOUT_API_TEST.md) | Merchant payout HMAC QC |
| [`docs/CALLBACK_OUTBOUND.md`](../docs/CALLBACK_OUTBOUND.md) | Callback retry / resend |
| [`docs/BALANCE_IP_WHITELIST.md`](../docs/BALANCE_IP_WHITELIST.md) | Balance API + IP whitelist |
| [`docs/SECURITY_FIXES.md`](../docs/SECURITY_FIXES.md) | Security fixes log |
| Backend Swagger (dev) | `http://localhost:8756/api/swagger-ui.html` |
