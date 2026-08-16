"use client";

import { useCallback, useState, type FormEvent } from "react";
import {
  ColumnHeader,
  DateTimeText,
  FilterField,
  PageHeader,
  Pagination,
  TableCard,
  dateTimeControlClass,
} from "@/components/common";
import { Button, Input } from "@/components/ui";
import {
  IconClock,
  IconHash,
  IconLink,
  IconRefresh,
  IconSearch,
  IconStore,
  IconWallet,
} from "@/components/icons/NavIcons";
import {
  agentCommissionApi,
  type AgentCommissionItem,
} from "@/features/agent-commissions/api";
import { AgentCommissionDetailDrawer } from "@/features/agent-commissions/components/AgentCommissionDetailDrawer";
import { useI18n } from "@/i18n/use-i18n";
import { usePagedList } from "@/lib/async/use-paged-list";
import {
  PORTAL_FILTER_ACTIONS_CLASS,
  PORTAL_FILTER_CLASS,
  PORTAL_PAGE_CLASS,
} from "@/lib/constants/portal-layout";
import { formatMoney, localDateTimeInputToIso } from "@/lib/format/datetime";
import { ApiError } from "@/lib/types/api";

const EMPTY_LIST = {
  rows: [] as AgentCommissionItem[],
  total: 0,
};

export function AgentCommissionListPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [detailRow, setDetailRow] = useState<AgentCommissionItem | null>(null);

  const [createdFromDraft, setCreatedFromDraft] = useState("");
  const [createdToDraft, setCreatedToDraft] = useState("");
  const [filters, setFilters] = useState<{
    createdFrom?: string;
    createdTo?: string;
  }>({});

  const loadList = useCallback(async () => {
    const data = await agentCommissionApi.list({ ...filters, page, size });
    return {
      rows: data.items ?? [],
      total: data.totalElements ?? 0,
    };
  }, [filters, page, size]);

  const mapError = useCallback(
    (e: unknown) => (e instanceof ApiError ? e.message : t("agentPortal.commissionsLoadError")),
    [t],
  );

  const { loading, error, rows, total, refresh } = usePagedList({
    load: loadList,
    empty: EMPTY_LIST,
    mapError,
  });

  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(0);
    setFilters({
      createdFrom: localDateTimeInputToIso(createdFromDraft) || undefined,
      createdTo: localDateTimeInputToIso(createdToDraft) || undefined,
    });
  }

  function onReset() {
    setCreatedFromDraft("");
    setCreatedToDraft("");
    setPage(0);
    setFilters({});
  }

  return (
    <div className={PORTAL_PAGE_CLASS}>
      <PageHeader
        title={t("pages.agentCommissions")}
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<IconRefresh width={14} height={14} />}
            onClick={() => void refresh()}
          >
            {t("common.refresh")}
          </Button>
        }
      />

      <form onSubmit={onSearch} className={PORTAL_FILTER_CLASS}>
        <FilterField label={t("agentPortal.filterCreatedFrom")} htmlFor="agent-comm-from">
          <Input
            type="datetime-local"
            className={dateTimeControlClass}
            value={createdFromDraft}
            onChange={(e) => setCreatedFromDraft(e.target.value)}
          />
        </FilterField>
        <FilterField label={t("agentPortal.filterCreatedTo")} htmlFor="agent-comm-to">
          <Input
            type="datetime-local"
            className={dateTimeControlClass}
            value={createdToDraft}
            onChange={(e) => setCreatedToDraft(e.target.value)}
          />
        </FilterField>
        <div className={PORTAL_FILTER_ACTIONS_CLASS}>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            leftIcon={<IconSearch width={14} height={14} />}
          >
            {t("common.search")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<IconRefresh width={14} height={14} />}
            onClick={onReset}
          >
            {t("common.reset")}
          </Button>
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
        <table className="w-full min-w-[640px] border-collapse text-left text-label">
          <thead>
            <tr className="border-b border-edge bg-surface text-label font-medium text-muted">
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconClock width={14} height={14} />}>
                  {t("agentPortal.colCreatedAt")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconHash width={14} height={14} />}>
                  {t("agentPortal.colRequestId")}
                </ColumnHeader>
              </th>
              <th className="hidden px-3 py-2.5 md:table-cell">
                <ColumnHeader icon={<IconStore width={14} height={14} />}>
                  {t("agentPortal.colMerchant")}
                </ColumnHeader>
              </th>
              <th className="hidden px-3 py-2.5 lg:table-cell">
                <ColumnHeader icon={<IconLink width={14} height={14} />}>
                  {t("agentPortal.colChannel")}
                </ColumnHeader>
              </th>
              <th className="hidden px-3 py-2.5 sm:table-cell">
                <ColumnHeader icon={<IconWallet width={14} height={14} />}>
                  {t("agentPortal.colAcceptedAmount")}
                </ColumnHeader>
              </th>
              <th className="px-3 py-2.5">
                <ColumnHeader icon={<IconWallet width={14} height={14} />}>
                  {t("agentPortal.colCommission")}
                </ColumnHeader>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  {t("common.loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  {t("common.noData")}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const merchantLabel = [row.merchantName, row.merchantCode]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr
                    key={row.ledgerId}
                    className="cursor-pointer border-b border-edge last:border-b-0 hover:bg-surface/70"
                    onClick={() => setDetailRow(row)}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 text-caption text-muted">
                      <DateTimeText value={row.createdAt} />
                    </td>
                    <td className="max-w-[9rem] truncate px-3 py-2.5 font-mono text-caption sm:max-w-none">
                      {row.requestId ?? "—"}
                    </td>
                    <td className="hidden max-w-[10rem] truncate px-3 py-2.5 md:table-cell">
                      {merchantLabel || "—"}
                    </td>
                    <td className="hidden px-3 py-2.5 lg:table-cell">{row.channelId ?? "—"}</td>
                    <td className="hidden px-3 py-2.5 tabular-nums sm:table-cell">
                      {formatMoney(row.acceptedAmount ?? 0)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums font-medium">
                      {formatMoney(row.commissionAmount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableCard>

      {detailRow ? (
        <AgentCommissionDetailDrawer row={detailRow} onClose={() => setDetailRow(null)} />
      ) : null}
    </div>
  );
}
