import type { ViMessages } from "@/i18n/messages/vi";

/** Deep-map message tree leaf values to string (for EN catalog typing). */
export type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}.${P}`
    : never
  : never;

type Leaves<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? K : Join<K, Leaves<T[K]>>;
    }[keyof T & string];

/** Dotted keys, e.g. `nav.overview`. */
export type MessageKey = Leaves<ViMessages>;

export type TranslateVars = Record<string, string | number>;
