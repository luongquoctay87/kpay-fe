"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import {
  ColumnHeader,
  DateTimeText,
  DateRangeFilter,
  dateRangeToIsoBounds,
  FilterField,
  PageHeader,
  Pagination,
  SearchInput,
  TableCard,
  filterControlClass,
  type DateRangeValue,
} from "@/components/common";
import { Button, Select, StatusBadge } from "@/components/ui";
import {
  IconActivity,
  IconClock,
  IconHash,
  IconRefresh,
  IconSearch,
  IconStore,
} from "@/components/icons/NavIcons";
import { agentRateApi, type AgentRateItem } from "@/features/agent-rates/api";
import { bpsToPercent } from "@/features/agents/types";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import { PORTAL_PAGE_CLASS } from "@/lib/constants/portal-layout";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as AgentRateItem[],
  total: 0,
};

const COL_COUNT = 5;

const TABLE_MIN_WIDTH = 52 + 200 + 110 + 140 + 150;

type ActiveFilter = "all" | "active" | "inactive";

export function AgentRatesPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const [qDraft, setQDraft] = useState("");
  const [activeDraft, setActiveDraft] = useState<ActiveFilter>("all");
  const [linkedRangeDraft, setLinkedRangeDraft] = useState<DateRangeValue>(null);
  const [filters, setFilters] = useState<{
    q?: string;
    active?: boolean;
    linkedFrom?: string;
    linkedTo?: string;
  }>({});

  const activeOptions = useMemo(
    () => [
      { value: "all" as const, label: t("agentPortal.filterActiveAll") },
      { value: "active" as const, label: t("agentPortal.statusActive") },
      { value: "inactive" as const, label: t("agentPortal.statusInactive") },
    ],
    [t],
  );

  const canReset =
    Boolean(qDraft.trim()) ||
    activeDraft !== "all" ||
    Boolean(linkedRangeDraft?.[0] || linkedRangeDraft?.[1]);

  const loadList = useCallback(async () => {
    const data = await agentRateApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("agentPortal.ratesLoadError")),
    [t],
  );

  const { loading, error, rows, total } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const linked = dateRangeToIsoBounds(linkedRangeDraft);
    setPage(0);
    setFilters({
      q: qDraft.trim() || undefined,
      active: activeDraft === "all" ? undefined : activeDraft === "active",
      linkedFrom: linked.from,
      linkedTo: linked.to,
    });
  }

  function onReset() {
    setQDraft("");
    setActiveDraft("all");
    setLinkedRangeDraft(null);
    setPage(0);
    setFilters({});
  }

  return (
    <div className={PORTAL_PAGE_CLASS}>
      <PageHeader title={t("pages.agentRates")} />

      <p className="text-body text-muted">{t("agentPortal.ratesHint")}</p>

      <form
        onSubmit={onSearch}
        className="min-w-0 rounded-xl border border-edge bg-elevated px-3 py-3.5 sm:px-5 sm:py-4"
      >
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
          <div className="min-w-0 w-full flex-1">
            <FilterField label={t("agentPortal.filterMerchant")} htmlFor="agent-rate-merchant">
              <SearchInput
                id="agent-rate-merchant"
                value={qDraft}
                onChange={setQDraft}
                placeholder={t("agentPortal.filterMerchantPlaceholder")}
                label={t("agentPortal.filterMerchant")}
              />
            </FilterField>
          </div>
          <div className="w-full min-w-0 lg:w-[12rem] lg:shrink-0">
            <FilterField label={t("agentPortal.filterActive")} htmlFor="agent-rate-active">
              <Select
                id="agent-rate-active"
                size="md"
                options={activeOptions}
                value={activeDraft}
                onChange={(v) => setActiveDraft(v ?? "all")}
                triggerClassName={filterControlClass}
              />
            </FilterField>
          </div>
          <div className="w-full min-w-0 lg:w-[17rem] lg:shrink-0">
            <FilterField label={t("agentPortal.filterLinked")} htmlFor="agent-rate-linked">
              <DateRangeFilter
                id="agent-rate-linked"
                value={linkedRangeDraft}
                onChange={setLinkedRangeDraft}
                placeholder={[
                  t("agentPortal.filterLinkedFromPlaceholder"),
                  t("agentPortal.filterLinkedToPlaceholder"),
                ]}
                aria-label={t("agentPortal.filterLinked")}
              />
            </FilterField>
          </div>
          <div className="flex w-full shrink-0 items-center gap-1.5 lg:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="min-w-0 flex-1 lg:flex-none lg:min-w-[6.5rem]"
              onClick={onReset}
              disabled={!canReset}
              leftIcon={<IconRefresh width={15} height={15} />}
            >
              {t("common.reset")}
            </Button>
            <Button
              type="submit"
              variant="soft"
              size="md"
              className="min-h-9 min-w-0 flex-1 gap-2 px-3 lg:flex-none lg:min-w-[8.75rem] lg:px-4"
              leftIcon={<IconSearch width={16} height={16} />}
            >
              {t("common.search")}
            </Button>
          </div>
        </div>
      </form>

      {error ? <p className="text-body text-danger">{error}</p> : null}

      <TableCard
        pagination={
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setSize(n);
              setPage(0);
            }}
            rangeLabel={`${from}–${to} / ${total}`}
          />
        }
      >
        <table
          className="w-full table-fixed border-separate border-spacing-0 text-left text-label"
          style={{ minWidth: TABLE_MIN_WIDTH }}
        >
          <colgroup>
            <col style={{ width: "52px" }} />
            <col />
            <col style={{ width: "110px" }} />
            <col style={{ width: "140px" }} />
            <col style={{ width: "150px" }} />
          </colgroup>
          <thead>
            <tr className="bg-surface text-label font-medium text-muted [&>th]:border-b [&>th]:border-edge [&>th]:bg-surface">
              <th className="w-[52px] px-3 py-2.5 text-center">
                <ColumnHeader align="center" icon={<IconHash width={14} height={14} />}>
                  {t("agentPortal.colStt")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5 text-left">
                <ColumnHeader icon={<IconStore width={14} height={14} />}>
                  {t("agentPortal.colMerchant")}
                </ColumnHeader>
              </th>
              <th className="w-[110px] px-3 py-2.5 text-right">
                <ColumnHeader align="right" icon={<IconActivity width={14} height={14} />}>
                  {t("agentPortal.colRate")}
                </ColumnHeader>
              </th>
              <th className="w-[140px] px-3 py-2.5 text-center">
                <ColumnHeader align="center" icon={<IconActivity width={14} height={14} />}>
                  {t("agentPortal.colActive")}
                </ColumnHeader>
              </th>
              <th className="w-[150px] px-3 py-2.5 text-center">
                <ColumnHeader align="center" icon={<IconClock width={14} height={14} />}>
                  {t("agentPortal.colLinkedAt")}
                </ColumnHeader>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COL_COUNT} className="px-3 py-8 text-center text-muted">
                  {t("common.loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COL_COUNT} className="px-3 py-8 text-center text-muted">
                  {t("common.noData")}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const merchantLabel = [row.merchantName, row.merchantCode]
                  .filter(Boolean)
                  .join(" · ");
                const channel = row.channelName || row.channelId;
                return (
                  <tr
                    key={row.id}
                    className="[&>td]:border-b [&>td]:border-edge last:[&>td]:border-b-0 hover:bg-surface/70"
                  >
                    <td className="px-3 py-2.5 text-center font-mono text-caption tabular-nums text-muted">
                      {from + idx}
                    </td>
                    <td className="truncate px-3 py-2.5" title={merchantLabel || undefined}>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate">{merchantLabel || "—"}</span>
                        {channel ? (
                          <span className="truncate text-caption text-muted">{channel}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums">
                      {bpsToPercent(row.commissionRateBps)}%
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <StatusBadge tone={row.active ? "active" : "neutral"}>
                        {row.active
                          ? t("agentPortal.statusActive")
                          : t("agentPortal.statusInactive")}
                      </StatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center text-caption text-muted">
                      <DateTimeText value={row.linkedAt} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
