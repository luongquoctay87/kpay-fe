# Kpay Frontend

Admin Portal + Pay URL — Next.js 15 · React 19 · TypeScript · Ant Design.

Khớp `docs/ROLE_PLAN.md` (FE-01 … FE-11). API: `kpay-backend` dưới context-path `/api` (`/api/auth`, `/api/merchants`, …).

## Prerequisite

- Node.js 20+
- `kpay-backend` chạy local (mặc định `http://localhost:8756`)

## Setup

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

Backend CORS: `FE_URI=http://localhost:3000`.

Path mapping 1:1 — không strip prefix:

| Browser | Next rewrite | Spring Boot |
|---------|--------------|-------------|
| `/api/merchants` | `BACKEND_ORIGIN/api/merchants` | `server.servlet.context-path=/api` + `@RequestMapping("/merchants")` |

`BACKEND_ORIGIN` chỉ là origin (`http://localhost:8756`), `next.config.ts` tự thêm `/api`. Swagger: `http://localhost:8756/api/swagger-ui.html`.

## Scripts

| Script | Mô tả |
|--------|--------|
| `npm run dev` | Dev server + **Turbopack HMR** — chạy **một lần**, để chạy nền |
| `npm run dev:webpack` | Dev bằng Webpack (fallback) |
| `npm run build` | Production build |
| `npm start` | Chạy build |
| `npm run lint` | ESLint |

### Hot reload (không cần chạy lại `npm run dev`)

1. Mở terminal, chạy **một lần**: `npm run dev`
2. Để terminal đó chạy — **đừng** Ctrl+C mỗi lần sửa code
3. Sửa file trong `src/` → lưu → browser tự refresh (Fast Refresh)

**Chỉ cần restart** khi đổi:

- `.env` / `.env.local`
- `next.config.ts`
- `package.json` (sau `npm install`)

## Cấu trúc

```
src/
  app/                      # Next.js App Router — page mỏng (re-export feature)
    (portal)/               # Shell + auth guard
    login/ totp/            # Auth routes
    pay/[token]/           # Pay URL public
  middleware.ts             # Soft gate qua cookie kpay_session
  components/
    layout/                 # Sidebar, Header, PortalShell
    providers/              # Ant Design + locale
    common/                 # PageStub, shared UI
  features/                 # Domain modules (api + types + UI)
    auth/
    merchants/
    agents/
    dashboard/ payin/ payout/ callback-logs/ bank-accounts/ pay/
  i18n/                     # VI/EN catalogs + useI18n (đa ngôn ngữ)
  lib/
    api/client.ts           # Axios + refresh interceptor
    types/api.ts            # Resp envelope + ApiError
    constants/              # routes, auth cookie name
    format/                 # money / datetime
    theme/tokens.ts         # Design tokens (sync Ant Design)
```

### Design tokens (màu + chữ)

Nguồn: `src/app/globals.css` + `src/lib/theme/tokens.ts`.

| Role | Size | Weight | Color util |
|------|------|--------|------------|
| Display | 24px | 600 | `.kpay-text-display` / `text-ink` |
| Heading | 20px | 600 | `.kpay-text-heading` |
| Title | 14px | 600 | `.kpay-text-title` |
| Body | 14px | 400 | `.kpay-text-body` / `text-body` |
| Label | 13px | 500 | `.kpay-text-label` / `text-label` |
| Caption | 11px | 500 | `.kpay-text-caption` / `text-caption` |
| Overline | 11px | 500 | `.kpay-text-overline` |

Màu semantic: `ink` / `ink-secondary` / `muted` / `subtle` · `canvas` / `surface` / `panel` · `edge` · `accent` / `on-accent` · `danger` / `success` / `warning`.

### Buttons (`@/components/ui`)

```tsx
import { Button } from "@/components/ui";

<Button variant="primary">Lưu</Button>
<Button variant="secondary">Huỷ</Button>
<Button variant="ghost">Thu gọn</Button>
<Button variant="danger">Xoá</Button>
<Button variant="danger-ghost" iconOnly leftIcon={…} />
<Button variant="link">Chi tiết</Button>
<Button shape="pill" size="lg" fullWidth loading>Đăng nhập</Button>
<Button href="/merchants/new" leftIcon={…}>Add</Button>
```

| Variant | Dùng khi |
|---------|----------|
| `primary` | CTA chính (submit, tạo mới) |
| `secondary` | Hành động phụ (làm mới, reset) |
| `ghost` | Toolbar nhẹ / menu |
| `danger` | Huỷ / xoá có nền |
| `danger-ghost` | Xoá trên bảng |
| `link` | Điều hướng dạng text |

Size: `sm` \| `md` \| `lg` · Shape: `default` \| `pill`

### Inputs & Select (`@/components/ui`)

```tsx
import { Field, Input, Select, Textarea } from "@/components/ui";

<Field label="Merchant Name" htmlFor="name" error={err}>
  <Input id="name" size="md" placeholder="…" />
</Field>

<Field label="Status" htmlFor="status">
  <Select
    id="status"
    options={[{ value: "active", label: "Active" }]}
    value={status}
    onChange={setStatus}
    clearable
    placeholder="Vui lòng chọn"
  />
</Field>

<Textarea rows={4} />
```

| Component | Ghi chú |
|-----------|---------|
| `Field` | Label + hint/error wrapper |
| `Input` | Text/password; `leftAddon` / `rightAddon`; `invalid` |
| `Select` | Dropdown custom (keyboard + clearable) |
| `Textarea` | Multi-line, cùng size/invalid |

Size field: `sm` \| `md` \| `lg` (khớp chiều cao Button)

Tránh hardcode `text-zinc-*` / `text-[13px]` / raw `<button className=…>` / raw `<input>` cho form — dùng token + `Button` / `Field` / `Input` / `Select`.

### i18n

- Catalog: `src/i18n/messages/vi.ts` + `en.ts` (thêm locale mới = thêm file + entry `LOCALES`)
- Hook: `const { t, locale, setLocale } = useI18n()` — key dạng `nav.overview`
- Switcher VI/EN trên header + login; lưu `localStorage` (`kpay_locale`)
- Ant Design locale theo ngôn ngữ đang chọn
- **Không hardcode** copy UI trong component — thêm key vào catalog trước

### Quy ước

- **Route** (`app/**/page.tsx`) chỉ mount feature component — không chứa business UI.
- **Feature** giữ `api.ts`, `types.ts`, `components/*` theo domain.
- **Shared** (layout, axios, format) nằm `components/` + `lib/`.
- Enum/status **khớp BE** (vd merchant: `pending|active|suspended|disabled`).

## Auth flow

`Login` → `TOTP enroll|verify` → JWT access (localStorage) + session cookie + refresh cookie → Portal.

## Phase 1 routes

| Path | Status |
|------|--------|
| `/login`, `/totp` | UI sẵn |
| `/`, `/merchants` | Shell + list API |
| `/merchants/new`, `/merchants/[id]` | Stub (feature scaffold) |
| `/agents`, `/payin`, `/payout`, `/callback-logs`, `/bank-accounts` | Stub |
| `/pay/[token]` | Pay URL stub |
