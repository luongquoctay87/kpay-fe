"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconActivity,
  IconCheckCircle,
  IconClock,
  IconHash,
  IconInbox,
  IconLayers,
  IconRepeat,
} from "@/components/icons/NavIcons";
import {
  ColumnHeader,
  CopyButton,
  DateTimeText,
  FilterBar,
  Pagination,
  SearchInput,
  TableCard,
} from "@/components/common";
import { Button, Select, StatusBadge, toast } from "@/components/ui";
import { JsonViewModal } from "@/features/callback-logs/components/JsonViewModal";
import { PartnerColumnPicker } from "@/features/callback-logs/components/PartnerColumnPicker";
import {
  PARTNER_CALLBACK_LOG_COLUMN_ALIGN,
  PARTNER_CALLBACK_LOG_COLUMN_WIDTH,
  partnerCallbackLogsTableMinWidth,
  loadPartnerColumnVisibility,
  savePartnerColumnVisibility,
  visiblePartnerColumnCount,
  type PartnerCallbackLogColumn,
  type PartnerColumnVisibility,
} from "@/features/callback-logs/partner-columns";
import { partnerApi } from "@/features/partners/api";
import type {
  PartnerCallbackLogItem,
  PartnerListItem,
} from "@/features/partners/types";
import { FinalizePayinModal } from "@/features/payin/components/FinalizePayinModal";
import { PayinDetailDrawer } from "@/features/payin/components/PayinDetailDrawer";
import { payinApi } from "@/features/payin/api";
import type { PayinOrderListItem } from "@/features/payin/types";
import { FinalizePayoutModal } from "@/features/payout/components/FinalizePayoutModal";
import { PayoutDetailDrawer } from "@/features/payout/components/PayoutDetailDrawer";
import { payoutApi } from "@/features/payout/api";
import type { PayoutOrderListItem } from "@/features/payout/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import {
  useAutoRefresh,
  type AutoRefreshSeconds,
} from "@/lib/async/use-auto-refresh";
import { ROUTES } from "@/lib/constants/routes";
import {
  buildQueryString,
  parseNonNegInt,
  parsePageSize,
} from "@/lib/url/list-search-params";
import { ApiError } from "@/lib/types/api";

type JsonModalState = {
  title: string;
  data: Record<string, unknown> | null | undefined;
} | null;

const EMPTY_PARTNER_CALLBACK_LIST = {
  rows: [] as PartnerCallbackLogItem[],
  total: 0,
};

type PartnerCallbackFilters = {
  q?: string;
  partnerId?: string;
  orderType?: string;
  signatureValid?: boolean;
  processed?: boolean;
};

function readPartnerStateFromSearch(searchParams: {
  get(name: string): string | null;
}): {
  filters: PartnerCallbackFilters;
  page: number;
  size: number;
} {
  const sig = searchParams.get("signatureValid");
  const proc = searchParams.get("processed");
  return {
    filters: {
      q: searchParams.get("q")?.trim() || undefined,
      partnerId: searchParams.get("partnerId")?.trim() || undefined,
      orderType: searchParams.get("orderType")?.trim() || undefined,
      signatureValid: sig === "true" ? true : sig === "false" ? false : undefined,
      processed: proc === "true" ? true : proc === "false" ? false : undefined,
    },
    page: parseNonNegInt(searchParams.get("page"), 0),
    size: parsePageSize(searchParams.get("size"), 20),
  };
}

function shortId(id: string, head = 8, tail = 4): string {
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

function IdCell({
  value,
  copyLabel,
  onOpen,
  openLabel,
  opening = false,
}: {
  value: string;
  copyLabel: string;
  onOpen?: () => void;
  openLabel?: string;
  opening?: boolean;
}) {
  const display = shortId(value);
  const textClass =
    "min-w-0 truncate font-mono text-label text-ink-secondary hover:text-link-hover";

  return (
    <div className="flex min-w-0 items-center gap-1">
      {onOpen ? (
        <button
          type="button"
          className={`${textClass} text-left transition hover:underline disabled:opacity-60`}
          title={openLabel ? `${openLabel}: ${value}` : value}
          onClick={onOpen}
          disabled={opening}
        >
          {display}
        </button>
      ) : (
        <span className={textClass} title={value}>
          {display}
        </span>
      )}
      <CopyButton value={value} label={copyLabel} size="sm" />
    </div>
  );
}

type PartnerCallbackLogsSectionProps = {
  autoRefresh?: boolean;
  autoRefreshSec?: AutoRefreshSeconds;
};

export function PartnerCallbackLogsSection({
  autoRefresh = false,
  autoRefreshSec = 15,
}: PartnerCallbackLogsSectionProps = {}) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [boot] = useState(() => readPartnerStateFromSearch(searchParams));

  const [columnVisibility, setColumnVisibility] =
    useState<PartnerColumnVisibility>(loadPartnerColumnVisibility);

  function onColumnVisibilityChange(next: PartnerColumnVisibility) {
    setColumnVisibility(next);
    savePartnerColumnVisibility(next);
  }

  // Partners list for filter dropdown
  const [partnerOptions, setPartnerOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    let active = true;
    partnerApi
      .list({ size: 100 })
      .then((res) => {
        if (!active) return;
        const options = (res.items ?? []).map((p: PartnerListItem) => ({
          value: p.id,
          label: `${p.name} (${p.code})`,
        }));
        setPartnerOptions(options);
      })
      .catch(() => {
        // ignore silently
      });
    return () => {
      active = false;
    };
  }, []);

  const [qDraft, setQDraft] = useState(boot.filters.q ?? "");
  const [partnerDraft, setPartnerDraft] = useState<string | null>(
    boot.filters.partnerId ?? null,
  );
  const [orderTypeDraft, setOrderTypeDraft] = useState<string | null>(
    boot.filters.orderType ?? null,
  );
  const [signatureDraft, setSignatureDraft] = useState<string | null>(
    boot.filters.signatureValid === true
      ? "valid"
      : boot.filters.signatureValid === false
        ? "invalid"
        : null,
  );
  const [processedDraft, setProcessedDraft] = useState<string | null>(
    boot.filters.processed === true
      ? "processed"
      : boot.filters.processed === false
        ? "unprocessed"
        : null,
  );

  const [filters, setFilters] = useState<PartnerCallbackFilters>(boot.filters);
  const [page, setPage] = useState(boot.page);
  const [size, setSize] = useState(boot.size);

  const [jsonModal, setJsonModal] = useState<JsonModalState>(null);

  const [openingId, setOpeningId] = useState<string | null>(null);
  const [detailPayin, setDetailPayin] = useState<PayinOrderListItem | null>(null);
  const [detailPayout, setDetailPayout] = useState<PayoutOrderListItem | null>(
    null,
  );
  const [finalizePayinTarget, setFinalizePayinTarget] =
    useState<PayinOrderListItem | null>(null);
  const [finalizePayoutTarget, setFinalizePayoutTarget] =
    useState<PayoutOrderListItem | null>(null);

  const loadList = useCallback(
    async (signal?: AbortSignal) => {
      const data = await partnerApi.listAllCallbackLogs({
        q: filters.q,
        partnerId: filters.partnerId,
        orderType: filters.orderType,
        signatureValid: filters.signatureValid,
        processed: filters.processed,
        page,
        size,
        signal,
      });
      return {
        rows: data.items ?? [],
        total: data.total ?? 0,
      };
    },
    [filters, page, size],
  );

  const mapError = useCallback(
    (e: unknown) =>
      e instanceof ApiError ? e.message : t("callbackLogs.loadError"),
    [t],
  );

  const { loading, error, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_PARTNER_CALLBACK_LIST,
    mapError,
  });

  useAutoRefresh(refresh, { enabled: autoRefresh, intervalSec: autoRefreshSec });

  const hasFilters = Boolean(
    filters.q ||
      filters.partnerId ||
      filters.orderType ||
      filters.signatureValid !== undefined ||
      filters.processed !== undefined,
  );

  const canReset =
    hasFilters ||
    Boolean(qDraft) ||
    partnerDraft != null ||
    orderTypeDraft != null ||
    signatureDraft != null ||
    processedDraft != null;

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function syncUrl(
    next: PartnerCallbackFilters,
    nextPage: number,
    nextSize: number,
  ) {
    const qs = buildQueryString({
      tab: "partner",
      q: next.q,
      partnerId: next.partnerId,
      orderType: next.orderType,
      signatureValid:
        next.signatureValid === true
          ? "true"
          : next.signatureValid === false
            ? "false"
            : undefined,
      processed:
        next.processed === true
          ? "true"
          : next.processed === false
            ? "false"
            : undefined,
      page: nextPage > 0 ? nextPage : undefined,
      size: nextSize !== 20 ? nextSize : undefined,
    });
    router.replace(
      qs ? `${ROUTES.callbackLogs}?${qs}` : `${ROUTES.callbackLogs}?tab=partner`,
    );
  }

  function applyFilters(
    overrides?: Partial<{
      partnerId: string | null;
      orderType: string | null;
      signatureValid: string | null;
      processed: string | null;
    }>,
  ) {
    const rawQ = qDraft.trim();
    const rawPartner =
      overrides && "partnerId" in overrides ? overrides.partnerId : partnerDraft;
    const rawOrderType =
      overrides && "orderType" in overrides
        ? overrides.orderType
        : orderTypeDraft;
    const rawSig =
      overrides && "signatureValid" in overrides
        ? overrides.signatureValid
        : signatureDraft;
    const rawProc =
      overrides && "processed" in overrides
        ? overrides.processed
        : processedDraft;

    const nextFilters: PartnerCallbackFilters = {
      q: rawQ || undefined,
      partnerId: rawPartner?.trim() || undefined,
      orderType: rawOrderType?.trim() || undefined,
      signatureValid:
        rawSig === "valid" ? true : rawSig === "invalid" ? false : undefined,
      processed:
        rawProc === "processed"
          ? true
          : rawProc === "unprocessed"
            ? false
            : undefined,
    };

    setFilters(nextFilters);
    setPage(0);
    syncUrl(nextFilters, 0, size);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function onReset() {
    setQDraft("");
    setPartnerDraft(null);
    setOrderTypeDraft(null);
    setSignatureDraft(null);
    setProcessedDraft(null);
    setFilters({});
    setPage(0);
    router.replace(`${ROUTES.callbackLogs}?tab=partner`);
  }

  async function openOrder(type: string, orderId: string) {
    setOpeningId(orderId);
    try {
      const lower = type.trim().toLowerCase();
      if (lower === "payin") {
        const order = await payinApi.get(orderId);
        setDetailPayin(order);
      } else if (lower === "payout") {
        const order = await payoutApi.get(orderId);
        setDetailPayout(order);
      }
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : t("callbackLogs.orderLoadError");
      toast.error(t("callbackLogs.orderLoadError"), msg);
    } finally {
      setOpeningId(null);
    }
  }

  const orderTypeOptions = useMemo(
    () => [
      { value: "payin", label: t("callbackLogs.typePayin") },
      { value: "payout", label: t("callbackLogs.typePayout") },
    ],
    [t],
  );

  const signatureOptions = useMemo(
    () => [
      { value: "valid", label: t("callbackLogs.sigValid") },
      { value: "invalid", label: t("callbackLogs.sigInvalid") },
    ],
    [t],
  );

  const processedOptions = useMemo(
    () => [
      { value: "processed", label: t("callbackLogs.procSuccess") },
      { value: "unprocessed", label: t("callbackLogs.procPending") },
    ],
    [t],
  );

  const thClass = (col: PartnerCallbackLogColumn) =>
    `${PARTNER_CALLBACK_LOG_COLUMN_WIDTH[col]} ${PARTNER_CALLBACK_LOG_COLUMN_ALIGN[col]} px-3 py-2.5 font-medium`;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="min-w-0 rounded-xl border border-edge bg-elevated px-4 py-4 sm:px-5">
        <FilterBar
          onSearch={onSearch}
          onReset={onReset}
          canReset={canReset}
          loading={loading}
          searchLabel={t("callbackLogs.search")}
          resetLabel={t("callbackLogs.reset")}
          fieldsClassName="lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_repeat(4,minmax(9rem,11rem))]"
        >
          <div className="min-w-0 sm:col-span-2 xl:col-span-1">
            <SearchInput
              id="cb-partner-q"
              value={qDraft}
              onChange={setQDraft}
              placeholder={t("callbackLogs.filterPartnerSearchPlaceholder")}
              label={t("callbackLogs.filterPartnerSearch")}
            />
          </div>

          <div className="min-w-0">
            <Select
              id="cb-partner-filter"
              placeholder={t("callbackLogs.filterPartner")}
              aria-label={t("callbackLogs.filterPartner")}
              options={partnerOptions}
              value={partnerDraft}
              onChange={(val) => {
                setPartnerDraft(val);
                applyFilters({ partnerId: val });
              }}
              clearable
            />
          </div>

          <div className="min-w-0">
            <Select
              id="cb-order-type-filter"
              placeholder={t("callbackLogs.filterType")}
              aria-label={t("callbackLogs.filterType")}
              options={orderTypeOptions}
              value={orderTypeDraft}
              onChange={(val) => {
                setOrderTypeDraft(val);
                applyFilters({ orderType: val });
              }}
              clearable
            />
          </div>

          <div className="min-w-0">
            <Select
              id="cb-sig-filter"
              placeholder={t("callbackLogs.filterSignature")}
              aria-label={t("callbackLogs.filterSignature")}
              options={signatureOptions}
              value={signatureDraft}
              onChange={(val) => {
                setSignatureDraft(val);
                applyFilters({ signatureValid: val });
              }}
              clearable
            />
          </div>

          <div className="min-w-0">
            <Select
              id="cb-proc-filter"
              placeholder={t("callbackLogs.filterProcessed")}
              aria-label={t("callbackLogs.filterProcessed")}
              options={processedOptions}
              value={processedDraft}
              onChange={(val) => {
                setProcessedDraft(val);
                applyFilters({ processed: val });
              }}
              clearable
            />
          </div>
        </FilterBar>
      </div>

      <TableCard
        toolbar={
          <PartnerColumnPicker
            visibility={columnVisibility}
            onChange={onColumnVisibilityChange}
          />
        }
        loading={loading}
        error={error}
        onRetry={refresh}
        retryLabel={t("callbackLogs.refresh")}
        onRefresh={refresh}
        refreshLabel={t("callbackLogs.refresh")}
        pagination={
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            loading={loading}
            onPageChange={(nextPage) => {
              setPage(nextPage);
              syncUrl(filters, nextPage, size);
            }}
            onPageSizeChange={(newSize) => {
              setSize(newSize);
              setPage(0);
              syncUrl(filters, 0, newSize);
            }}
            rangeLabel={t("callbackLogs.range", { from, to, total })}
          />
        }
      >
        <div className="overflow-x-auto">
          <table
            className="w-full text-left text-label"
            style={{
              minWidth: partnerCallbackLogsTableMinWidth(columnVisibility),
            }}
          >
            <thead>
              <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
                {columnVisibility.time && (
                  <th className={thClass("time")}>
                    <ColumnHeader icon={<IconClock width={14} height={14} />}>
                      {t("callbackLogs.colTime")}
                    </ColumnHeader>
                  </th>
                )}
                {columnVisibility.partner && (
                  <th className={thClass("partner")}>
                    <ColumnHeader icon={<IconLayers width={14} height={14} />}>
                      {t("callbackLogs.colPartner")}
                    </ColumnHeader>
                  </th>
                )}
                {columnVisibility.orderType && (
                  <th className={thClass("orderType")}>
                    <ColumnHeader icon={<IconActivity width={14} height={14} />}>
                      {t("callbackLogs.colType")}
                    </ColumnHeader>
                  </th>
                )}
                {columnVisibility.orderId && (
                  <th className={thClass("orderId")}>
                    <ColumnHeader icon={<IconHash width={14} height={14} />}>
                      {t("callbackLogs.colOrderId")}
                    </ColumnHeader>
                  </th>
                )}
                {columnVisibility.signature && (
                  <th className={thClass("signature")}>
                    <ColumnHeader
                      icon={<IconCheckCircle width={14} height={14} />}
                    >
                      {t("callbackLogs.colSignature")}
                    </ColumnHeader>
                  </th>
                )}
                {columnVisibility.processed && (
                  <th className={thClass("processed")}>
                    <ColumnHeader icon={<IconRepeat width={14} height={14} />}>
                      {t("callbackLogs.colProcessed")}
                    </ColumnHeader>
                  </th>
                )}
                {columnVisibility.payload && (
                  <th className={thClass("payload")}>
                    <ColumnHeader icon={<IconInbox width={14} height={14} />}>
                      {t("callbackLogs.colPayload")}
                    </ColumnHeader>
                  </th>
                )}
                {columnVisibility.error && (
                  <th className={thClass("error")}>
                    <ColumnHeader icon={<IconActivity width={14} height={14} />}>
                      {t("callbackLogs.colError")}
                    </ColumnHeader>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading && !rows.length ? (
                <tr>
                  <td
                    colSpan={visiblePartnerColumnCount(columnVisibility)}
                    className="py-12 text-center text-label text-muted"
                  >
                    {t("callbackLogs.loading")}
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={visiblePartnerColumnCount(columnVisibility)}
                    className="py-12 text-center text-label text-danger"
                  >
                    {error}
                  </td>
                </tr>
              ) : !rows.length ? (
                <tr>
                  <td
                    colSpan={visiblePartnerColumnCount(columnVisibility)}
                    className="py-12 text-center text-label text-muted"
                  >
                    {hasFilters
                      ? t("callbackLogs.emptyFiltered")
                      : t("callbackLogs.empty")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-edge/60 transition-colors hover:bg-panel/40"
                  >
                    {columnVisibility.time && (
                      <td
                        className={`py-3 px-3 text-caption text-ink-secondary whitespace-nowrap ${PARTNER_CALLBACK_LOG_COLUMN_ALIGN.time}`}
                      >
                        <DateTimeText value={row.createdAt} />
                      </td>
                    )}
                    {columnVisibility.partner && (
                      <td
                        className={`py-3 px-3 ${PARTNER_CALLBACK_LOG_COLUMN_ALIGN.partner}`}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-ink">
                            {row.partnerCode || "—"}
                          </span>
                          {row.partnerName && (
                            <span className="text-caption text-muted truncate max-w-[140px]">
                              {row.partnerName}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {columnVisibility.orderType && (
                      <td
                        className={`py-3 px-3 ${PARTNER_CALLBACK_LOG_COLUMN_ALIGN.orderType}`}
                      >
                        <StatusBadge
                          tone={
                            row.orderType?.toLowerCase() === "payin"
                              ? "info"
                              : "neutral"
                          }
                        >
                          {row.orderType?.toUpperCase()}
                        </StatusBadge>
                      </td>
                    )}
                    {columnVisibility.orderId && (
                      <td
                        className={`py-3 px-3 ${PARTNER_CALLBACK_LOG_COLUMN_ALIGN.orderId}`}
                      >
                        <IdCell
                          value={row.orderId}
                          copyLabel={t("callbackLogs.copyOrderId")}
                          onOpen={() => openOrder(row.orderType, row.orderId)}
                          openLabel={t("callbackLogs.openOrder")}
                          opening={openingId === row.orderId}
                        />
                      </td>
                    )}
                    {columnVisibility.signature && (
                      <td
                        className={`py-3 px-3 ${PARTNER_CALLBACK_LOG_COLUMN_ALIGN.signature}`}
                      >
                        <StatusBadge
                          tone={
                            row.signatureValid === true
                              ? "active"
                              : row.signatureValid === false
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {row.signatureValid === true
                            ? t("callbackLogs.sigValid")
                            : row.signatureValid === false
                              ? t("callbackLogs.sigInvalid")
                              : "—"}
                        </StatusBadge>
                      </td>
                    )}
                    {columnVisibility.processed && (
                      <td
                        className={`py-3 px-3 ${PARTNER_CALLBACK_LOG_COLUMN_ALIGN.processed}`}
                      >
                        <StatusBadge
                          tone={row.processed ? "active" : "pending"}
                        >
                          {row.processed
                            ? t("callbackLogs.procSuccess")
                            : t("callbackLogs.procPending")}
                        </StatusBadge>
                      </td>
                    )}
                    {columnVisibility.payload && (
                      <td
                        className={`py-3 px-3 ${PARTNER_CALLBACK_LOG_COLUMN_ALIGN.payload}`}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setJsonModal({
                              title: t("callbackLogs.modalPartnerPayloadTitle"),
                              data: row.rawBody,
                            })
                          }
                        >
                          {t("callbackLogs.viewPayload")}
                        </Button>
                      </td>
                    )}
                    {columnVisibility.error && (
                      <td
                        className={`py-3 px-3 text-caption text-danger max-w-[200px] truncate ${PARTNER_CALLBACK_LOG_COLUMN_ALIGN.error}`}
                        title={row.errorMessage ?? undefined}
                      >
                        {row.errorMessage || "—"}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TableCard>

      {jsonModal ? (
        <JsonViewModal
          title={jsonModal.title}
          data={jsonModal.data}
          onClose={() => setJsonModal(null)}
        />
      ) : null}

      {detailPayin ? (
        <PayinDetailDrawer
          row={detailPayin}
          onClose={() => setDetailPayin(null)}
          onFinalize={() => {
            setFinalizePayinTarget(detailPayin);
            setDetailPayin(null);
          }}
        />
      ) : null}

      {detailPayout ? (
        <PayoutDetailDrawer
          row={detailPayout}
          onClose={() => setDetailPayout(null)}
          onFinalize={
            detailPayout.status === "pending" ||
            detailPayout.status === "processing"
              ? () => {
                  setFinalizePayoutTarget(detailPayout);
                  setDetailPayout(null);
                }
              : undefined
          }
        />
      ) : null}

      {finalizePayinTarget ? (
        <FinalizePayinModal
          row={finalizePayinTarget}
          onClose={() => setFinalizePayinTarget(null)}
          onDone={() => {
            void refresh();
          }}
        />
      ) : null}

      {finalizePayoutTarget ? (
        <FinalizePayoutModal
          row={finalizePayoutTarget}
          onClose={() => setFinalizePayoutTarget(null)}
          onDone={() => {
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}
