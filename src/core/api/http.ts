import type { ValidationErrorWire } from './wire';

/**
 * The single door to the network, absorbing two `fetch` sharp edges: it does not
 * reject on 4xx/5xx, and it has no timeout.
 *
 * Every failure leaves here as one `ApiError`, so panels handle one error shape
 * rather than four. No status code or stack reaches a user.
 */

export type ApiErrorKind = 'network' | 'timeout' | 'validation' | 'client' | 'server';

export interface ApiError {
  kind: ApiErrorKind;
  /** User-facing copy. Safe to render as-is. */
  message: string;
  /** Present only for `validation` — keyed by **camelCase domain field name**. */
  fieldErrors?: Record<string, string>;
  /** For logging and tests, never for display. */
  status?: number;
}

export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'kind' in error && 'message' in error;
}

const MESSAGES: Record<ApiErrorKind, string> = {
  network: 'We could not reach FutureWell. Check your connection and try again.',
  timeout: 'That took longer than expected. Try again in a moment.',
  validation: 'Some answers need checking.',
  client: 'We could not process that request. Try again.',
  server: 'FutureWell is having trouble right now. Try again in a moment.',
};

/** FastAPI sends snake_case field names; components know camelCase ones. */
export function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Defaults to 15s. Guidance passes more — a real model call takes seconds. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, timeoutMs = 15_000, signal } = options;

  // Relative: same origin via nginx in production, the Vite proxy in dev.
  const url = query ? `${path}?${buildQuery(query)}` : path;

  const timeout = AbortSignal.timeout(timeoutMs);
  const composed = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal: composed,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    // A caller-initiated abort is not an error to report.
    if (signal?.aborted) throw cause;
    const kind: ApiErrorKind = timeout.aborted ? 'timeout' : 'network';
    throw { kind, message: MESSAGES[kind] } satisfies ApiError;
  }

  if (response.status === 422) {
    throw {
      kind: 'validation',
      message: MESSAGES.validation,
      fieldErrors: await readFieldErrors(response),
      status: 422,
    } satisfies ApiError;
  }

  // `fetch` resolves for 404 and 500 alike; this is what makes them errors.
  if (!response.ok) {
    const kind: ApiErrorKind = response.status >= 500 ? 'server' : 'client';
    throw { kind, message: MESSAGES[kind], status: response.status } satisfies ApiError;
  }

  try {
    return (await response.json()) as T;
  } catch {
    // 200 with a non-JSON body — typically a proxy error page.
    throw { kind: 'server', message: MESSAGES.server, status: response.status } satisfies ApiError;
  }
}

function buildQuery(query: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

/**
 * Maps FastAPI's `detail[].loc` onto form field names. `loc` is a path such as
 * `["body", "systolic_bp"]`, so the field is the last segment.
 */
async function readFieldErrors(response: Response): Promise<Record<string, string> | undefined> {
  let body: ValidationErrorWire;
  try {
    body = (await response.json()) as ValidationErrorWire;
  } catch {
    return undefined;
  }
  if (!Array.isArray(body?.detail)) return undefined;

  const fieldErrors: Record<string, string> = {};
  for (const item of body.detail) {
    const field = item.loc?.at(-1);
    if (typeof field !== 'string') continue;
    // First message per field wins.
    const name = snakeToCamel(field);
    if (!(name in fieldErrors)) fieldErrors[name] = item.msg;
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}
