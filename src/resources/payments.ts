import { HttpClient } from '../utils';
import type {
  Payment,
  PrepaidPayment,
  RecordPrepaidPaymentRequest,
  PaymentAllocation,
  CreatePaymentRequest,
  UpdatePaymentRequest,
  ListPaymentsParams,
  ReplaceAllocationsRequest,
  BankSlip,
  CreateBankSlipRequest,
  VerifyBankSlipRequest,
  FlashPayRequest,
  FlashPayResponse,
  PaymentMethodsParams,
  PaymentMethodsResponse,
  PaginatedResponse,
} from '../types';

/**
 * Payments resource for managing payments
 */
export class Payments {
  constructor(private readonly http: HttpClient) {}

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
  async list(params?: ListPaymentsParams): Promise<PaginatedResponse<Payment>> {
    return this.http.get<PaginatedResponse<Payment>>('/payments', params as Record<string, unknown>);
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
  async get(id: string): Promise<Payment> {
    return this.http.get<Payment>(`/payments/${encodeURIComponent(id)}`);
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
  async create(data: CreatePaymentRequest): Promise<Payment> {
    return this.http.post<Payment>('/payments', data as unknown as Record<string, unknown>);
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
  async update(id: string, data: UpdatePaymentRequest): Promise<Payment> {
    return this.http.patch<Payment>(`/payments/${encodeURIComponent(id)}`, data as unknown as Record<string, unknown>);
  }

  /**
   * Delete a payment
   *
   * @param id - Payment ID
   */
  async delete(id: string): Promise<void> {
    await this.http.delete(`/payments/${encodeURIComponent(id)}`);
  }

  // ---- Allocations ----

  /**
   * Get allocations for a payment
   *
   * @param id - Payment ID
   * @returns Array of payment allocations
   */
  async getAllocations(id: string): Promise<PaymentAllocation[]> {
    return this.http.get<PaymentAllocation[]>(`/payments/${encodeURIComponent(id)}/allocations`);
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
  async replaceAllocations(id: string, allocations: Array<{ invoice_id: string; amount: number }>): Promise<{ success: boolean }> {
    return this.http.put(`/payments/${encodeURIComponent(id)}/allocations`, {
      allocations,
    } satisfies ReplaceAllocationsRequest as unknown as Record<string, unknown>);
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
  async createAllocation(id: string, invoiceId: string, amount: number): Promise<PaymentAllocation> {
    return this.http.post(`/payments/${encodeURIComponent(id)}/allocations`, {
      invoice_id: invoiceId,
      amount,
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
  async getSlip(id: string): Promise<BankSlip | null> {
    return this.http.get<BankSlip | null>(`/payments/${encodeURIComponent(id)}/slip`);
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
  async uploadSlip(id: string, data: CreateBankSlipRequest): Promise<BankSlip> {
    return this.http.post<BankSlip>(
      `/payments/${encodeURIComponent(id)}/slip`,
      data as unknown as Record<string, unknown>
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
  async verifySlip(id: string, data: VerifyBankSlipRequest): Promise<{ success: boolean }> {
    return this.http.post(`/payments/${encodeURIComponent(id)}/slip/verify`, data as unknown as Record<string, unknown>);
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
  async initiateFlashPay(data: FlashPayRequest): Promise<FlashPayResponse> {
    const result = await this.http.post<{ data: FlashPayResponse }>(
      '/payments/flashpay',
      data as unknown as Record<string, unknown>
    );
    return result.data;
  }

  /**
   * Generate a FlashPay QR code for payment
   * @deprecated Use initiateFlashPay instead
   */
  async generateFlashPayQR(data: FlashPayRequest): Promise<FlashPayResponse> {
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
  async methods(params?: PaymentMethodsParams): Promise<PaymentMethodsResponse> {
    return this.http.get<PaymentMethodsResponse>(
      '/payment-methods',
      params as Record<string, unknown> | undefined
    );
  }

  /**
   * Record that your open lines on a delivery were paid from a balance kept in
   * another system (`payment_method = 'prepaid_balance'`). The TMS invoices
   * those lines and settles the invoice with a completed payment.
   *
   * Idempotent on `external_txn_id`: a repeat returns the payment already
   * recorded (`replayed: true`). Fails with 409 `amount_mismatch` when
   * `amount` is not the open total, and 404 when you have no open line there.
   *
   * @param deliveryId - The delivery (for a last-mile order, its `delivery_id`)
   */
  async recordPrepaidForDelivery(deliveryId: string, data: RecordPrepaidPaymentRequest): Promise<PrepaidPayment> {
    const res = await this.http.post<{ data: PrepaidPayment }>(
      `/deliveries/${encodeURIComponent(deliveryId)}/prepaid-payments`,
      data as unknown as Record<string, unknown>,
    );
    return res.data;
  }
}
