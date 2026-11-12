import { HttpClient } from '../utils';
import type {
  SenderAccount,
  CreateSenderAccountRequest,
  UpdateSenderAccountRequest,
  ListSenderAccountsParams,
  SenderAccountRecipient,
  CreateSenderAccountRecipientRequest,
  UpdateSenderAccountRecipientRequest,
  ListSenderAccountRecipientsParams,
  SenderAccountOwnershipRequest,
  SenderAccountOwnershipResponse,
  ImportSenderAccountsRequest,
  ImportSenderAccountsResponse,
  SenderAccountMarker,
  AddSenderAccountMarkerRequest,
  AddSenderAccountMarkerResponse,
  RemoveSenderAccountMarkerResponse,
} from '../types';

interface ListSenderAccountsResponse {
  data: SenderAccount[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * SenderAccounts resource for managing sender accounts
 */
export class SenderAccounts {
  constructor(private readonly http: HttpClient) {}

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
  async list(params?: ListSenderAccountsParams): Promise<ListSenderAccountsResponse> {
    return this.http.get<ListSenderAccountsResponse>('/sender-accounts', params as Record<string, unknown>);
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
  async get(id: string): Promise<SenderAccount> {
    return this.http.get<SenderAccount>(`/sender-accounts/${encodeURIComponent(id)}`);
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
  async import(data: ImportSenderAccountsRequest): Promise<ImportSenderAccountsResponse> {
    return this.http.post<ImportSenderAccountsResponse>(
      '/sender-accounts/import',
      data as unknown as Record<string, unknown>
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
  async create(data: CreateSenderAccountRequest): Promise<SenderAccount> {
    return this.http.post<SenderAccount>('/sender-accounts', data as unknown as Record<string, unknown>);
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
  async update(id: string, data: UpdateSenderAccountRequest): Promise<SenderAccount> {
    return this.http.put<SenderAccount>(`/sender-accounts/${encodeURIComponent(id)}`, data as unknown as Record<string, unknown>);
  }

  /**
   * Delete a sender account
   *
   * @param id - Sender account ID
   */
  async delete(id: string): Promise<void> {
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
  async listRecipients(id: string, params?: ListSenderAccountRecipientsParams): Promise<SenderAccountRecipient[]> {
    const result = await this.http.get<{ data: SenderAccountRecipient[] }>(
      `/sender-accounts/${encodeURIComponent(id)}/recipients`,
      params as Record<string, unknown>
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
  async getRecipient(id: string, recipientId: string): Promise<SenderAccountRecipient> {
    return this.http.get<SenderAccountRecipient>(
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
  async createRecipient(id: string, data: CreateSenderAccountRecipientRequest): Promise<SenderAccountRecipient> {
    return this.http.post<SenderAccountRecipient>(
      `/sender-accounts/${encodeURIComponent(id)}/recipients`,
      data as unknown as Record<string, unknown>
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
  async updateRecipient(id: string, recipientId: string, data: UpdateSenderAccountRecipientRequest): Promise<SenderAccountRecipient> {
    return this.http.put<SenderAccountRecipient>(
      `/sender-accounts/${encodeURIComponent(id)}/recipients/${encodeURIComponent(recipientId)}`,
      data as unknown as Record<string, unknown>
    );
  }

  /**
   * Remove a recipient from a sender account
   *
   * @param id - Sender account ID
   * @param recipientId - Recipient ID
   */
  async deleteRecipient(id: string, recipientId: string): Promise<void> {
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
  async resolveOwnership(code: string): Promise<SenderAccountOwnershipResponse> {
    const body: SenderAccountOwnershipRequest = { sender_account_code: code };
    return this.http.post<SenderAccountOwnershipResponse>(
      '/sender-account/ownership',
      body as unknown as Record<string, unknown>
    );
  }

  /**
   * This customer's carrier markers (Agent Workbench): each maps a carrier's
   * code (and optional sub-code) to this customer, and to one of its
   * recipients when the marker names a shipping address.
   */
  async listMarkers(senderAccountId: string): Promise<SenderAccountMarker[]> {
    const res = await this.http.get<{ data: SenderAccountMarker[] }>(
      `/sender-accounts/${encodeURIComponent(senderAccountId)}/markers`
    );
    return res.data;
  }

  /**
   * Map a carrier marker to this customer (and address). The carrier's
   * waybills waiting for it are matched. Throws 409 when the same carrier,
   * code and sub-code are mapped already; 400 when the recipient isn't one of
   * this customer's.
   *
   * @example
   * ```typescript
   * // MX: XXMF is the customer
   * await client.senderAccounts.addMarker(wangId, { carrier_org_id: mxId, code: 'XXMF' });
   * // MX: XXMF/FLASH is Wang's Flash warehouse
   * await client.senderAccounts.addMarker(wangId, { carrier_org_id: mxId, code: 'XXMF', sub_code: 'FLASH', recipient_id: flashId });
   * // CNS: the code aaqom itself names Wang's Bangkok shop
   * await client.senderAccounts.addMarker(wangId, { carrier_org_id: cnsId, code: 'aaqom', recipient_id: shopId });
   * ```
   */
  async addMarker(senderAccountId: string, request: AddSenderAccountMarkerRequest): Promise<AddSenderAccountMarkerResponse> {
    const res = await this.http.post<{ data: AddSenderAccountMarkerResponse }>(
      `/sender-accounts/${encodeURIComponent(senderAccountId)}/markers`,
      request as unknown as Record<string, unknown>
    );
    return res.data;
  }

  /** Remove a marker mapping; its waybills are matched again without it. */
  async removeMarker(senderAccountId: string, markerId: string): Promise<RemoveSenderAccountMarkerResponse> {
    const res = await this.http.delete<{ data: RemoveSenderAccountMarkerResponse }>(
      `/sender-accounts/${encodeURIComponent(senderAccountId)}/markers/${encodeURIComponent(markerId)}`
    );
    return res.data;
  }
}
