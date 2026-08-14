import type { BadgeTone } from "@/components/ui/StatusBadge";
import type {
  CustomerOwnerType,
  CustomerStatus,
} from "@/features/customers/types";
import type { MessageKey } from "@/i18n/types";

export const CUSTOMER_OWNER_LABEL_KEY: Record<CustomerOwnerType, MessageKey> = {
  merchant: "customers.typeMerchant",
  agent: "customers.typeAgent",
};

export const CUSTOMER_OWNER_TONE: Record<CustomerOwnerType, BadgeTone> = {
  merchant: "info",
  agent: "pending",
};

export const CUSTOMER_STATUS_LABEL_KEY: Record<CustomerStatus, MessageKey> = {
  pending: "customers.statusPending",
  active: "customers.statusActive",
  suspended: "customers.statusSuspended",
  disabled: "customers.statusDisabled",
  inactive: "customers.statusInactive",
};

export const CUSTOMER_STATUS_TONE: Record<CustomerStatus, BadgeTone> = {
  pending: "pending",
  active: "active",
  suspended: "suspended",
  disabled: "disabled",
  inactive: "disabled",
};

export function isCustomerStatus(value: string): value is CustomerStatus {
  return (
    value === "pending" ||
    value === "active" ||
    value === "suspended" ||
    value === "disabled" ||
    value === "inactive"
  );
}
