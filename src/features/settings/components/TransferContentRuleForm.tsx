"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { IconChevronLeft, IconSave, IconX } from "@/components/icons/NavIcons";
import { DateTimeText } from "@/components/common";
import { Button, Field, Input, Select, Switch, Textarea, toast } from "@/components/ui";
import { transferContentApi } from "@/features/settings/api/transfer-content-api";
import { NdckRuleMerchantPanel } from "@/features/settings/components/NdckRuleMerchantPanel";
import type {
  CreateTransferContentRuleBody,
  PrefixPosition,
  TransferContentRule,
  UpdateTransferContentRuleBody,
} from "@/features/settings/types";
import { useI18n } from "@/i18n/use-i18n";
import { useRequiredFields } from "@/lib/forms/use-required-fields";
import { ApiError } from "@/lib/types/api";

const DEFAULT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type PatternPart = { kind: "prefix" | "random" | "fragment"; text: string };

function ndckPatternParts(
  prefix: string,
  position: string | null,
  randomLength: number,
  includeFragment: boolean,
  fragmentLen: number,
): PatternPart[] {
  const pfx = prefix.trim() || "PREFIX";
  const n = Number.isFinite(randomLength) ? Math.min(Math.max(Math.trunc(randomLength), 1), 24) : 8;
  const rand = "X".repeat(n);
  const fragN = Number.isFinite(fragmentLen)
    ? Math.min(Math.max(Math.trunc(fragmentLen), 1), 16)
    : 8;
  const frag = includeFragment ? "R".repeat(fragN) : "";
  const parts: PatternPart[] = [];
  const push = (kind: PatternPart["kind"], text: string) => {
    if (text) parts.push({ kind, text });
  };
  if (position === "after") {
    push("fragment", frag);
    push("random", rand);
    push("prefix", pfx);
  } else if (position === "middle") {
    const left = Math.floor(n / 2);
    push("random", "X".repeat(left));
    push("prefix", pfx);
    push("random", "X".repeat(n - left));
    push("fragment", frag);
  } else {
    push("prefix", pfx);
    push("fragment", frag);
    push("random", rand);
  }
  return parts;
}

function SettingSwitch({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-edge bg-surface px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-label text-ink">{label}</p>
        {hint ? <p className="mt-0.5 text-caption text-muted">{hint}</p> : null}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} aria-label={label} />
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <p className="kpay-text-title font-semibold text-ink">{children}</p>;
}

export function TransferContentRuleForm({
  mode,
  initial,
  canWrite = true,
  variant,
  onCancel,
  onSaved,
  onSubmittingChange,
}: {
  mode: "create" | "edit";
  initial?: TransferContentRule | null;
  canWrite?: boolean;
  variant: "modal" | "page";
  onCancel?: () => void;
  onSaved: (saved: TransferContentRule) => void;
  onSubmittingChange?: (submitting: boolean) => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [prefix, setPrefix] = useState(initial?.prefix ?? "KPAY");
  const [prefixPosition, setPrefixPosition] = useState<string | null>(
    initial?.prefixPosition ?? "before",
  );
  const [randomLength, setRandomLength] = useState(String(initial?.randomLength ?? 8));
  const [randomAlphabet, setRandomAlphabet] = useState(
    initial?.randomAlphabet ?? DEFAULT_ALPHABET,
  );
  const [includeRequestFragment, setIncludeRequestFragment] = useState(
    initial?.includeRequestFragment ?? false,
  );
  const [requestFragmentMaxLen, setRequestFragmentMaxLen] = useState(
    String(initial?.requestFragmentMaxLen ?? 8),
  );
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [note, setNote] = useState(initial?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = submitting || !canWrite;

  const required = useRequiredFields(
    {
      code: mode === "create" ? code : "x",
      name,
      prefix,
      prefixPosition,
      randomLength,
    },
    { selectKeys: ["prefixPosition"] },
  );

  const positionOptions = useMemo(
    () => [
      { value: "before", label: t("settings.positionBefore") },
      { value: "middle", label: t("settings.positionMiddle") },
      { value: "after", label: t("settings.positionAfter") },
    ],
    [t],
  );

  const patternParts = useMemo(
    () =>
      ndckPatternParts(
        prefix,
        prefixPosition,
        Number(randomLength),
        includeRequestFragment,
        Number(requestFragmentMaxLen),
      ),
    [prefix, prefixPosition, randomLength, includeRequestFragment, requestFragmentMaxLen],
  );

  useEffect(() => {
    onSubmittingChange?.(submitting);
  }, [onSubmittingChange, submitting]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    if (required.hasMissing || !prefixPosition) {
      required.reveal();
      return;
    }
    const len = Number(randomLength);
    if (!Number.isFinite(len) || len < 4 || len > 24) {
      setError(t("settings.errorRandomLength"));
      return;
    }
    const fragLen = Number(requestFragmentMaxLen);
    if (
      includeRequestFragment &&
      (!Number.isFinite(fragLen) || fragLen < 1 || fragLen > 32)
    ) {
      setError(t("settings.errorFragmentLen"));
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "create") {
        const body: CreateTransferContentRuleBody = {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          prefix: prefix.trim(),
          prefixPosition: prefixPosition as PrefixPosition,
          randomLength: len,
          randomAlphabet: randomAlphabet.trim() || undefined,
          includeRequestFragment,
          requestFragmentMaxLen: includeRequestFragment ? fragLen : undefined,
          isDefault,
          isActive,
          note: note.trim() || undefined,
        };
        const saved = await transferContentApi.create(body);
        toast.success(t("settings.ruleCreateOk"));
        onSaved(saved);
        return;
      }
      if (!initial) return;
      const body: UpdateTransferContentRuleBody = {
        name: name.trim(),
        prefix: prefix.trim(),
        prefixPosition: prefixPosition as PrefixPosition,
        randomLength: len,
        randomAlphabet: randomAlphabet.trim(),
        includeRequestFragment,
        requestFragmentMaxLen: includeRequestFragment ? fragLen : undefined,
        isDefault,
        isActive,
        note: note.trim() || null,
      };
      const saved = await transferContentApi.update(initial.id, body);
      toast.success(t("settings.ruleUpdateOk"));
      onSaved(saved);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("settings.ruleSaveError");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const identityFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      {mode === "create" ? (
        <Field
          label={t("settings.labelCode")}
          htmlFor="tcr-code"
          required
          error={required.errorOf("code")}
        >
          <Input
            id="tcr-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={locked}
            invalid={Boolean(required.errorOf("code"))}
            autoComplete="off"
            autoFocus
            placeholder={t("settings.placeholderCode")}
            className="font-mono"
          />
        </Field>
      ) : (
        <Field label={t("settings.labelCode")} htmlFor="tcr-code-ro">
          <Input
            id="tcr-code-ro"
            value={initial?.code ?? ""}
            disabled
            className="font-mono"
          />
        </Field>
      )}
      <Field
        label={t("settings.labelName")}
        htmlFor="tcr-name"
        required
        error={required.errorOf("name")}
      >
        <Input
          id="tcr-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={locked}
          invalid={Boolean(required.errorOf("name"))}
          placeholder={t("settings.placeholderRuleName")}
          autoFocus={mode === "edit" && canWrite}
        />
      </Field>
    </div>
  );

  const patternFields = (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("settings.labelPrefix")}
          htmlFor="tcr-prefix"
          required
          error={required.errorOf("prefix")}
        >
          <Input
            id="tcr-prefix"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
            disabled={locked}
            invalid={Boolean(required.errorOf("prefix"))}
            placeholder={t("settings.placeholderPrefix")}
            className="font-mono"
          />
        </Field>
        <Field
          label={t("settings.labelPosition")}
          htmlFor="tcr-position"
          required
          error={required.errorOf("prefixPosition")}
        >
          <Select
            id="tcr-position"
            value={prefixPosition}
            onChange={setPrefixPosition}
            options={positionOptions}
            disabled={locked}
            invalid={Boolean(required.errorOf("prefixPosition"))}
          />
        </Field>
        <Field
          label={t("settings.labelRandomLength")}
          htmlFor="tcr-random-len"
          required
          hint={t("settings.hintRandomLength")}
          error={required.errorOf("randomLength")}
        >
          <Input
            id="tcr-random-len"
            type="number"
            min={4}
            max={24}
            value={randomLength}
            onChange={(e) => setRandomLength(e.target.value)}
            disabled={locked}
            invalid={Boolean(required.errorOf("randomLength"))}
          />
        </Field>
        <Field
          label={t("settings.labelAlphabet")}
          htmlFor="tcr-alphabet"
          hint={t("settings.hintAlphabet")}
        >
          <Input
            id="tcr-alphabet"
            value={randomAlphabet}
            onChange={(e) => setRandomAlphabet(e.target.value.toUpperCase())}
            disabled={locked}
            className="font-mono"
          />
        </Field>
      </div>

      <div className="rounded-lg border border-edge bg-surface px-3.5 py-3">
        <p className="text-caption font-medium text-muted">{t("settings.patternPreview")}</p>
        <p className="mt-1.5 break-all font-mono text-label leading-relaxed">
          {patternParts.map((part, i) => (
            <span
              key={`${part.kind}-${i}`}
              className={
                part.kind === "prefix"
                  ? "font-semibold text-ink"
                  : part.kind === "fragment"
                    ? "text-accent"
                    : "tracking-wide text-muted"
              }
            >
              {part.text}
            </span>
          ))}
        </p>
        <p className="mt-1.5 text-caption text-muted">{t("settings.patternPreviewHint")}</p>
      </div>

      <SettingSwitch
        label={t("settings.labelIncludeFragment")}
        hint={t("settings.hintFragment")}
        checked={includeRequestFragment}
        onChange={setIncludeRequestFragment}
        disabled={locked}
      />
      {includeRequestFragment ? (
        <Field label={t("settings.labelFragmentMaxLen")} htmlFor="tcr-frag-len">
          <Input
            id="tcr-frag-len"
            type="number"
            min={1}
            max={32}
            value={requestFragmentMaxLen}
            onChange={(e) => setRequestFragmentMaxLen(e.target.value)}
            disabled={locked}
          />
        </Field>
      ) : null}
    </>
  );

  const applyFields = (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <SettingSwitch
          label={t("settings.labelIsDefault")}
          hint={t("settings.hintIsDefault")}
          checked={isDefault}
          onChange={setIsDefault}
          disabled={locked}
        />
        <SettingSwitch
          label={t("settings.labelIsActive")}
          hint={t("settings.hintIsActive")}
          checked={isActive}
          onChange={setIsActive}
          disabled={locked}
        />
      </div>
      <Field label={t("settings.labelNote")} htmlFor="tcr-note">
        <Textarea
          id="tcr-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={locked}
          rows={3}
          className="min-h-[72px]"
        />
      </Field>
    </>
  );

  const errorAlert = error ? (
    <p
      role="alert"
      className="rounded-lg border border-danger-edge bg-danger-bg px-3 py-2.5 text-label text-danger"
    >
      {error}
    </p>
  ) : null;

  const actionButtons = (
    <>
      <Button
        type="button"
        variant="secondary"
        size="md"
        className="w-full sm:w-auto"
        leftIcon={
          variant === "page" ? (
            <IconChevronLeft width={15} height={15} />
          ) : (
            <IconX width={15} height={15} />
          )
        }
        onClick={() => onCancel?.()}
        disabled={submitting}
      >
        {variant === "page" ? t("settings.btnBackRules") : t("common.cancel")}
      </Button>
      {canWrite ? (
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full sm:w-auto"
          loading={submitting}
          leftIcon={<IconSave width={15} height={15} />}
        >
          {mode === "create" ? t("settings.btnCreate") : t("settings.btnSave")}
        </Button>
      ) : null}
    </>
  );

  if (variant === "modal") {
    return (
      <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          <div className="space-y-3">
            <p className="text-label font-medium text-ink">{t("settings.sectionIdentity")}</p>
            {identityFields}
          </div>
          <div className="space-y-3">
            <p className="text-label font-medium text-ink">{t("settings.sectionPattern")}</p>
            {patternFields}
          </div>
          <div className="space-y-3">
            <p className="text-label font-medium text-ink">{t("settings.sectionApply")}</p>
            {applyFields}
          </div>
          {errorAlert}
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-edge px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          {actionButtons}
        </div>
      </form>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col">
      {initial ? (
        <div className="border-b border-edge bg-surface px-4 py-3 sm:px-5">
          <dl className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-caption text-muted">{t("settings.colMerchants")}</dt>
              <dd className="mt-0.5 font-mono text-label tabular-nums text-ink">
                {initial.merchantCount ?? 0}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-caption text-muted">{t("settings.colCreatedAt")}</dt>
              <dd className="mt-0.5 text-label text-ink">
                <DateTimeText value={initial.createdAt} />
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-caption text-muted">{t("settings.colUpdatedAt")}</dt>
              <dd className="mt-0.5 text-label text-ink">
                <DateTimeText value={initial.updatedAt} />
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="flex flex-col divide-y divide-edge">
        <section className="space-y-4 p-4 sm:p-5">
          <SectionHeading>{t("settings.sectionIdentity")}</SectionHeading>
          {identityFields}
        </section>

        <section className="space-y-4 p-4 sm:p-5">
          <SectionHeading>{t("settings.sectionPattern")}</SectionHeading>
          {patternFields}
        </section>

        <section className="space-y-4 p-4 sm:p-5">
          <SectionHeading>{t("settings.sectionApply")}</SectionHeading>
          {applyFields}
          {errorAlert}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-end">
            {actionButtons}
          </div>
        </section>
      </div>
    </form>
  );
}

export function RuleFormModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (saved: TransferContentRule) => void;
}) {
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, submitting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tcr-form-title"
        className="flex max-h-[min(100dvh-1.5rem,90vh)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-edge bg-elevated shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge px-4 py-4 sm:px-5">
          <p id="tcr-form-title" className="kpay-text-title font-semibold">
            {t("settings.ruleModalCreate")}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink disabled:opacity-50"
            aria-label={t("common.cancel")}
          >
            <IconX width={16} height={16} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <TransferContentRuleForm
              mode="create"
              variant="modal"
              onCancel={onClose}
              onSaved={onSaved}
              onSubmittingChange={setSubmitting}
            />
          </div>
          <div className="flex max-h-64 min-h-0 w-full shrink-0 flex-col border-t border-edge lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
            <NdckRuleMerchantPanel ruleId={null} canWrite={false} embedded />
          </div>
        </div>
      </div>
    </div>
  );
}
