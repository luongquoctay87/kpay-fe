import type { PartnerRoutingMode, PartnerStatus } from "@/features/partners/types";
import type { MessageKey } from "@/i18n/types";
import type { BadgeTone } from "@/components/ui/StatusBadge";

export const PARTNER_STATUS_LABEL_KEY: Record<PartnerStatus, MessageKey> = {
  active: "partners.statusActive",
  inactive: "partners.statusInactive",
};

export const PARTNER_STATUS_TONE: Record<PartnerStatus, BadgeTone> = {
  active: "active",
  inactive: "neutral",
};

export const PARTNER_ROUTING_LABEL_KEY: Record<PartnerRoutingMode, MessageKey> = {
  off: "partners.routingOff",
  fallback: "partners.routingFallback",
  always: "partners.routingAlways",
};
