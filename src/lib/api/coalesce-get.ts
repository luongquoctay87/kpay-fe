import axios, {
  AxiosHeaders,
  CanceledError,
  getAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

type InflightGet = {
  key: string;
  promise: Promise<AxiosResponse>;
  httpAbort: AbortController;
  subscribers: number;
  releaseTimer: ReturnType<typeof setTimeout> | null;
};

const inflightGets = new Map<string, InflightGet>();

function stableSerialize(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`)
    .join(",")}}`;
}

function headerAuth(config: InternalAxiosRequestConfig): string {
  const headers = config.headers;
  if (!headers) return "";
  if (headers instanceof AxiosHeaders) {
    return String(headers.get("Authorization") ?? headers.get("authorization") ?? "");
  }
  const raw = headers as Record<string, unknown>;
  return String(raw.Authorization ?? raw.authorization ?? "");
}

/** Only coalesce plain JSON GETs — never exports/blobs or mutating methods. */
export function coalesceGetKey(config: InternalAxiosRequestConfig): string | null {
  const method = (config.method ?? "get").toLowerCase();
  if (method !== "get") return null;
  if (config.responseType && config.responseType !== "json") return null;

  const base = config.baseURL ?? "";
  const url = config.url ?? "";
  const params = stableSerialize(config.params);
  const auth = headerAuth(config);
  return `${base}|${url}|${params}|${auth}`;
}

function detach(entry: InflightGet): void {
  entry.subscribers -= 1;
  if (entry.subscribers > 0) return;

  if (entry.releaseTimer) clearTimeout(entry.releaseTimer);
  // Grace period so React Strict Mode (effect cleanup → remount) can rejoin
  // the same in-flight GET instead of opening a second HTTP call.
  entry.releaseTimer = setTimeout(() => {
    if (entry.subscribers > 0) return;
    inflightGets.delete(entry.key);
    if (!entry.httpAbort.signal.aborted) {
      entry.httpAbort.abort();
    }
  }, 0);
}

function joinInflight(
  entry: InflightGet,
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse> {
  const signal = config.signal as AbortSignal | undefined;
  let settled = false;

  const onDone = () => {
    if (settled) return;
    settled = true;
    detach(entry);
  };

  if (signal?.aborted) {
    onDone();
    return Promise.reject(new CanceledError());
  }

  const onAbort = () => onDone();
  if (signal) {
    signal.addEventListener("abort", onAbort, { once: true });
  }

  return entry.promise.then(
    (response) => {
      if (signal) signal.removeEventListener("abort", onAbort);
      if (signal?.aborted) {
        onDone();
        throw new CanceledError();
      }
      onDone();
      return response;
    },
    (error) => {
      if (signal) signal.removeEventListener("abort", onAbort);
      onDone();
      throw error;
    },
  );
}

const resolvedAdapter = getAdapter(axios.defaults.adapter);
if (typeof resolvedAdapter !== "function") {
  throw new Error("axios default adapter is not available");
}
const defaultAdapter = resolvedAdapter;

/**
 * Axios adapter: coalesce identical concurrent GETs into one HTTP request.
 * Fixes React Strict Mode double-mount firing two list loads on every page.
 */
export async function coalesceGetAdapter(
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse> {
  const key = coalesceGetKey(config);
  if (!key) {
    return defaultAdapter(config);
  }

  const existing = inflightGets.get(key);
  if (existing) {
    if (existing.releaseTimer) {
      clearTimeout(existing.releaseTimer);
      existing.releaseTimer = null;
    }
    existing.subscribers += 1;
    return joinInflight(existing, config);
  }

  const httpAbort = new AbortController();
  const entry: InflightGet = {
    key,
    httpAbort,
    subscribers: 1,
    releaseTimer: null,
    promise: null as unknown as Promise<AxiosResponse>,
  };

  const httpConfig: InternalAxiosRequestConfig = {
    ...config,
    signal: httpAbort.signal,
  };

  entry.promise = Promise.resolve(defaultAdapter(httpConfig)).finally(() => {
    if (entry.releaseTimer) clearTimeout(entry.releaseTimer);
    entry.releaseTimer = setTimeout(() => {
      if (entry.subscribers <= 0) {
        inflightGets.delete(key);
      }
    }, 0);
  });

  inflightGets.set(key, entry);
  return joinInflight(entry, config);
}
