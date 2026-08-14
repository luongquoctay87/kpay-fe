import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    ...props,
  };
}

/** Tổng quan — dashboard (đậm hơn để đọc rõ ở size nhỏ) */
export function IconHome(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 2, ...props })}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

/** Payin — nhận tiền */
export function IconArrowIn(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M4 21h16" />
    </svg>
  );
}

/** Payout — chi tiền */
export function IconArrowOut(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21V9" />
      <path d="m8 13 4-4 4 4" />
      <path d="M4 3h16" />
    </svg>
  );
}

/** Withdraw — rút tiền (ví → ngân hàng) */
export function IconWithdraw(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a2 2 0 0 1 2 2v1" />
      <rect x="2" y="8" width="20" height="12" rx="2" />
      <path d="M12 15V9" />
      <path d="m9 12 3-3 3 3" />
    </svg>
  );
}

/** Merchant — cửa hàng */
export function IconStore(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 9 5.5 4h13L21 9" />
      <path d="M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9" />
      <path d="M3 9h18" />
      <path d="M9 21V13h6v8" />
    </svg>
  );
}

/** Agent — hỗ trợ */
export function IconHeadset(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M18 19a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-1v6z" />
      <path d="M6 19a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1v6z" />
      <path d="M12 19v2" />
      <path d="M9 21h6" />
    </svg>
  );
}

/** Callback — webhook / đồng bộ */
export function IconWebhook(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M18 16.98A5 5 0 0 0 12.5 8.2" />
      <path d="M6 17a5 5 0 0 1 5.5-8.8" />
      <circle cx="12" cy="6.5" r="2.5" />
      <circle cx="6" cy="17.5" r="2.5" />
      <circle cx="18" cy="17.5" r="2.5" />
    </svg>
  );
}

/** Tài khoản thu-chi */
export function IconBank(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 21h18" />
      <path d="M3 10h18" />
      <path d="M5 10v11" />
      <path d="M9.5 10v11" />
      <path d="M14.5 10v11" />
      <path d="M19 10v11" />
      <path d="m12 3 9 7H3z" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20.5c1.5-3.2 4-4.5 7-4.5s5.5 1.3 7 4.5" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19.5c1.2-2.6 3.2-3.7 6-3.7" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 19.5c-1-2.2-2.6-3.2-5-3.2" />
      <path d="M12.5 15.8c1.4.3 2.6 1.2 3.5 2.7" />
    </svg>
  );
}

/** Khách hàng — nhóm merchant + agent */
export function IconCustomers(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8.5 16.5c.6-1.8 2-2.8 3.5-2.8s2.9 1 3.5 2.8" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function IconChevron(props: IconProps) {
  return (
    <svg {...base({ width: 14, height: 14, ...props })}>
      <path d="m8 10 4 4 4-4" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 16 4-4-4-4" />
      <path d="M20 12H10" />
    </svg>
  );
}

export function IconLogin(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14 21h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4" />
      <path d="m8 16-4-4 4-4" />
      <path d="M4 12h10" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 12a9 9 0 0 0-14.5-7" />
      <path d="M3 4v5h5" />
      <path d="M3 12a9 9 0 0 0 14.5 7" />
      <path d="M21 20v-5h-5" />
    </svg>
  );
}

export function IconBan(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m6.5 6.5 11 11" />
    </svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.2 2.6 2.6L16 9.4" />
    </svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}

export function IconSave(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}

/** Reset / khóa mật khẩu */
export function IconKey(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2 20 3" />
      <path d="M16 7l3 3" />
      <path d="M18.5 4.5 21 7" />
    </svg>
  );
}

/** Hiện / xem (reveal credentials) */
export function IconEye(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

/** Đóng / hủy */
export function IconX(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg {...base({ width: 16, height: 16, ...props })}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base({ width: 16, height: 16, ...props })}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/** Cấu hình — nhóm cài đặt tài khoản */
export function IconSettings(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function IconHash(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 9h14" />
      <path d="M5 15h14" />
      <path d="m10 3-2 18" />
      <path d="m16 3-2 18" />
    </svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

export function IconSmartphone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
      <path d="M10.3 20a1.7 1.7 0 0 0 3.4 0" />
    </svg>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m12 3 9 5-9 5-9-5z" />
      <path d="m3 13 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  );
}

/** Tài nguyên — resource pool / infrastructure */
export function IconResource(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <rect x="3" y="10" width="18" height="5" rx="1.5" />
      <rect x="3" y="16" width="18" height="5" rx="1.5" />
      <circle cx="7" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="7" cy="12.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="7" cy="18.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMoreHorizontal(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconLink(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10.5 5.4" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L13.5 18.6" />
    </svg>
  );
}

/** Gỡ liên kết */
export function IconUnlink(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9.5 14.5 7.4 16.6a4 4 0 0 1-5.66-5.66L5.5 7.2" />
      <path d="M14.5 9.5 16.6 7.4a4 4 0 0 1 5.66 5.66L18.5 16.8" />
      <path d="m7 7 10 10" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconActivity(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M22 12h-4l-3 7-6-14-3 7H2" />
    </svg>
  );
}

/** Audit log — hành vi admin / portal */
export function IconAuditLog(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 20 7v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
      <path d="m8 12.2 2.6 2.6L16 9.4" />
    </svg>
  );
}

/** Money flow / system log — luồng tiền hệ thống */
export function IconMoneyFlow(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M8.2 7.5 9.8 16" />
      <path d="M15.8 7.5 14.2 16" />
      <path d="M8.5 6h7" />
    </svg>
  );
}

/** Nhật ký — log journal */
export function IconLog(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
      <path d="M11 8h6" />
      <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M11 12h6" />
      <circle cx="8" cy="16" r="1" fill="currentColor" stroke="none" />
      <path d="M11 16h5" />
    </svg>
  );
}

export function IconFileText(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

export function IconRepeat(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m17 1 4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="m7 23-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

export function IconWallet(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a2 2 0 0 1 2 2v1" />
      <rect x="2" y="8" width="20" height="12" rx="2" />
      <path d="M16 14h2" />
    </svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 3.5 7a2 2 0 0 1 2-2z" />
    </svg>
  );
}

