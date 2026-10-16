type ApiErrorShape = {
  error?: {
    code?: string;
    message?: string;
    fieldErrors?: Record<string, string>;
  };
};

type ClientRequestOptions = {
  timeoutMs?: number;
};

export class ClientRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly fieldErrors: Record<string, string>;

  constructor({
    message,
    code,
    status,
    retryable,
    fieldErrors,
  }: {
    message: string;
    code: string;
    status: number;
    retryable: boolean;
    fieldErrors?: Record<string, string>;
  }) {
    super(message);
    this.name = "ClientRequestError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.fieldErrors = fieldErrors ?? {};
  }
}

function errorBody(value: unknown): ApiErrorShape {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiErrorShape)
    : {};
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const raw = await response.text();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function fallbackForStatus(status: number) {
  if (status === 401) return "Chưa thể tiếp tục vì phiên đăng nhập đã hết hạn.";
  if (status === 403) return "Chưa thể làm việc này bằng quyền của tài khoản hiện tại.";
  if (status === 404) return "Chưa tìm thấy dữ liệu cần xử lý.";
  if (status === 409) return "Chưa thể lưu vì dữ liệu vừa thay đổi ở nơi khác.";
  if (status >= 500) return "Chưa thể lưu vì máy chủ đang bận. Nội dung bạn nhập vẫn còn.";
  return "Chưa thể hoàn tất thao tác này.";
}

export async function clientRequest<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ClientRequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 12_000;
  let timedOut = false;
  const onCallerAbort = () => controller.abort(init.signal?.reason);

  if (init.signal?.aborted) onCallerAbort();
  else init.signal?.addEventListener("abort", onCallerAbort, { once: true });

  const timer = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(input, {
      ...init,
      headers,
      credentials: init.credentials ?? "same-origin",
      cache: init.cache ?? "no-store",
      signal: controller.signal,
    });
    const data = await readBody(response);

    if (!response.ok) {
      const detail = errorBody(data).error;
      throw new ClientRequestError({
        message: detail?.message ?? fallbackForStatus(response.status),
        code: detail?.code ?? `HTTP_${response.status}`,
        status: response.status,
        retryable: response.status === 408 || response.status === 429 || response.status >= 500,
        fieldErrors: detail?.fieldErrors,
      });
    }

    return data as T;
  } catch (error) {
    if (error instanceof ClientRequestError) throw error;
    if (timedOut) {
      throw new ClientRequestError({
        message: "Chưa thể gửi vì kết nối phản hồi quá lâu. Nội dung bạn nhập vẫn còn.",
        code: "REQUEST_TIMEOUT",
        status: 0,
        retryable: true,
      });
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new ClientRequestError({
        message: "Chưa thể gửi vì thiết bị đang mất mạng. Nội dung bạn nhập vẫn được giữ lại.",
        code: "OFFLINE",
        status: 0,
        retryable: true,
      });
    }
    throw new ClientRequestError({
      message: "Chưa kết nối được tới hệ thống. Nội dung bạn nhập vẫn còn, hãy thử lại.",
      code: "NETWORK_ERROR",
      status: 0,
      retryable: true,
    });
  } finally {
    globalThis.clearTimeout(timer);
    init.signal?.removeEventListener("abort", onCallerAbort);
  }
}

export function clientRequestMessage(error: unknown, fallback: string) {
  return error instanceof ClientRequestError ? error.message : fallback;
}
