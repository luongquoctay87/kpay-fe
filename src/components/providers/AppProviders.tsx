"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/vi";
import { useEffect, type ReactNode } from "react";
import { useLocaleStore } from "@/i18n/store";
import { KPAY_THEME } from "@/lib/theme/tokens";

const theme = {
  token: { ...KPAY_THEME },
  components: {
    Layout: {
      headerBg: KPAY_THEME.colorBgContainer,
      siderBg: "#f4f4f5",
      bodyBg: KPAY_THEME.colorBgLayout,
    },
    Table: {
      headerBg: "#fafafa",
      headerColor: KPAY_THEME.colorText,
      rowHoverBg: "#f4f4f5",
    },
    Button: {
      primaryShadow: "none",
      defaultShadow: "none",
    },
    Input: {
      activeBorderColor: KPAY_THEME.colorPrimary,
      hoverBorderColor: KPAY_THEME.colorBorder,
    },
    Select: {
      optionSelectedBg: "#f4f4f5",
    },
  },
};

function LocaleEffects({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);
  const hydrate = useLocaleStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    document.documentElement.lang = locale;
    dayjs.locale(locale === "en" ? "en" : "vi");
  }, [locale]);

  const antdLocale = locale === "en" ? enUS : viVN;

  return (
    <ConfigProvider locale={antdLocale} theme={theme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AntdRegistry>
      <LocaleEffects>{children}</LocaleEffects>
    </AntdRegistry>
  );
}
