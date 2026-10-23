// src/utils.ts
function canonicalizeJson(obj) {
  if (obj === null) return "null";
  if (obj === void 0) return "undefined";
  if (typeof obj === "boolean") return obj.toString();
  if (typeof obj === "number") {
    if (Number.isNaN(obj)) return "null";
    if (!Number.isFinite(obj)) return "null";
    return obj.toString();
  }
  if (typeof obj === "string") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    const items = obj.map((item) => canonicalizeJson(item));
    return `[${items.join(",")}]`;
  }
  if (typeof obj === "object" && obj !== null) {
    const record = obj;
    const sortedKeys = Object.keys(record).sort();
    const pairs = sortedKeys.filter((key) => record[key] !== void 0).map((key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`);
    return `{${pairs.join(",")}}`;
  }
  return JSON.stringify(obj);
}
async function generateSignature(params, apiSecret) {
  if (!apiSecret) {
    throw new Error("Cannot sign the request: apiSecret is missing");
  }
  const { sign, ...paramsWithoutSign } = params;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(canonicalizeJson(paramsWithoutSign)));
  return Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}
var generateKeyedSignature = generateSignature;
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
async function verifyWebhookSignature(body, options) {
  const { sign, ...payloadWithoutSign } = body;
  if (!options?.apiSecret) {
    return { valid: false, error: "Missing apiSecret" };
  }
  if (!sign || typeof sign !== "string") {
    return { valid: false, error: "Missing signature" };
  }
  const nonceStr = body.nonceStr;
  if (!nonceStr || typeof nonceStr !== "string") {
    return { valid: false, error: "Missing nonceStr" };
  }
  const maxAge = options.maxAgeMs ?? 5 * 60 * 1e3;
  if (maxAge > 0) {
    const timestamp = parseInt(nonceStr, 10) || 0;
    if (Math.abs(Date.now() - timestamp) > maxAge) {
      return { valid: false, error: "Request expired" };
    }
  }
  const expected = await generateSignature(payloadWithoutSign, options.apiSecret);
  if (!constantTimeEqual(sign, expected)) {
    return { valid: false, error: "Invalid signature" };
  }
  return { valid: true };
}
function generateNonce(length = 32) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
function getTimestamp() {
  return Math.floor(Date.now() / 1e3);
}
function buildQueryString(params) {
  const entries = Object.entries(params).filter(([, value]) => value !== void 0 && value !== null).map(([key, value]) => {
    if (typeof value === "boolean") {
      return `${encodeURIComponent(key)}=${value ? "true" : "false"}`;
    }
    return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
  });
  return entries.length > 0 ? `?${entries.join("&")}` : "";
}
var TMSApiError = class extends Error {
  constructor(error, statusCode) {
    super(error.message);
    this.name = "TMSApiError";
    this.code = error.code;
    this.details = error.details;
    this.statusCode = statusCode;
  }
};
var HttpClient = class {
  constructor(config) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.timeout = config.timeout ?? 3e4;
    this.headers = config.headers ?? {};
    this.debug = config.debug ?? false;
    this.language = config.language;
  }
  /**
   * Set the preferred language for localized error messages (sent as the
   * `Accept-Language` header). Pass `undefined` to clear it (server defaults
   * to English).
   */
  setLanguage(language) {
    this.language = language;
  }
  /**
   * Sign request body with HMAC signature
   */
  async signRequest(body) {
    const signedBody = {
      ...body,
      api_key: this.apiKey,
      nonceStr: String(Date.now())
    };
    signedBody.sign = await generateSignature(signedBody, this.apiSecret);
    return signedBody;
  }
  /**
   * Make HTTP request
   */
  async request(method, path, options) {
    const url = `${this.baseUrl}${path}${options?.query ? buildQueryString(options.query) : ""}`;
    const sign = options?.sign ?? true;
    const headers = {
      "Content-Type": "application/json",
      // Localize error messages when a language is configured. Explicit custom
      // headers still win, since they are spread last.
      ...this.language ? { "Accept-Language": this.language } : {},
      ...this.headers,
      ...options?.headers
    };
    const fetchOptions = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout)
    };
    const bodyMethods = ["POST", "PUT", "PATCH", "DELETE"];
    if (options?.body && bodyMethods.includes(method)) {
      const body = sign ? await this.signRequest(options.body) : options.body;
      fetchOptions.body = JSON.stringify(body);
    } else if (bodyMethods.includes(method) && sign) {
      fetchOptions.body = JSON.stringify(await this.signRequest({}));
    }
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    if (this.debug) {
      console.log(`[TMS SDK] ${method} ${this.baseUrl}${path} \u2192 ${response.status}`);
    }
    if (!response.ok) {
      throw new TMSApiError(
        {
          code: data.code ?? response.status,
          message: data.error ?? data.message ?? "An error occurred",
          details: data
        },
        response.status
      );
    }
    if (data.code !== void 0 && data.code !== 0 && data.success === false) {
      throw new TMSApiError(
        {
          code: data.code,
          message: data.message ?? "An error occurred",
          details: data.extra
        },
        response.status
      );
    }
    const isLegacyEnvelope = data.success !== void 0 && data.code !== void 0;
    return isLegacyEnvelope && data.data !== void 0 ? data.data : data;
  }
  /**
   * GET request
   */
  async get(path, query) {
    return this.getWithSignature(path, query);
  }
  /**
   * POST request
   */
  async post(path, body, headers) {
    return this.request("POST", path, { body, headers });
  }
  /**
   * PUT request
   */
  async put(path, body) {
    return this.request("PUT", path, { body });
  }
  /**
   * PATCH request
   */
  async patch(path, body) {
    return this.request("PATCH", path, { body });
  }
  /**
   * DELETE request
   */
  async delete(path, body) {
    return this.request("DELETE", path, { body });
  }
  /**
   * GET request with signature (for authenticated GET endpoints).
   *
   * All parameter values are coerced to strings before signing because
   * query-string parameters are always strings after URL parsing on the
   * server. Without this the canonical JSON would differ (e.g. `"page":1`
   * vs `"page":"1"`) and the signature would not match.
   */
  async getWithSignature(path, params) {
    const stringifiedParams = {};
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== void 0 && value !== null) {
          stringifiedParams[key] = String(value);
        }
      }
    }
    const signedParams = await this.signRequest(stringifiedParams);
    return this.request("GET", path, { query: signedParams, sign: false });
  }
};

// src/resources/waybills.ts
var Waybills = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List waybills with optional filters and pagination
   *
   * @param params - Optional filter and pagination parameters
   * @returns Paginated list of waybill summaries
   *
   * @example
   * ```typescript
   * // List all waybills
   * const result = await client.waybills.list();
   * console.log(result.data); // WaybillSummary[]
   * console.log(result.total); // Total count
   *
   * // With filters
   * const filtered = await client.waybills.list({
   *   search: 'TH24020001,TH24020002',
   *   statuses: 'created,accepted',
   *   page: 1,
   *   pageSize: 50,
   *   date_from: '2026-01-01',
   *   route_id: 'route-uuid'
   * });
   * ```
   */
  async list(params) {
    const query = { ...params };
    if (params && "reference_no" in params && params.reference_no === null) {
      query.reference_no = "";
    }
    return this.http.getWithSignature("/waybills", query);
  }
  /**
   * Count waybills grouped by the service resolved from the requesting org's
   * delegation. Aggregated server-side, so a caller can learn how many distinct
   * services a filtered set of waybills spans (and the per-service count) without
   * paging every row.
   *
   * @param params - Same filters as {@link list}, minus pagination
   * @returns One row per service: `{ service_id, service_name, count }`
   *          (service_id/service_name null for waybills with no delegation)
   *
   * @example
   * ```typescript
   * const counts = await client.waybills.countByService({
   *   route_id: 'route-uuid',
   *   statuses: 'delivered',
   *   sender_account_code: 'SND-001',
   * });
   * // [{ service_id: '…', service_name: '陆运', count: 3 }, …]
   * ```
   */
  async countByService(params) {
    return this.http.getWithSignature("/waybills/service-counts", { ...params });
  }
  /**
   * Get waybill details by waybill number
   *
   * @param waybillNo - Waybill number or external waybill number
   * @returns Full waybill details including packages, recipient, delegations,
   *          additional (add-on) services, billings, etc. For a master waybill,
   *          `billings` merges the master's own billings with its sub-waybills'
   *          billings (canceled excluded) — the same set `getBillings()`
   *          returns — so a separate call isn't needed.
   *
   * @example
   * ```typescript
   * const waybill = await client.waybills.get('TH24020001');
   * console.log(waybill.status); // 'accepted'
   * console.log(waybill.packages); // Package details
   * console.log(waybill.recipient?.name); // 'John Doe'
   * console.log(waybill.billings?.[0]?.amount); // 150
   * ```
   */
  async get(waybillNo) {
    return this.http.getWithSignature(`/waybills/${encodeURIComponent(waybillNo)}`);
  }
  /**
   * Create a new waybill (shipping order)
   *
   * @param data - Waybill creation data
   * @returns Created waybill with tracking information
   *
   * @example
   * ```typescript
   * const waybill = await client.waybills.create({
   *   outTradeNo: 'ORDER-2024-001',
   *   owner: 'warehouse-a',
   *   senderName: 'Acme Warehouse',
   *   senderPhone: '0212345678',
   *   senderCityName: 'Bangkok',
   *   senderDistrictName: 'Watthana',
   *   senderPostCode: '10110',
   *   senderAddress: '123 Sukhumvit Road',
   *   receiverName: 'John Doe',
   *   receiverPhone: '0812345678',
   *   receiverProvinceName: 'Bangkok',
   *   receiverCityName: 'Bangkok',
   *   receiverDistrictName: 'Chatuchak',
   *   receiverPostCode: '10900',
   *   receiverAddress: '456 Phaholyothin Road',
   *   parcelList: [{
   *     outParcelNo: 'PKG-001',
   *     itemDesc: 'Electronics',
   *     itemValue: 1500,
   *     productList: [{ name: 'Wireless Mouse', sku: 'SKU-001', quantity: 2 }]
   *   }]
   * });
   * console.log(waybill.waybill_no); // 'TH24020001'
   * ```
   */
  async create(data, options) {
    const query = options?.overwrite ? { overwrite: options.overwrite } : void 0;
    return this.http.request("POST", "/waybills", {
      body: data,
      query
    });
  }
  /**
   * Cancel a waybill
   *
   * @param waybillNo - Waybill number or external waybill number
   *
   * @example
   * ```typescript
   * await client.waybills.cancel('TH24020001');
   * ```
   */
  async cancel(waybillNo) {
    return this.http.delete(`/waybills/${encodeURIComponent(waybillNo)}`);
  }
  /**
   * Update waybill fields
   *
   * @param waybillNo - Waybill number or external waybill number
   * @param data - Fields to update
   * @returns Updated waybill details
   *
   * @example
   * ```typescript
   * const waybill = await client.waybills.update('TH24020001', {
   *   reference_no: 'PO-12345',
   *   notes: 'Handle with care',
   *   tags: ['fragile', 'priority'],
   * });
   * ```
   */
  async update(waybillNo, data) {
    return this.http.patch(`/waybills/${encodeURIComponent(waybillNo)}`, data);
  }
  /**
   * Get tracking events for a waybill
   *
   * @param waybillNo - Waybill number
   * @returns Tracking events and status
   *
   * @example
   * ```typescript
   * const events = await client.waybills.getEvents('TH24020001');
   * console.log(events.state); // 'delivered'
   * console.log(events.routes); // Array of tracking events
   * ```
   */
  async getEvents(waybillNo) {
    return this.http.getWithSignature(`/waybills/${encodeURIComponent(waybillNo)}/events`);
  }
  /**
   * Get billing records for a waybill, joined with rate card, invoice, sender
   * account and contractor. For a master waybill this includes the billings from
   * its sub-waybills (which carry the per-leg transport charges). Canceled
   * billings are excluded.
   *
   * @param waybillNoOrId - Waybill id (UUID), waybill number, or external waybill number
   * @returns Array of billing records
   *
   * @example
   * ```typescript
   * const billings = await client.waybills.getBillings('TH24020001');
   * console.log(billings[0].amount); // 150
   * console.log(billings[0].invoice?.invoice_no); // 'INV-0001'
   *
   * // Also accepts a waybill id (UUID)
   * await client.waybills.getBillings('a0f41ca5-d350-401f-a557-831084fc7ccc');
   * ```
   */
  async getBillings(waybillNoOrId) {
    return this.http.getWithSignature(
      `/waybills/${encodeURIComponent(waybillNoOrId)}/billings`
    );
  }
  /**
   * Get shipping label for a waybill (PDF)
   *
   * @param waybillNo - Waybill number
   * @param params - Optional label params (e.g. packageId for a specific package)
   * @returns Label as ArrayBuffer (PDF)
   *
   * @example
   * ```typescript
   * const label = await client.waybills.getLabel('TH24020001');
   * fs.writeFileSync('label.pdf', Buffer.from(label));
   *
   * // Get label for a specific package
   * const pkgLabel = await client.waybills.getLabel('TH24020001', { packageId: 'pkg-uuid' });
   * ```
   */
  async getLabel(waybillNo, params) {
    const url = `/waybills/${encodeURIComponent(waybillNo)}/label`;
    const queryParts = [];
    if (params?.packageId) {
      queryParts.push(`packageId=${encodeURIComponent(params.packageId)}`);
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    const response = await fetch(
      `${this.http.baseUrl}${url}${queryString}`
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error ?? "Failed to get label");
    }
    return response.arrayBuffer();
  }
  /**
   * Generate a merged PDF with labels for multiple waybills
   *
   * @param waybillNos - Array of waybill numbers (max 100)
   * @returns Merged PDF as ArrayBuffer
   *
   * @example
   * ```typescript
   * const pdf = await client.waybills.getBatchLabel(['TH24020001', 'TH24020002']);
   * fs.writeFileSync('labels.pdf', Buffer.from(pdf));
   * ```
   */
  async getBatchLabel(waybillNos) {
    const response = await fetch(
      `${this.http.baseUrl}/waybills/batch-label`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.http.headers
        },
        body: JSON.stringify({ waybill_nos: waybillNos })
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error ?? "Failed to get batch labels");
    }
    return response.arrayBuffer();
  }
  /**
   * Add a package to an existing waybill
   *
   * @param waybillNo - Waybill number
   * @param data - Package data
   * @returns Created package information
   *
   * @example
   * ```typescript
   * const pkg = await client.waybills.addPackage('TH24020001', {
   *   parcel: {
   *     outParcelNo: 'PKG-002',
   *     itemDesc: 'Keyboards',
   *     weight: 2.5,
   *     productList: [{ name: 'Keyboard', sku: 'SKU-002', quantity: 1 }],
   *   },
   * });
   * console.log(pkg.package_no); // 'TH24020001-002'
   * ```
   */
  async addPackage(waybillNo, data) {
    return this.http.post(
      `/waybills/${encodeURIComponent(waybillNo)}/packages`,
      data
    );
  }
  /**
   * Reserve the next waybill number in the organization's configured format
   * WITHOUT creating a waybill. Used to mint a number for a loose, barcode-less
   * package so a scannable label can be printed before the package is
   * inbounded; the number later arrives as the package's external reference
   * (outTradeNo) at inbound.
   *
   * Requires the organization to have enabled custom waybill numbering in its
   * settings — otherwise the call fails with a 409.
   *
   * @returns The allocated number, e.g. `{ number: 'ABC1A748213905' }`
   *
   * @example
   * ```typescript
   * const { number } = await client.waybills.allocateNumber();
   * console.log(number); // 'ABC1A748213905'
   * ```
   */
  async allocateNumber() {
    return this.http.post("/waybills/allocate-number", {});
  }
  /**
   * Split one package on a waybill into multiple packages — the misoperation
   * recovery for a lot (piece_count > 1) that actually holds NON-identical items.
   * Each part becomes its own package (piece_count 1); the original combined
   * package is canceled and the waybill totals are recomputed.
   *
   * @param waybillNo - Waybill number or external waybill number
   * @param packageNo - The combined package's number to split
   * @param data - The parts (at least two) to split into
   *
   * @example
   * ```typescript
   * await client.waybills.splitPackage('TH24020001', 'TH24020001A1', {
   *   parts: [
   *     { weight: 2, length: 10, width: 10, height: 10 },
   *     { weight: 3, length: 20, width: 15, height: 12 },
   *   ],
   * });
   * ```
   */
  async splitPackage(waybillNo, packageNo, data) {
    return this.http.post(
      `/waybills/${encodeURIComponent(waybillNo)}/packages/${encodeURIComponent(packageNo)}/split`,
      data
    );
  }
  /**
   * Update a package, e.g. at warehouse inbound: measured weight and
   * dimensions, description, photos, cargo handling. Only the fields sent
   * change; works in any waybill status. A weight/dimension change recomputes
   * the waybill totals and re-prices its charges.
   *
   * @param waybillNo - Waybill number or external waybill number
   * @param packageNo - The package number or its external number (outParcelNo)
   * @param data - weight (kg), length/width/height (cm), itemDesc, photos
   *   (appended to the list), load_properties; at least one
   *
   * @example
   * ```typescript
   * await client.waybills.updatePackage('TH24020001', 'TH24020001A1', {
   *   weight: 3.2, length: 30, width: 25, height: 12,
   *   photos: ['https://example.com/inbound/1.jpg'],
   * });
   * ```
   */
  async updatePackage(waybillNo, packageNo, data) {
    return this.http.patch(
      `/waybills/${encodeURIComponent(waybillNo)}/packages/${encodeURIComponent(packageNo)}`,
      data
    );
  }
  /**
   * List additional services for a waybill
   *
   * @param waybillNo - Waybill number
   * @returns Array of additional services
   *
   * @example
   * ```typescript
   * const services = await client.waybills.listAdditionalServices('TH24020001');
   * console.log(services); // [{ id: '...', status: 'pending', ... }]
   * ```
   */
  async listAdditionalServices(waybillNo) {
    const result = await this.http.get(
      `/waybills/${encodeURIComponent(waybillNo)}/additional-services`
    );
    return result.data;
  }
  /**
   * Add additional services to a waybill
   *
   * @param waybillNo - Waybill number
   * @param serviceIds - Array of service UUIDs to add
   * @returns Created additional services
   *
   * @example
   * ```typescript
   * await client.waybills.addAdditionalServices('TH24020001', ['service-uuid-1', 'service-uuid-2']);
   * ```
   */
  async addAdditionalServices(waybillNo, serviceIds) {
    const result = await this.http.post(
      `/waybills/${encodeURIComponent(waybillNo)}/additional-services`,
      { service_ids: serviceIds }
    );
    return result.data;
  }
  /**
   * Update an additional service status
   *
   * @param waybillNo - Waybill number
   * @param serviceId - Additional service record ID
   * @param data - Status and optional result data
   *
   * @example
   * ```typescript
   * await client.waybills.updateAdditionalService('TH24020001', 'service-record-id', {
   *   status: 'completed',
   *   result: { photo_urls: ['https://...'] }
   * });
   * ```
   */
  async updateAdditionalService(waybillNo, serviceId, data) {
    const result = await this.http.patch(
      `/waybills/${encodeURIComponent(waybillNo)}/additional-services/${encodeURIComponent(serviceId)}`,
      data
    );
    return result.data;
  }
  /**
   * Remove an additional service from a waybill. This triggers a billing
   * recalculation that cancels the corresponding billing line item.
   *
   * @param waybillNo - Waybill number
   * @param serviceId - Additional service record ID
   *
   * @example
   * ```typescript
   * await client.waybills.removeAdditionalService('TH24020001', 'service-record-id');
   * ```
   */
  async removeAdditionalService(waybillNo, serviceId) {
    await this.http.delete(
      `/waybills/${encodeURIComponent(waybillNo)}/additional-services/${encodeURIComponent(serviceId)}`
    );
  }
  /**
   * Create a consolidated waybill from multiple source waybills
   *
   * @param data - Consolidation request data
   * @returns Master waybill and sub-waybills
   *
   * @example
   * ```typescript
   * const result = await client.waybills.consolidate({
   *   waybill_ids: ['uuid-1', 'uuid-2'],
   *   external_waybill_no: 'CONSOL-001',
   *   sender: { id: 'sender-uuid' },
   *   recipient: {
   *     name: 'John Doe',
   *     phone: '0812345678',
   *     address: {
   *       street_line: '456 Road',
   *       city: 'Bangkok',
   *       state: 'Bangkok',
   *       zip_code: '10900'
   *     }
   *   },
   *   service_id: 'service-uuid'
   * });
   * console.log(result.masterWaybill.waybill_no);
   * ```
   */
  async consolidate(data) {
    return this.http.post(
      "/waybills/consolidated-waybills",
      data
    );
  }
  /**
   * Get tracking routes in legacy format (for Hisense integration)
   *
   * @param waybillNo - Waybill number
   * @returns Tracking routes with numeric state codes
   */
  async getRoutes(waybillNo) {
    return this.http.getWithSignature(`/waybills/${encodeURIComponent(waybillNo)}/routes`);
  }
  /**
   * OCR a package label photo via Baidu OCR — returns the full recognized text
   * and the 5-letter sender-account code parsed from it. Stateless — persists
   * nothing; pass the returned `code` to `create()` via `sender_account.code`
   * to set the sender account.
   *
   * Requires a Baidu OCR integration configured for the organization. The OCR
   * tier (standard vs high-accuracy) is chosen from the destination `country`.
   *
   * @param params - Image (imageUrl or imageBase64) and optional destination country
   * @returns The recognized text, extracted code, confidence and OCR tier used
   *
   * @example
   * ```typescript
   * const ocr = await client.waybills.extractPackageLabel({
   *   imageUrl: 'https://cdn/photo.jpg',
   *   country: 'TH',
   * });
   * if (ocr.data?.code) {
   *   await client.waybills.create({ ...waybill, sender_account: { code: ocr.data.code } });
   * }
   * ```
   */
  async extractPackageLabel(params) {
    return this.http.post(
      "/ocr/sender-account-code",
      params
    );
  }
};

// src/resources/billings.ts
var Billings = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List billing records with optional filters
   *
   * @param params - Query parameters for filtering
   * @returns Paginated list of billing records
   *
   * @example
   * ```typescript
   * const billings = await client.billings.list({
   *   status: 'pending',
   *   date_from: '2024-01-01',
   *   date_to: '2024-01-31',
   *   page: 1,
   *   pageSize: 20
   * });
   * console.log(billings.data); // Array of billing records
   * console.log(billings.total); // Total count
   * ```
   */
  async list(params) {
    return this.http.get("/billings", params);
  }
  /**
   * Get a single billing record by ID
   *
   * @param id - Billing record ID
   * @returns Billing record details
   *
   * @example
   * ```typescript
   * const billing = await client.billings.get('uuid-here');
   * console.log(billing.amount);
   * ```
   */
  async get(id) {
    return this.http.get(`/billings/${encodeURIComponent(id)}`);
  }
  /**
   * Create a new billing record
   *
   * @param data - Billing creation data
   * @returns Created billing record
   *
   * @example
   * ```typescript
   * const billing = await client.billings.create({
   *   rate_card_id: 'rate-card-uuid',
   *   contractor_id: 'contractor-uuid',
   *   waybill_id: 'waybill-uuid',
   *   quantity: 1
   * });
   * ```
   */
  async create(data) {
    return this.http.post("/billings", data);
  }
  /**
   * Update a billing record
   *
   * @param id - Billing record ID
   * @param data - Fields to update (name, quantity, status)
   * @returns Updated billing record
   */
  async update(id, data) {
    return this.http.patch(`/billings/${encodeURIComponent(id)}`, data);
  }
  /**
   * Delete a billing record
   *
   * @param id - Billing record ID
   */
  async delete(id) {
    await this.http.delete(`/billings/${encodeURIComponent(id)}`);
  }
  /**
   * Send billing records via email as CSV attachment
   *
   * @param data - Email request with recipient and optional filters or billing IDs
   *
   * @example
   * ```typescript
   * // Send specific billings
   * await client.billings.sendEmail({
   *   recipient_email: 'finance@example.com',
   *   billing_ids: ['billing-id-1', 'billing-id-2'],
   *   subject: 'Billing Statement',
   *   message: 'Please find attached.'
   * });
   *
   * // Send filtered billings
   * await client.billings.sendEmail({
   *   recipient_email: 'finance@example.com',
   *   filter: {
   *     contractor_id: 'contractor-uuid',
   *     date_from: '2024-01-01',
   *     date_to: '2024-01-31'
   *   }
   * });
   * ```
   */
  async sendEmail(data) {
    return this.http.post("/billings/email", data);
  }
};

// src/resources/invoices.ts
var Invoices = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List invoices with optional filters
   *
   * @param params - Query parameters for filtering
   * @returns Paginated list of invoices
   *
   * @example
   * ```typescript
   * const invoices = await client.invoices.list({
   *   status: 'issued',
   *   contractor_id: 'contractor-uuid',
   *   page: 1,
   *   pageSize: 20
   * });
   * ```
   */
  async list(params) {
    return this.http.get("/invoices", params);
  }
  /**
   * Get a single invoice by ID
   *
   * @param id - Invoice ID
   * @returns Invoice details with line items
   *
   * @example
   * ```typescript
   * const invoice = await client.invoices.get('invoice-uuid');
   * console.log(invoice.invoice_no); // 'INV-2024-001'
   * console.log(invoice.line_items); // Array of line items
   * ```
   */
  async get(id) {
    return this.http.get(`/invoices/${encodeURIComponent(id)}`);
  }
  /**
   * Create a new invoice
   *
   * @param data - Invoice creation data
   * @returns Created invoice
   *
   * @example
   * ```typescript
   * // Create as draft (default)
   * const draft = await client.invoices.create({
   *   contractor_id: 'contractor-uuid',
   *   period_start: '2024-01-01',
   *   period_end: '2024-01-31',
   *   billing_ids: ['billing-1', 'billing-2'],
   * });
   *
   * // Create and issue in one step
   * const issued = await client.invoices.create({
   *   contractor_id: 'contractor-uuid',
   *   period_start: '2024-01-01',
   *   period_end: '2024-01-31',
   *   billing_ids: ['billing-1', 'billing-2'],
   *   status: 'issued',
   * });
   *
   * // Idempotent: hand back the invoice these lines are already on
   * const invoice = await client.invoices.create({ ..., reuse_existing: true });
   * if (invoice.reused) console.log('already invoiced as', invoice.invoice_no);
   * ```
   *
   * @throws TMSApiError with `statusCode` 409 when the lines already belong to
   * an invoice and neither `reuse_existing` nor `supersede_existing` applies.
   * `details.code` is a stable slug (`billings_already_invoiced`,
   * `billings_span_multiple_invoices`, `invoice_not_supersedable`,
   * `billings_already_settled`) and `details.invoices` lists the invoices
   * involved with their id, number and status — no message parsing needed.
   */
  async create(data) {
    return this.http.post("/invoices", data);
  }
  /**
   * Update an invoice
   *
   * @param id - Invoice ID
   * @param data - Fields to update
   * @returns Updated invoice
   *
   * @example
   * ```typescript
   * await client.invoices.update('invoice-uuid', {
   *   status: 'canceled',
   *   notes: 'Invoice canceled due to order cancellation'
   * });
   * ```
   */
  async update(id, data) {
    return this.http.patch(`/invoices/${encodeURIComponent(id)}`, data);
  }
  /**
   * Delete an invoice (only draft invoices can be deleted)
   *
   * @param id - Invoice ID
   */
  async delete(id) {
    await this.http.delete(`/invoices/${encodeURIComponent(id)}`);
  }
  /**
   * Issue an invoice (change status from draft to issued)
   *
   * @param id - Invoice ID
   * @param data - Optional issue date and due date
   * @returns Updated invoice with issue date
   *
   * @example
   * ```typescript
   * const issued = await client.invoices.issue('invoice-uuid', {
   *   due_date: '2024-03-01'
   * });
   * console.log(issued.data.status); // 'issued'
   * ```
   */
  async issue(id, data) {
    return this.http.post(`/invoices/${encodeURIComponent(id)}/issue`, data ?? {});
  }
  /**
   * Send invoice via email as PDF attachment
   *
   * @param id - Invoice ID
   * @param data - Email details
   *
   * @example
   * ```typescript
   * await client.invoices.sendEmail('invoice-uuid', {
   *   recipient_email: 'billing@customer.com',
   *   cc_emails: ['accounts@customer.com'],
   *   subject: 'Invoice INV-2024-001',
   *   message: 'Please find your invoice attached.'
   * });
   * ```
   */
  async sendEmail(id, data) {
    return this.http.post(`/invoices/${encodeURIComponent(id)}/email`, data);
  }
  /**
   * Add billing records as line items to an invoice
   *
   * @param id - Invoice ID
   * @param billingIds - Array of billing record IDs
   *
   * @example
   * ```typescript
   * await client.invoices.addLineItems('invoice-uuid', ['billing-1', 'billing-2']);
   * ```
   */
  async addLineItems(id, billingIds) {
    return this.http.post(`/invoices/${encodeURIComponent(id)}/line-items`, { billing_ids: billingIds });
  }
  /**
   * Remove billing records from an invoice
   *
   * @param id - Invoice ID
   * @param billingIds - Array of billing record IDs to remove
   */
  async removeLineItems(id, billingIds) {
    return this.http.delete(`/invoices/${encodeURIComponent(id)}/line-items`, { billing_ids: billingIds });
  }
};

// src/resources/payments.ts
var Payments = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List payments with optional filters
   *
   * @param params - Query parameters for filtering
   * @returns Paginated list of payments
   *
   * @example
   * ```typescript
   * const payments = await client.payments.list({
   *   status: 'completed',
   *   invoice_id: 'invoice-uuid',
   *   from_date: '2024-01-01',
   *   to_date: '2024-01-31',
   *   page: 1,
   *   pageSize: 20
   * });
   * ```
   */
  async list(params) {
    return this.http.get("/payments", params);
  }
  /**
   * Get a single payment by ID
   *
   * @param id - Payment ID
   * @returns Payment details with allocations
   *
   * @example
   * ```typescript
   * const payment = await client.payments.get('payment-uuid');
   * console.log(payment.allocations); // Invoice allocations
   * ```
   */
  async get(id) {
    return this.http.get(`/payments/${encodeURIComponent(id)}`);
  }
  /**
   * Create a new payment
   *
   * @param data - Payment creation data
   * @returns Created payment
   *
   * @example
   * ```typescript
   * const payment = await client.payments.create({
   *   amount: 5000,
   *   payment_method: 'bank_transfer',
   *   payment_date: '2024-02-01',
   *   contractor_id: 'contractor-uuid',
   *   allocations: [
   *     { invoice_id: 'invoice-1', amount: 3000 },
   *     { invoice_id: 'invoice-2', amount: 2000 }
   *   ]
   * });
   * ```
   */
  async create(data) {
    return this.http.post("/payments", data);
  }
  /**
   * Update a payment
   *
   * @param id - Payment ID
   * @param data - Fields to update
   * @returns Updated payment
   *
   * @example
   * ```typescript
   * await client.payments.update('payment-uuid', {
   *   status: 'completed',
   *   reference_no: 'BANK-REF-123'
   * });
   * ```
   */
  async update(id, data) {
    return this.http.patch(`/payments/${encodeURIComponent(id)}`, data);
  }
  /**
   * Delete a payment
   *
   * @param id - Payment ID
   */
  async delete(id) {
    await this.http.delete(`/payments/${encodeURIComponent(id)}`);
  }
  // ---- Allocations ----
  /**
   * Get allocations for a payment
   *
   * @param id - Payment ID
   * @returns Array of payment allocations
   */
  async getAllocations(id) {
    return this.http.get(`/payments/${encodeURIComponent(id)}/allocations`);
  }
  /**
   * Replace all allocations for a payment
   *
   * @param id - Payment ID
   * @param allocations - New allocations to set
   *
   * @example
   * ```typescript
   * await client.payments.replaceAllocations('payment-uuid', [
   *   { invoice_id: 'invoice-1', amount: 3000 },
   *   { invoice_id: 'invoice-2', amount: 2000 }
   * ]);
   * ```
   */
  async replaceAllocations(id, allocations) {
    return this.http.put(`/payments/${encodeURIComponent(id)}/allocations`, {
      allocations
    });
  }
  /**
   * Create a payment allocation
   *
   * @param id - Payment ID
   * @param invoiceId - Invoice ID to allocate to
   * @param amount - Allocation amount
   * @returns Created allocation
   * @deprecated Use replaceAllocations instead
   */
  async createAllocation(id, invoiceId, amount) {
    return this.http.post(`/payments/${encodeURIComponent(id)}/allocations`, {
      invoice_id: invoiceId,
      amount
    });
  }
  // ---- Bank Slip ----
  /**
   * Get bank slip for a payment
   *
   * @param id - Payment ID
   * @returns Bank slip or null if none exists
   *
   * @example
   * ```typescript
   * const slip = await client.payments.getSlip('payment-uuid');
   * if (slip) {
   *   console.log(slip.slip_url);
   * }
   * ```
   */
  async getSlip(id) {
    return this.http.get(`/payments/${encodeURIComponent(id)}/slip`);
  }
  /**
   * Upload bank slip metadata for a payment
   *
   * @param id - Payment ID
   * @param data - Bank slip data
   * @returns Created bank slip
   *
   * @example
   * ```typescript
   * const slip = await client.payments.uploadSlip('payment-uuid', {
   *   slip_url: 'https://storage.example.com/slips/123.jpg',
   *   bank_name: 'Bangkok Bank',
   *   transfer_date: '2024-02-01',
   *   transfer_amount: 5000,
   *   transfer_reference: 'REF-123'
   * });
   * ```
   */
  async uploadSlip(id, data) {
    return this.http.post(
      `/payments/${encodeURIComponent(id)}/slip`,
      data
    );
  }
  /**
   * Verify or reject a bank slip
   *
   * @param id - Payment ID
   * @param data - Verification data
   *
   * @example
   * ```typescript
   * await client.payments.verifySlip('payment-uuid', {
   *   verified: true,
   *   verification_notes: 'Slip verified successfully'
   * });
   * ```
   */
  async verifySlip(id, data) {
    return this.http.post(`/payments/${encodeURIComponent(id)}/slip/verify`, data);
  }
  // ---- FlashPay ----
  /**
   * Initiate a FlashPay payment (QR code or mobile banking)
   *
   * @param data - FlashPay request data
   * @returns QR code data or deeplink URL depending on flashpay_type
   *
   * @example
   * ```typescript
   * // QR code payment
   * const qr = await client.payments.initiateFlashPay({
   *   amount: 5000,
   *   flashpay_type: 'qr',
   *   contractor_id: 'contractor-uuid',
   *   allocations: [{ invoice_id: 'invoice-1', amount: 5000 }]
   * });
   * if ('qr_image' in qr) {
   *   console.log(qr.qr_image); // Base64 QR image
   * }
   *
   * // Mobile banking payment
   * const app = await client.payments.initiateFlashPay({
   *   amount: 5000,
   *   flashpay_type: 'app',
   *   flashpay_bank_code: 'bbl',
   *   contractor_id: 'contractor-uuid',
   *   allocations: [{ invoice_id: 'invoice-1', amount: 5000 }]
   * });
   * if ('deeplink_url' in app) {
   *   console.log(app.deeplink_url);
   * }
   * ```
   */
  async initiateFlashPay(data) {
    const result = await this.http.post(
      "/payments/flashpay",
      data
    );
    return result.data;
  }
  /**
   * Generate a FlashPay QR code for payment
   * @deprecated Use initiateFlashPay instead
   */
  async generateFlashPayQR(data) {
    return this.initiateFlashPay(data);
  }
  /**
   * Which payment methods may be used for a payment, and which of them will
   * actually work right now.
   *
   * Render your payment picker from this rather than a hardcoded list: the
   * organization decides which methods it accepts, and a service can narrow
   * that further. Methods that cannot be used come back `available: false` with
   * a reason, so show them greyed out rather than hiding them.
   *
   * Availability is advisory — it can change between this call and the payment.
   *
   * @example
   * ```typescript
   * const { methods, default: preselect } = await client.payments.methods({
   *   invoice_id: 'invoice-uuid',
   *   amount: 1500,
   *   currency: 'THB',
   * });
   * ```
   */
  async methods(params) {
    return this.http.get(
      "/payment-methods",
      params
    );
  }
};

// src/resources/rate-cards.ts
var RateCards = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List rate cards with optional filters
   *
   * @param params - Query parameters for filtering
   * @returns Array of rate cards
   *
   * @example
   * ```typescript
   * const rateCards = await client.rateCards.list({
   *   service_id: 'service-uuid'
   * });
   * ```
   */
  async list(params) {
    return this.http.get("/rate-cards", params);
  }
  /**
   * Get a single rate card by ID
   *
   * @param id - Rate card ID
   * @returns Rate card details
   *
   * @example
   * ```typescript
   * const rateCard = await client.rateCards.get('rate-card-uuid');
   * console.log(rateCard.unit_price); // 50.00
   * ```
   */
  async get(id) {
    return this.http.get(`/rate-cards/${encodeURIComponent(id)}`);
  }
  /**
   * Create a new rate card
   *
   * @param data - Rate card creation data
   * @returns Created rate card
   *
   * @example
   * ```typescript
   * const rateCard = await client.rateCards.create({
   *   name: 'Express Delivery',
   *   unit_price: 75.00,
   *   service_id: 'service-uuid',
   *   description: 'Same-day delivery rate'
   * });
   * ```
   */
  async create(data) {
    return this.http.post("/rate-cards", data);
  }
  /**
   * Update a rate card
   *
   * @param id - Rate card ID
   * @param data - Fields to update
   * @returns Updated rate card
   *
   * @example
   * ```typescript
   * await client.rateCards.update('rate-card-uuid', {
   *   unit_price: 80.00,
   *   name: 'Premium Express Delivery'
   * });
   * ```
   */
  async update(id, data) {
    return this.http.patch(`/rate-cards/${encodeURIComponent(id)}`, data);
  }
  /**
   * Delete a rate card
   *
   * @param id - Rate card ID
   */
  async delete(id) {
    await this.http.delete(`/rate-cards/${encodeURIComponent(id)}`);
  }
};

// src/resources/sender-accounts.ts
var SenderAccounts = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List sender accounts with optional filters
   *
   * @param params - Query parameters for filtering
   * @returns Paginated list of sender accounts
   *
   * @example
   * ```typescript
   * const accounts = await client.senderAccounts.list({
   *   search: 'Acme',
   *   is_active: true,
   *   limit: 50
   * });
   * console.log(accounts.data); // Array of sender accounts
   * ```
   */
  async list(params) {
    return this.http.get("/sender-accounts", params);
  }
  /**
   * Get a single sender account by ID, sender_code, or slug
   *
   * @param id - Sender account ID, sender_code, or slug (the tenant's own
   *   alternate/legacy account code)
   * @returns Sender account details
   *
   * @example
   * ```typescript
   * const account = await client.senderAccounts.get('account-uuid');
   * console.log(account.sender_code); // 'ACMEE'
   * // Also resolves by the tenant's migrated code:
   * const bySlug = await client.senderAccounts.get('EK-XXMF-BBFLC');
   * ```
   */
  async get(id) {
    return this.http.get(`/sender-accounts/${encodeURIComponent(id)}`);
  }
  /**
   * Bulk-import sender accounts migrated from another TMS system.
   *
   * Idempotent per-row on `slug` (the tenant's legacy code): a row whose slug
   * already exists in the org updates that account; otherwise a new account is
   * created with a freshly-generated internal `sender_code`. Safe to re-run.
   *
   * @param data - The rows to import
   * @returns Summary of created / updated / failed rows
   *
   * @example
   * ```typescript
   * const summary = await client.senderAccounts.import({
   *   rows: [
   *     { name: 'Acme Corp', slug: 'EK-XXMF-BBFLC', phone: '0812345678' },
   *   ],
   * });
   * console.log(summary.created, summary.updated, summary.failed);
   * ```
   */
  async import(data) {
    return this.http.post(
      "/sender-accounts/import",
      data
    );
  }
  /**
   * Create a new sender account
   *
   * @param data - Sender account creation data
   * @returns Created sender account
   *
   * @example
   * ```typescript
   * const account = await client.senderAccounts.create({
   *   name: 'Acme Corp',
   *   company_name: 'Acme Corporation',
   *   email: 'shipping@acme.com',
   *   phone: '0812345678'
   * });
   * console.log(account.sender_code); // Auto-generated code
   * ```
   */
  async create(data) {
    return this.http.post("/sender-accounts", data);
  }
  /**
   * Update a sender account
   *
   * @param id - Sender account ID
   * @param data - Fields to update
   * @returns Updated sender account
   *
   * @example
   * ```typescript
   * await client.senderAccounts.update('account-uuid', {
   *   is_active: false
   * });
   * ```
   */
  async update(id, data) {
    return this.http.put(`/sender-accounts/${encodeURIComponent(id)}`, data);
  }
  /**
   * Delete a sender account
   *
   * @param id - Sender account ID
   */
  async delete(id) {
    await this.http.delete(`/sender-accounts/${encodeURIComponent(id)}`);
  }
  // ---- Recipients ----
  /**
   * List recipients linked to a sender account
   *
   * @param id - Sender account ID
   * @param params - Optional filters (is_active)
   * @returns Array of sender account recipients
   *
   * @example
   * ```typescript
   * const recipients = await client.senderAccounts.listRecipients('account-uuid', {
   *   is_active: true
   * });
   * ```
   */
  async listRecipients(id, params) {
    const result = await this.http.get(
      `/sender-accounts/${encodeURIComponent(id)}/recipients`,
      params
    );
    return result.data;
  }
  /**
   * Get a single recipient linked to a sender account
   *
   * @param id - Sender account ID
   * @param recipientId - Recipient ID
   * @returns Sender account recipient details
   */
  async getRecipient(id, recipientId) {
    return this.http.get(
      `/sender-accounts/${encodeURIComponent(id)}/recipients/${encodeURIComponent(recipientId)}`
    );
  }
  /**
   * Link a recipient to a sender account
   *
   * @param id - Sender account ID
   * @param data - Recipient data (name, phone, email, address, junction metadata)
   * @returns Created sender account recipient
   *
   * @example
   * ```typescript
   * const recipient = await client.senderAccounts.createRecipient('account-uuid', {
   *   name: 'John Doe',
   *   phone: '0812345678',
   *   email: 'john@example.com',
   *   address: {
   *     street_line: '123 Main St',
   *     city: 'Bangkok',
   *     state: 'Bangkok',
   *     zip_code: '10110',
   *     country: 'TH',
   *   },
   *   is_default: true,
   * });
   * ```
   */
  async createRecipient(id, data) {
    return this.http.post(
      `/sender-accounts/${encodeURIComponent(id)}/recipients`,
      data
    );
  }
  /**
   * Update a recipient link on a sender account
   *
   * @param id - Sender account ID
   * @param recipientId - Recipient ID
   * @param data - Junction fields to update (is_default, label, etc.)
   * @returns Updated sender account recipient
   *
   * @example
   * ```typescript
   * await client.senderAccounts.updateRecipient('account-uuid', 'recipient-uuid', {
   *   is_default: true
   * });
   * ```
   */
  async updateRecipient(id, recipientId, data) {
    return this.http.put(
      `/sender-accounts/${encodeURIComponent(id)}/recipients/${encodeURIComponent(recipientId)}`,
      data
    );
  }
  /**
   * Remove a recipient from a sender account
   *
   * @param id - Sender account ID
   * @param recipientId - Recipient ID
   */
  async deleteRecipient(id, recipientId) {
    await this.http.delete(
      `/sender-accounts/${encodeURIComponent(id)}/recipients/${encodeURIComponent(recipientId)}`
    );
  }
  // ---- Ownership (partner credential) ----
  /**
   * Resolve which organization owns a sender account, returning that org's
   * `api_key`. Intended for a shared-warehouse WMS that receives a package,
   * reads its sender account code, and needs to know which TMS org (and which
   * credentials) to call.
   *
   * **Auth:** this endpoint requires the non-org-scoped **WMS partner
   * credential**. Construct the client with the partner `apiKey`/`apiSecret`
   * (not a regular organization key) — a normal org key returns 401. Returns a
   * 404 (thrown as `TMSApiError`) when no owning org/secret is found.
   *
   * @param code - The sender account code read from the package label
   * @returns The owning organization's `api_key`
   *
   * @example
   * ```typescript
   * const partner = new TMSClient({
   *   baseUrl: 'https://your-domain.com/api',
   *   apiKey: process.env.WMS_PARTNER_API_KEY!,
   *   apiSecret: process.env.WMS_PARTNER_API_SECRET!,
   * });
   * const { api_key } = await partner.senderAccounts.resolveOwnership('ACME1');
   * ```
   */
  async resolveOwnership(code) {
    const body = { sender_account_code: code };
    return this.http.post(
      "/sender-account/ownership",
      body
    );
  }
};

// src/resources/billing-profiles.ts
var BillingProfiles = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List billing profiles with optional filters
   *
   * @param params - Query parameters for filtering
   * @returns Paginated list of billing profiles
   *
   * @example
   * ```typescript
   * const profiles = await client.billingProfiles.list({
   *   billing_type: 'consolidated',
   *   is_active: true,
   *   page: 1,
   *   pageSize: 20
   * });
   * ```
   */
  async list(params) {
    return this.http.get("/billing-profiles", params);
  }
  /**
   * Get a single billing profile by ID
   *
   * @param id - Billing profile ID
   * @returns Billing profile details
   *
   * @example
   * ```typescript
   * const profile = await client.billingProfiles.get('profile-uuid');
   * console.log(profile.billing_cycle); // 'monthly'
   * ```
   */
  async get(id) {
    const result = await this.http.get(`/billing-profiles/${encodeURIComponent(id)}`);
    return result.data;
  }
  /**
   * Create a new billing profile
   *
   * @param data - Billing profile creation data
   * @returns Created billing profile
   *
   * @example
   * ```typescript
   * const profile = await client.billingProfiles.create({
   *   contractor_id: 'contractor-uuid',
   *   billing_type: 'consolidated',
   *   billing_cycle: 'monthly',
   *   cycle_day: 1,
   *   payment_terms: 'net_30',
   *   default_tax_rate: 7,
   *   auto_issue: true
   * });
   * ```
   */
  async create(data) {
    const result = await this.http.post(
      "/billing-profiles",
      data
    );
    return result.data;
  }
  /**
   * Update a billing profile
   *
   * @param id - Billing profile ID
   * @param data - Fields to update
   * @returns Updated billing profile
   *
   * @example
   * ```typescript
   * await client.billingProfiles.update('profile-uuid', {
   *   auto_issue: false,
   *   payment_terms: 'net_60'
   * });
   * ```
   */
  async update(id, data) {
    const result = await this.http.patch(
      `/billing-profiles/${encodeURIComponent(id)}`,
      data
    );
    return result.data;
  }
  /**
   * Deactivate a billing profile (soft delete)
   *
   * @param id - Billing profile ID
   * @returns Deactivated billing profile
   */
  async delete(id) {
    const result = await this.http.delete(
      `/billing-profiles/${encodeURIComponent(id)}`
    );
    return result.data;
  }
  // ---- Billing Cycles ----
  /**
   * List cycle runs for a billing profile
   *
   * @param id - Billing profile ID
   * @param params - Optional filters (status, pagination)
   * @returns Paginated list of cycle runs
   *
   * @example
   * ```typescript
   * const cycles = await client.billingProfiles.listCycles('profile-uuid', {
   *   status: 'completed',
   *   page: 1,
   *   pageSize: 10
   * });
   * ```
   */
  async listCycles(id, params) {
    return this.http.get(
      `/billing-profiles/${encodeURIComponent(id)}/cycles`,
      params
    );
  }
  /**
   * Manually trigger a billing cycle run
   *
   * @param id - Billing profile ID (must be a consolidated profile)
   * @param data - Optional as_of_date
   * @returns Cycle run result
   *
   * @example
   * ```typescript
   * const result = await client.billingProfiles.triggerCycle('profile-uuid', {
   *   as_of_date: '2024-02-01'
   * });
   * ```
   */
  async triggerCycle(id, data) {
    const result = await this.http.post(
      `/billing-profiles/${encodeURIComponent(id)}/cycles`,
      data ?? {}
    );
    return result.data;
  }
};

// src/resources/delivery-events.ts
var DeliveryEvents = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Create a delivery event
   *
   * @param data - Event creation data
   * @returns Created delivery event
   *
   * @example
   * ```typescript
   * const event = await client.deliveryEvents.create({
   *   waybill_id: 'waybill-uuid',
   *   event_type: 'delivered',
   *   notes: 'Left at front door',
   *   photos: ['base64-encoded-image...']
   * });
   * ```
   */
  async create(data) {
    return this.http.post("/delivery-events", data);
  }
  /**
   * Upload POD images for a delivery event via multipart form data
   *
   * Note: This method accepts File or Blob objects for browser/Node.js environments.
   * For Node.js, you can use the `File` or `Blob` class from `node:buffer`.
   *
   * @param eventId - Delivery event ID
   * @param photos - Array of File or Blob objects
   * @returns Upload result
   *
   * @example
   * ```typescript
   * // Node.js
   * import { readFileSync } from 'fs';
   * const photoBuffer = readFileSync('photo.jpg');
   * const blob = new Blob([photoBuffer], { type: 'image/jpeg' });
   *
   * await client.deliveryEvents.uploadPods('event-uuid', [blob]);
   * ```
   */
  async uploadPods(eventId, photos) {
    const formData = new FormData();
    photos.forEach((photo, index) => {
      formData.append("photos[]", photo, `photo-${index}`);
    });
    const baseUrl = this.http.baseUrl;
    const headers = this.http.headers;
    const response = await fetch(
      `${baseUrl}/delivery-events/${encodeURIComponent(eventId)}/pods`,
      {
        method: "POST",
        headers: { ...headers },
        body: formData
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error ?? "Failed to upload PODs");
    }
    return response.json();
  }
  /**
   * Get a temporary Aliyun STS credential to upload POD photos for an event
   * straight to OSS. It can only write objects under `prefix`, for 15 minutes.
   * Upload with it, then call {@link attachPods} with the keys. `mode: "server"`
   * means OSS isn't configured: use {@link uploadPods} instead.
   *
   * @param eventId - Delivery event ID
   */
  async getPodUploadToken(eventId) {
    return this.http.post(
      `/delivery-events/${encodeURIComponent(eventId)}/pods/upload-token`,
      {}
    );
  }
  /**
   * Attach POD photos already uploaded to OSS with a token from
   * {@link getPodUploadToken}.
   *
   * @param eventId - Delivery event ID
   * @param keys - 1 to 10 object keys, each under the token's prefix
   */
  async attachPods(eventId, keys) {
    return this.http.post(
      `/delivery-events/${encodeURIComponent(eventId)}/pods`,
      { keys }
    );
  }
  /**
   * Delete a POD image from a delivery event
   *
   * @param eventId - Delivery event ID
   * @param imageUrl - The image URL to delete (URL-encoded)
   *
   * @example
   * ```typescript
   * await client.deliveryEvents.deletePod('event-uuid', 'https://storage.example.com/pods/photo.jpg');
   * ```
   */
  async deletePod(eventId, imageUrl) {
    await this.http.delete(
      `/delivery-events/${encodeURIComponent(eventId)}/pods/${encodeURIComponent(imageUrl)}`
    );
  }
};

// src/resources/reports.ts
var Reports = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get billing breakdown by service
   *
   * @param params - Date range and optional contractor filter
   * @returns Billing data grouped by service with totals
   *
   * @example
   * ```typescript
   * const report = await client.reports.billingByService({
   *   date_from: '2024-01-01',
   *   date_to: '2024-01-31',
   *   contractor_id: 'contractor-uuid'
   * });
   * console.log(report.totals); // { quantity: 150, amount: 7500 }
   * ```
   */
  async billingByService(params) {
    return this.http.get("/reports/billing-by-service", params);
  }
  /**
   * Get billing by service report as CSV
   *
   * @param params - Date range and optional contractor filter
   * @returns CSV content as string
   */
  async billingByServiceCSV(params) {
    return this._fetchCSV("/reports/billing-by-service", { ...params, format: "csv" });
  }
  /**
   * Get outstanding invoices report
   *
   * @param params - Optional contractor and status filters
   * @returns Outstanding invoices with aging analysis
   *
   * @example
   * ```typescript
   * const report = await client.reports.outstandingInvoices({
   *   status: 'overdue'
   * });
   * console.log(report.data); // Array of overdue invoices
   * ```
   */
  async outstandingInvoices(params) {
    return this.http.get("/reports/outstanding-invoices", params);
  }
  /**
   * Get outstanding invoices report as CSV
   */
  async outstandingInvoicesCSV(params) {
    return this._fetchCSV("/reports/outstanding-invoices", { ...params, format: "csv" });
  }
  /**
   * Get payment history report
   *
   * @param params - Date range and optional filters
   * @returns Payment history with summary
   *
   * @example
   * ```typescript
   * const report = await client.reports.paymentHistory({
   *   date_from: '2024-01-01',
   *   date_to: '2024-01-31'
   * });
   * ```
   */
  async paymentHistory(params) {
    return this.http.get("/reports/payment-history", params);
  }
  /**
   * Get payment history report as CSV
   */
  async paymentHistoryCSV(params) {
    return this._fetchCSV("/reports/payment-history", { ...params, format: "csv" });
  }
  /**
   * Get revenue summary report
   *
   * @param params - Date range, period, and optional contractor filter
   * @returns Revenue data grouped by time period
   *
   * @example
   * ```typescript
   * const report = await client.reports.revenueSummary({
   *   date_from: '2024-01-01',
   *   date_to: '2024-12-31',
   *   period: 'monthly'
   * });
   * ```
   */
  async revenueSummary(params) {
    return this.http.get("/reports/revenue-summary", params);
  }
  /**
   * Get revenue summary report as CSV
   */
  async revenueSummaryCSV(params) {
    return this._fetchCSV("/reports/revenue-summary", { ...params, format: "csv" });
  }
  /**
   * Internal helper to fetch CSV reports
   */
  async _fetchCSV(path, params) {
    const baseUrl = this.http.baseUrl;
    const headers = this.http.headers;
    const response = await fetch(
      `${baseUrl}${path}${buildQueryString(params)}`,
      { headers: { ...headers } }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error ?? "Failed to fetch report");
    }
    return response.arrayBuffer();
  }
};

// src/resources/regions.ts
var Regions = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List all available countries that have region data
   *
   * @returns Array of ISO country codes
   *
   * @example
   * ```typescript
   * const countries = await client.regions.listCountries();
   * console.log(countries); // ['TH']
   * ```
   */
  async listCountries() {
    const result = await this.http.get("/regions/countries");
    return result.data;
  }
  /**
   * Get the region hierarchy (provinces → cities → districts) for a country.
   * Optionally filter by postal code to narrow results.
   *
   * @param params - Country code and optional postal code
   * @returns Region hierarchy tree
   *
   * @example
   * ```typescript
   * const hierarchy = await client.regions.getHierarchy({ country: 'TH' });
   * for (const province of hierarchy.provinces) {
   *   console.log(province.name);
   *   for (const city of province.cities) {
   *     console.log(`  ${city.name}`);
   *     for (const district of city.districts) {
   *       console.log(`    ${district.name} (${district.code})`);
   *     }
   *   }
   * }
   * ```
   */
  async getHierarchy(params) {
    return this.http.get("/regions", params);
  }
};

// src/resources/waybill-routes.ts
var WaybillRoutes = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List waybill routes with optional filters
   *
   * @param params - Query parameters for filtering
   * @returns Array of waybill routes
   *
   * @example
   * ```typescript
   * const routes = await client.waybillRoutes.list({ search: 'BKK' });
   * ```
   */
  async list(params) {
    return this.http.get("/waybill-routes", params);
  }
  /**
   * Get a single waybill route by ID (includes legs)
   *
   * @param id - Waybill route ID
   * @returns Waybill route with legs
   *
   * @example
   * ```typescript
   * const route = await client.waybillRoutes.get('route-uuid');
   * console.log(route.legs);
   * ```
   */
  async get(id) {
    return this.http.get(`/waybill-routes/${encodeURIComponent(id)}`);
  }
};

// src/resources/organizations.ts
var Organizations = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get the current authenticated organization
   *
   * @returns Organization details
   *
   * @example
   * ```typescript
   * const org = await client.organizations.get();
   * console.log(org.name); // 'Acme Corp'
   * ```
   */
  async get() {
    return this.http.get("/organizations");
  }
  /**
   * Update the current organization
   *
   * @param data - Fields to update
   * @returns Updated organization
   *
   * @example
   * ```typescript
   * const org = await client.organizations.update({
   *   name: 'Acme Corp Updated',
   *   phone: '0812345678'
   * });
   * ```
   */
  async update(data) {
    return this.http.patch("/organizations", data);
  }
};

// src/resources/organization-units.ts
var OrganizationUnits = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List organization units with optional filters
   *
   * @param params - Query parameters for filtering
   * @returns Paginated list of organization units
   *
   * @example
   * ```typescript
   * const units = await client.organizationUnits.list({
   *   type: 'branch',
   *   is_active: true,
   *   limit: 50
   * });
   * console.log(units.data); // Array of organization units
   * ```
   */
  async list(params) {
    return this.http.get("/organization-units", params);
  }
  /**
   * Create a new organization unit
   *
   * @param data - Organization unit creation data
   * @returns Created organization unit
   *
   * @example
   * ```typescript
   * const unit = await client.organizationUnits.create({
   *   name: 'Bangkok Branch',
   *   code: 'BKK-01',
   *   type: 'branch',
   *   address: {
   *     street_line: '123 Sukhumvit Rd',
   *     city: 'Bangkok',
   *     state: 'Bangkok',
   *     zip_code: '10110',
   *     country: 'TH'
   *   },
   *   phone: '0212345678'
   * });
   * ```
   */
  async create(data) {
    return this.http.post("/organization-units", data);
  }
  /**
   * Update an organization unit
   *
   * @param id - Organization unit ID
   * @param data - Fields to update
   * @returns Updated organization unit
   *
   * @example
   * ```typescript
   * await client.organizationUnits.update('unit-uuid', {
   *   name: 'Bangkok Main Branch',
   *   is_active: false
   * });
   * ```
   */
  async update(id, data) {
    return this.http.patch(`/organization-units/${encodeURIComponent(id)}`, data);
  }
  /**
   * Delete an organization unit
   *
   * @param id - Organization unit ID
   */
  async delete(id) {
    await this.http.delete(`/organization-units/${encodeURIComponent(id)}`);
  }
};

// src/resources/product-categories.ts
var ProductCategories = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List product categories as a flat, paginated list.
   *
   * @param params - Query parameters for filtering
   * @returns Paginated list of product categories
   *
   * @example
   * ```typescript
   * const categories = await client.productCategories.list({ is_active: true });
   * console.log(categories.data); // Array of product categories
   * ```
   */
  async list(params) {
    return this.http.get(
      "/product-categories",
      params
    );
  }
  /**
   * Fetch the full category hierarchy as a nested tree.
   *
   * @returns The category tree (roots with nested `children`)
   *
   * @example
   * ```typescript
   * const { data } = await client.productCategories.tree();
   * data.forEach(root => console.log(root.name, root.children.length));
   * ```
   */
  async tree() {
    return this.http.get("/product-categories", {
      tree: true
    });
  }
  /**
   * Create a new product category.
   *
   * @param data - Category creation data (omit `parent_id` for a root category)
   * @returns The created product category
   *
   * @example
   * ```typescript
   * const root = await client.productCategories.create({ name: 'Electronics' });
   * const child = await client.productCategories.create({
   *   name: 'Batteries',
   *   parent_id: root.id,
   * });
   * ```
   */
  async create(data) {
    return this.http.post(
      "/product-categories",
      data
    );
  }
  /**
   * Update a product category. Setting `parent_id` re-parents the node.
   *
   * @param id - Product category ID
   * @param data - Fields to update
   * @returns The updated product category
   *
   * @example
   * ```typescript
   * await client.productCategories.update('category-uuid', { is_active: false });
   * ```
   */
  async update(id, data) {
    return this.http.patch(
      `/product-categories/${encodeURIComponent(id)}`,
      data
    );
  }
  /**
   * Delete a product category and its subtree.
   *
   * @param id - Product category ID
   */
  async delete(id) {
    await this.http.delete(`/product-categories/${encodeURIComponent(id)}`);
  }
};

// src/resources/bank-accounts.ts
var BankAccounts = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * List the active receiving accounts, as a payer may see them.
   *
   * @param params.currency - Only accounts denominated in this currency. Worth
   * passing: money can only be received into an account in its own currency, so
   * an account in the wrong one is never a valid answer.
   *
   * @example
   * ```typescript
   * const accounts = await client.bankAccounts.list({ currency: 'THB' });
   * ```
   */
  async list(params) {
    const query = new URLSearchParams({ view: "public" });
    if (params?.currency) query.set("currency", params.currency);
    return this.http.get(`/bank-accounts?${query.toString()}`);
  }
  /**
   * Whether a bank transfer can be offered for this amount and currency.
   *
   * Call it before showing the option, so a customer is never handed a payment
   * method that immediately dead-ends. It comes back false when the organization
   * holds no active account in that currency, or when every such account would
   * breach its monthly receiving cap.
   *
   * Advisory only: another payment can consume the headroom a moment later, so
   * a `true` here is not a promise that the payment will succeed.
   *
   * @example
   * ```typescript
   * const { available } = await client.bankAccounts.checkAvailability({
   *   amount: 1500,
   *   currency: 'THB',
   * });
   * ```
   */
  async checkAvailability(params) {
    const query = new URLSearchParams({
      amount: String(params.amount),
      currency: params.currency
    });
    return this.http.get(
      `/bank-accounts/availability?${query.toString()}`
    );
  }
};

// src/resources/wallets.ts
var Wallets = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get the wallet balance for a sender account (created lazily on first access).
   *
   * @example
   * ```typescript
   * const wallet = await client.wallets.getBalance('sender-account-uuid');
   * console.log(wallet.balance); // e.g. 1500.00
   * ```
   */
  async getBalance(senderAccountId) {
    const result = await this.http.get("/wallets", {
      sender_account_id: senderAccountId
    });
    return result.data;
  }
  /**
   * Start a wallet top-up via FlashPay. Returns the QR image / deeplink and the
   * payment id. The balance is credited only when FlashPay confirms the payment.
   *
   * @example
   * ```typescript
   * const topup = await client.wallets.topUp({
   *   sender_account_id: 'sender-account-uuid',
   *   amount: 1000,
   *   flashpay_type: 'qr',
   * });
   * if (topup.type === 'qr') console.log(topup.qr_image);
   * ```
   */
  async topUp(data) {
    const result = await this.http.post(
      "/wallets/topup",
      data
    );
    return result.data;
  }
  /**
   * Pay (part of) an invoice from the wallet balance. Defaults to the invoice's
   * outstanding balance when `amount` is omitted.
   *
   * @example
   * ```typescript
   * const result = await client.wallets.pay({
   *   sender_account_id: 'sender-account-uuid',
   *   invoice_id: 'invoice-uuid',
   * });
   * console.log(result.balance); // remaining wallet balance
   * ```
   */
  async pay(data) {
    const result = await this.http.post(
      "/wallets/pay",
      data
    );
    return result.data;
  }
  /**
   * List ledger entries for a sender account's wallet (most recent first).
   *
   * @example
   * ```typescript
   * const { data, pagination } = await client.wallets.listTransactions({
   *   sender_account_id: 'sender-account-uuid',
   *   page: 1,
   *   pageSize: 20,
   * });
   * ```
   */
  async listTransactions(params) {
    return this.http.get(
      "/wallets/transactions",
      params
    );
  }
};

// src/resources/quotes.ts
var Quotes = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Create a shipping quotation.
   *
   * Selects a vehicle/pricing source for the shipment and persists a quotation,
   * returning the quote ID along with the resolved provider and vehicle.
   *
   * A quote needs no owner. When you already know which sender account it is
   * for, pass `senderAccountId` (sent as the `X-Sender-Account-Id` header); it
   * must belong to your organization.
   *
   * Addresses must carry coordinates — quoting never geocodes on your behalf.
   * Resolve free text with {@link Address.resolve} first and use the
   * `confidence` it reports to decide whether the match is good enough to price
   * against; the resolver always returns something, down to a province centroid.
   *
   * @param data - Quote request (addresses, cargo, options)
   * @param options - `senderAccountId`: the sender account that owns the quote
   * @returns The created quotation
   *
   * @example
   * ```typescript
   * const from = await client.address.resolve({ address: '123 Sukhumvit Rd, Bangkok' });
   * const to = await client.address.resolve({ address: '456 Nimman Rd, Chiang Mai' });
   * if (from.confidence < 0.7 || to.confidence < 0.7) {
   *   throw new Error('Address too vague to price — ask the customer to confirm.');
   * }
   *
   * const quote = await client.quotes.create({
   *   request_id: 'req-123',
   *   pickup: { address: from.formatted_address ?? '…', lat: from.lat, lng: from.lng },
   *   delivery: { address: to.formatted_address ?? '…', lat: to.lat, lng: to.lng },
   *   items: [
   *     { qty: 2, length_cm: 100, width_cm: 80, height_cm: 60, weight_kg: 25 },
   *   ],
   * });
   * console.log(quote.quotation_id, quote.vehicle, quote.estimated_total);
   * ```
   */
  async create(data, options) {
    return this.http.post(
      "/quotes",
      data,
      options?.senderAccountId ? { "X-Sender-Account-Id": options.senderAccountId } : void 0
    );
  }
};

// src/resources/address.ts
var Address = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Resolve a location into structured address fields (country, province,
   * district, subdistrict, postal code, coordinates). Provide exactly one of
   * three input modes — the response shape is identical across all of them:
   *
   *   - `{ address }`      → free-text geocode cascade
   *   - `{ url }`          → Google-Maps pin / short link → coordinates
   *   - `{ lat, lng }`     → reverse-geocode a shared device location
   *
   * @param request - One of the three input modes, plus optional `country`
   *   (ISO alpha-2 hint) and `logResolution` (defaults to `true`).
   * @returns The resolved address. Throws `TMSApiError` with status `404` when
   *   the location could not be resolved, or `400` for invalid input.
   *
   * @example
   * ```typescript
   * // Free-text
   * const a = await client.address.resolve({
   *   address: '123 Sukhumvit Rd, Bangkok',
   *   country: 'TH',
   * });
   *
   * // Google-Maps link
   * const b = await client.address.resolve({ url: 'https://maps.app.goo.gl/xyz' });
   *
   * // Reverse-geocode coordinates
   * const c = await client.address.resolve({ lat: 13.7563, lng: 100.5018 });
   * console.log(c.province, c.postal_code);
   * ```
   */
  async resolve(request) {
    return this.http.post(
      "/address/resolve",
      request
    );
  }
};

// src/resources/shipping-fee.ts
var ShippingFee = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Estimate the forwarding fee for a parcel to a destination postal code.
   *
   * @param data - Service, weight/dimensions, add-ons, and destination postal code.
   * @returns The priced estimate `{ cost, currency, service_name, chargeable_weight, breakdown }`.
   *
   * @example
   * ```typescript
   * const quote = await client.shippingFee.calculate({
   *   service_id: 'svc-uuid',
   *   weight_kg: 12.5,
   *   dimensions: { length_cm: 40, width_cm: 30, height_cm: 20 },
   *   destination_postal_code: '10110',
   *   country: 'TH',
   * });
   * console.log(quote.cost, quote.currency); // 375 THB
   * ```
   */
  async calculate(data) {
    return this.http.post(
      "/shipping-fee",
      data
    );
  }
};

// src/client.ts
var TMSClient = class _TMSClient {
  /**
   * Create a new TMS API client
   *
   * @param config - Client configuration
   *
   * @example
   * ```typescript
   * const client = new TMSClient({
   *   baseUrl: 'https://your-domain.com/api',
   *   apiKey: 'your-api-key',
   *   apiSecret: 'your-api-secret',
   *   timeout: 30000 // optional, defaults to 30 seconds
   * });
   * ```
   */
  constructor(config) {
    if (!config.baseUrl) {
      throw new Error("baseUrl is required");
    }
    if (!config.apiKey) {
      throw new Error("apiKey is required");
    }
    if (!config.apiSecret) {
      throw new Error("apiSecret is required");
    }
    this.config = config;
    this.http = new HttpClient(config);
    this.waybills = new Waybills(this.http);
    this.billings = new Billings(this.http);
    this.invoices = new Invoices(this.http);
    this.payments = new Payments(this.http);
    this.bankAccounts = new BankAccounts(this.http);
    this.rateCards = new RateCards(this.http);
    this.senderAccounts = new SenderAccounts(this.http);
    this.billingProfiles = new BillingProfiles(this.http);
    this.deliveryEvents = new DeliveryEvents(this.http);
    this.reports = new Reports(this.http);
    this.regions = new Regions(this.http);
    this.waybillRoutes = new WaybillRoutes(this.http);
    this.organizations = new Organizations(this.http);
    this.organizationUnits = new OrganizationUnits(this.http);
    this.productCategories = new ProductCategories(this.http);
    this.wallets = new Wallets(this.http);
    this.quotes = new Quotes(this.http);
    this.address = new Address(this.http);
    this.shippingFee = new ShippingFee(this.http);
  }
  /**
   * Set the preferred language for localized API error messages (sent as the
   * `Accept-Language` header) on this client, affecting all subsequent requests.
   * Pass `undefined` to clear it (server defaults to English).
   *
   * @example
   * ```typescript
   * client.setLanguage('zh'); // error messages now returned in Chinese
   * ```
   */
  setLanguage(language) {
    this.http.setLanguage(language);
  }
  /**
   * Create a new client scoped to a different language for localized error
   * messages, leaving this client unchanged. Useful for a single request or a
   * per-user-request handler.
   *
   * @example
   * ```typescript
   * const zhClient = client.withLanguage('zh');
   * await zhClient.waybills.get('UNKNOWN'); // error message in Chinese
   * ```
   */
  withLanguage(language) {
    return new _TMSClient({ ...this.config, language });
  }
};
export {
  Address,
  BankAccounts,
  BillingProfiles,
  Billings,
  DeliveryEvents,
  Invoices,
  OrganizationUnits,
  Organizations,
  Payments,
  ProductCategories,
  Quotes,
  RateCards,
  Regions,
  Reports,
  SenderAccounts,
  ShippingFee,
  TMSApiError,
  TMSClient,
  Wallets,
  WaybillRoutes,
  Waybills,
  canonicalizeJson,
  generateKeyedSignature,
  generateNonce,
  generateSignature,
  getTimestamp,
  verifyWebhookSignature
};
