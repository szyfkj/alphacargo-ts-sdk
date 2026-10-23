import type { TMSClientConfig, TMSError } from './types';

/**
 * Canonicalize a JSON object into a deterministic string representation.
 * Recursively sorts keys at all levels and removes whitespace.
 * Must match the server-side canonicalizeJson implementation.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj === 'boolean') return obj.toString();
  if (typeof obj === 'number') {
    if (Number.isNaN(obj)) return 'null';
    if (!Number.isFinite(obj)) return 'null';
    return obj.toString();
  }
  if (typeof obj === 'string') return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    const items = obj.map((item) => canonicalizeJson(item));
    return `[${items.join(',')}]`;
  }

  if (typeof obj === 'object' && obj !== null) {
    const record = obj as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const pairs = sortedKeys
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`);
    return `{${pairs.join(',')}}`;
  }

  return JSON.stringify(obj);
}

/**
 * The request signature: `HMAC-SHA256(apiSecret, canonicalJson(params without
 * sign))`, uppercase hex. Matches the server-side verification.
 *
 * Before 3.0 this function returned a bare SHA-256 that ignored the secret; that
 * scheme is gone — the TMS no longer accepts it.
 */
export async function generateSignature(
  params: Record<string, unknown>,
  apiSecret: string
): Promise<string> {
  if (!apiSecret) {
    throw new Error('Cannot sign the request: apiSecret is missing');
  }
  const { sign, ...paramsWithoutSign } = params;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(canonicalizeJson(paramsWithoutSign)));
  return Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** @deprecated Same as {@link generateSignature}; kept for code written against 2.6/2.7. */
export const generateKeyedSignature = generateSignature;

/** Length-constant string comparison. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Verify a webhook signature from TMS.
 * Takes the parsed JSON body of the webhook request and validates the `sign` field
 * with `apiSecret` — the secret of the `api_key` in the body. A valid result
 * proves the request came from the TMS and was not altered.
 *
 * @param body - The parsed JSON body of the webhook request
 * @param options.apiSecret - Secret paired with the body's `api_key` (required)
 * @param options.maxAgeMs - Maximum age of the request in milliseconds (default: 5 minutes). Set to 0 to disable.
 * @returns Object with `valid` boolean and optional `error` message
 *
 * @example
 * ```typescript
 * import { verifyWebhookSignature } from '@alphacargo/tms-sdk';
 *
 * app.post('/webhooks/delivery-events', async (req, res) => {
 *   const result = await verifyWebhookSignature(req.body, { apiSecret: process.env.TMS_API_SECRET });
 *   if (!result.valid) {
 *     return res.status(401).json({ error: result.error });
 *   }
 *   // Process the verified webhook...
 *   res.json({ success: true });
 * });
 * ```
 */
export async function verifyWebhookSignature(
  body: Record<string, unknown>,
  options: {
    apiSecret: string;
    maxAgeMs?: number;
    /** @deprecated Ignored: the secret is always required since 3.0. */
    requireSecret?: boolean;
  }
): Promise<{ valid: boolean; error?: string }> {
  const { sign, ...payloadWithoutSign } = body;

  if (!options?.apiSecret) {
    return { valid: false, error: 'Missing apiSecret' };
  }

  if (!sign || typeof sign !== 'string') {
    return { valid: false, error: 'Missing signature' };
  }

  const nonceStr = body.nonceStr;
  if (!nonceStr || typeof nonceStr !== 'string') {
    return { valid: false, error: 'Missing nonceStr' };
  }

  // Check timestamp freshness
  const maxAge = options.maxAgeMs ?? 5 * 60 * 1000;
  if (maxAge > 0) {
    const timestamp = parseInt(nonceStr, 10) || 0;
    if (Math.abs(Date.now() - timestamp) > maxAge) {
      return { valid: false, error: 'Request expired' };
    }
  }

  const expected = await generateSignature(payloadWithoutSign, options.apiSecret);
  if (!constantTimeEqual(sign, expected)) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}

/**
 * Generate a random nonce string
 */
export function generateNonce(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get current Unix timestamp in seconds
 */
export function getTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Build query string from parameters
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (typeof value === 'boolean') {
        return `${encodeURIComponent(key)}=${value ? 'true' : 'false'}`;
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    });

  return entries.length > 0 ? `?${entries.join('&')}` : '';
}

/**
 * TMS API Error class
 */
export class TMSApiError extends Error {
  public readonly code: number;
  public readonly details?: unknown;
  public readonly statusCode?: number;

  constructor(error: TMSError, statusCode?: number) {
    super(error.message);
    this.name = 'TMSApiError';
    this.code = error.code;
    this.details = error.details;
    this.statusCode = statusCode;
  }
}

/**
 * HTTP client for making API requests
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;
  private readonly debug: boolean;
  private language?: string;

  constructor(config: TMSClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.timeout = config.timeout ?? 30000;
    this.headers = config.headers ?? {};
    this.debug = config.debug ?? false;
    this.language = config.language;
  }

  /**
   * Set the preferred language for localized error messages (sent as the
   * `Accept-Language` header). Pass `undefined` to clear it (server defaults
   * to English).
   */
  setLanguage(language?: string): void {
    this.language = language;
  }

  /**
   * Sign request body with HMAC signature
   */
  private async signRequest(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const signedBody: Record<string, unknown> = {
      ...body,
      api_key: this.apiKey,
      nonceStr: String(Date.now()),
    };
    signedBody.sign = await generateSignature(signedBody, this.apiSecret);
    return signedBody;
  }

  /**
   * Make HTTP request
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options?: {
      body?: Record<string, unknown>;
      query?: Record<string, unknown>;
      sign?: boolean;
      /** Extra headers for this request only; they win over the client-wide ones. */
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    const url = `${this.baseUrl}${path}${options?.query ? buildQueryString(options.query) : ''}`;
    const sign = options?.sign ?? true;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Localize error messages when a language is configured. Explicit custom
      // headers still win, since they are spread last.
      ...(this.language ? { 'Accept-Language': this.language } : {}),
      ...this.headers,
      ...options?.headers,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    const bodyMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (options?.body && bodyMethods.includes(method)) {
      const body = sign ? await this.signRequest(options.body) : options.body;
      fetchOptions.body = JSON.stringify(body);
    } else if (bodyMethods.includes(method) && sign) {
      // For body methods without body, still add signature params
      fetchOptions.body = JSON.stringify(await this.signRequest({}));
    }


    const response = await fetch(url, fetchOptions);
    const data = await response.json() as Record<string, unknown>;

    // Never log the URL's query string, the body or the response: a signed
    // request is a credential for the length of its nonce window.
    if (this.debug) {
      console.log(`[TMS SDK] ${method} ${this.baseUrl}${path} → ${response.status}`);
    }

    // Handle error responses
    if (!response.ok) {
      throw new TMSApiError(
        {
          code: (data.code as number) ?? response.status,
          message: (data.error as string) ?? (data.message as string) ?? 'An error occurred',
          details: data,
        },
        response.status
      );
    }

    // Handle legacy error format
    if (data.code !== undefined && data.code !== 0 && data.success === false) {
      throw new TMSApiError(
        {
          code: data.code as number,
          message: (data.message as string) ?? 'An error occurred',
          details: data.extra,
        },
        response.status
      );
    }

    // Unwrap legacy envelope ({ code, success, data }) but pass through
    // direct RESTful responses (e.g. PaginatedResult which has its own .data field)
    const isLegacyEnvelope = data.success !== undefined && data.code !== undefined;
    return (isLegacyEnvelope && data.data !== undefined ? data.data : data) as T;
  }

  /**
   * GET request
   */
  async get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.getWithSignature<T>(path, query);
  }

  /**
   * POST request
   */
  async post<T>(
    path: string,
    body?: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>('POST', path, { body, headers });
  }

  /**
   * PUT request
   */
  async put<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    return this.request<T>('PUT', path, { body });
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    return this.request<T>('PATCH', path, { body });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    return this.request<T>('DELETE', path, { body });
  }

  /**
   * GET request with signature (for authenticated GET endpoints).
   *
   * All parameter values are coerced to strings before signing because
   * query-string parameters are always strings after URL parsing on the
   * server. Without this the canonical JSON would differ (e.g. `"page":1`
   * vs `"page":"1"`) and the signature would not match.
   */
  async getWithSignature<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    // Convert all values to strings to match server-side query param parsing
    const stringifiedParams: Record<string, unknown> = {};
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          stringifiedParams[key] = String(value);
        }
      }
    }
    const signedParams = await this.signRequest(stringifiedParams);
    return this.request<T>('GET', path, { query: signedParams, sign: false });
  }
}
