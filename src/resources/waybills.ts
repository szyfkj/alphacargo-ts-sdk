import { HttpClient } from '../utils';
import type {
  CreateWaybillRequest,
  CreateWaybillResponse,
  CreateWaybillOptions,
  UpdateWaybillRequest,
  WaybillEvents,
  GetLabelParams,
  AddPackageRequest,
  AddPackageResponse,
  SplitPackageRequest,
  SplitPackageResponse,
  UpdatePackageRequest,
  UpdatePackageResponse,
  AllocateWaybillNumberResponse,
  AdditionalService,
  CreateAdditionalServicesRequest,
  UpdateAdditionalServiceRequest,
  BatchLabelRequest,
  ConsolidateWaybillsRequest,
  ConsolidateWaybillsResponse,
  WaybillListParams,
  WaybillSummary,
  WaybillServiceCountParams,
  WaybillServiceCount,
  WaybillDetails,
  PaginatedResponse,
  PackageLabelOcrParams,
  PackageLabelOcrResponse,
  WaybillBillingRecord,
} from '../types';

/**
 * Waybills resource for managing shipping orders
 */
export class Waybills {
  constructor(private readonly http: HttpClient) {}

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
  async list(params?: WaybillListParams): Promise<PaginatedResponse<WaybillSummary>> {
    const query: Record<string, unknown> = { ...params };
    // Tri-state: null means "filter where reference_no IS NULL", sent as empty string
    if (params && 'reference_no' in params && params.reference_no === null) {
      query.reference_no = '';
    }
    return this.http.getWithSignature<PaginatedResponse<WaybillSummary>>('/waybills', query);
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
  async countByService(params?: WaybillServiceCountParams): Promise<WaybillServiceCount[]> {
    return this.http.getWithSignature<WaybillServiceCount[]>('/waybills/service-counts', { ...params });
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
  async get(waybillNo: string): Promise<WaybillDetails> {
    return this.http.getWithSignature<WaybillDetails>(`/waybills/${encodeURIComponent(waybillNo)}`);
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
  async create(data: CreateWaybillRequest, options?: CreateWaybillOptions): Promise<CreateWaybillResponse> {
    const query = options?.overwrite ? { overwrite: options.overwrite } : undefined;
    return this.http.request<CreateWaybillResponse>('POST', '/waybills', {
      body: data as unknown as Record<string, unknown>,
      query,
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
  async cancel(waybillNo: string): Promise<{ message: string }> {
    return this.http.delete<{ message: string }>(`/waybills/${encodeURIComponent(waybillNo)}`);
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
  async update(waybillNo: string, data: UpdateWaybillRequest): Promise<WaybillDetails> {
    return this.http.patch<WaybillDetails>(`/waybills/${encodeURIComponent(waybillNo)}`, data as unknown as Record<string, unknown>);
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
  async getEvents(waybillNo: string): Promise<WaybillEvents> {
    return this.http.getWithSignature<WaybillEvents>(`/waybills/${encodeURIComponent(waybillNo)}/events`);
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
  async getBillings(waybillNoOrId: string): Promise<WaybillBillingRecord[]> {
    return this.http.getWithSignature<WaybillBillingRecord[]>(
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
  async getLabel(waybillNo: string, params?: GetLabelParams): Promise<ArrayBuffer> {
    const url = `/waybills/${encodeURIComponent(waybillNo)}/label`;
    const queryParts: string[] = [];
    if (params?.packageId) {
      queryParts.push(`packageId=${encodeURIComponent(params.packageId)}`);
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const response = await fetch(
      `${(this.http as unknown as { baseUrl: string }).baseUrl}${url}${queryString}`
    );

    if (!response.ok) {
      const error = await response.json() as Record<string, unknown>;
      throw new Error((error.error as string) ?? 'Failed to get label');
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
  async getBatchLabel(waybillNos: string[]): Promise<ArrayBuffer> {
    const response = await fetch(
      `${(this.http as unknown as { baseUrl: string }).baseUrl}/waybills/batch-label`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.http as unknown as { headers: Record<string, string> }).headers,
        },
        body: JSON.stringify({ waybill_nos: waybillNos } satisfies BatchLabelRequest),
      }
    );

    if (!response.ok) {
      const error = await response.json() as Record<string, unknown>;
      throw new Error((error.error as string) ?? 'Failed to get batch labels');
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
  async addPackage(waybillNo: string, data: AddPackageRequest): Promise<AddPackageResponse> {
    return this.http.post<AddPackageResponse>(
      `/waybills/${encodeURIComponent(waybillNo)}/packages`,
      data as unknown as Record<string, unknown>
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
  async allocateNumber(): Promise<AllocateWaybillNumberResponse> {
    return this.http.post<AllocateWaybillNumberResponse>('/waybills/allocate-number', {});
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
  async splitPackage(
    waybillNo: string,
    packageNo: string,
    data: SplitPackageRequest,
  ): Promise<SplitPackageResponse> {
    return this.http.post<SplitPackageResponse>(
      `/waybills/${encodeURIComponent(waybillNo)}/packages/${encodeURIComponent(packageNo)}/split`,
      data as unknown as Record<string, unknown>
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
  async updatePackage(
    waybillNo: string,
    packageNo: string,
    data: UpdatePackageRequest,
  ): Promise<UpdatePackageResponse> {
    return this.http.patch<UpdatePackageResponse>(
      `/waybills/${encodeURIComponent(waybillNo)}/packages/${encodeURIComponent(packageNo)}`,
      data as unknown as Record<string, unknown>
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
  async listAdditionalServices(waybillNo: string): Promise<AdditionalService[]> {
    const result = await this.http.get<{ success: boolean; data: AdditionalService[] }>(
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
  async addAdditionalServices(waybillNo: string, serviceIds: string[]): Promise<AdditionalService[]> {
    const result = await this.http.post<{ success: boolean; data: AdditionalService[] }>(
      `/waybills/${encodeURIComponent(waybillNo)}/additional-services`,
      { service_ids: serviceIds } satisfies CreateAdditionalServicesRequest as unknown as Record<string, unknown>
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
  async updateAdditionalService(
    waybillNo: string,
    serviceId: string,
    data: UpdateAdditionalServiceRequest
  ): Promise<AdditionalService> {
    const result = await this.http.patch<{ success: boolean; data: AdditionalService }>(
      `/waybills/${encodeURIComponent(waybillNo)}/additional-services/${encodeURIComponent(serviceId)}`,
      data as unknown as Record<string, unknown>
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
  async removeAdditionalService(waybillNo: string, serviceId: string): Promise<void> {
    await this.http.delete<{ success: boolean }>(
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
  async consolidate(data: ConsolidateWaybillsRequest): Promise<ConsolidateWaybillsResponse> {
    return this.http.post<ConsolidateWaybillsResponse>(
      '/waybills/consolidated-waybills',
      data as unknown as Record<string, unknown>
    );
  }

  /**
   * Get tracking routes in legacy format (for Hisense integration)
   *
   * @param waybillNo - Waybill number
   * @returns Tracking routes with numeric state codes
   */
  async getRoutes(waybillNo: string): Promise<WaybillEvents> {
    return this.http.getWithSignature<WaybillEvents>(`/waybills/${encodeURIComponent(waybillNo)}/routes`);
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
  async extractPackageLabel(
    params: PackageLabelOcrParams
  ): Promise<PackageLabelOcrResponse> {
    return this.http.post<PackageLabelOcrResponse>(
      '/ocr/sender-account-code',
      params as unknown as Record<string, unknown>
    );
  }
}
