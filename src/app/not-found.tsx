"use client";

import { Result } from "antd";
import { AppFooter } from "@/components/layout/AppFooter";
import { DocumentTitle } from "@/components/layout/DocumentTitle";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/use-i18n";
import { ROUTES } from "@/lib/constants/routes";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <DocumentTitle title={`404 · ${t("brand.admin")}`} />
      <main className="flex flex-1 items-center justify-center p-4">
        <Result
          status="404"
          title="404"
          subTitle={t("errors.notFoundHint")}
          extra={
            <Button href={ROUTES.home} variant="primary">
              {t("errors.backHome")}
            </Button>
          }
        />
      </main>
      <AppFooter variant="public" />
    </div>
  );
}
