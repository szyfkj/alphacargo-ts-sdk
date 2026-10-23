import { HttpClient } from '../utils';
import type { CreateQuoteRequest, CreateQuoteResponse } from '../types';

/**
 * Quotes resource for the FTL/LTL shipping-quote flow.
 *
 * Only quote creation is exposed here so far. The downstream quote operations —
 * `GET /api/quotes`, `GET /api/quotes/{id}`, `POST /api/quotes/{id}/pay`,
 * `POST /api/quotes/{id}/cancel`, `GET /api/quotes/{id}/payment-methods` and
 * `GET /api/orders/{id}/tracking` — take the same organization API-key
 * signature as everything else in this SDK, plus an `X-Sender-Account-Id`
 * header naming the sender you act for. They are callable server-to-server;
 * they simply have no wrapper here yet. Call them directly meanwhile.
 */
export class Quotes {
  constructor(private readonly http: HttpClient) {}

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
  async create(
    data: CreateQuoteRequest,
    options?: { senderAccountId?: string },
  ): Promise<CreateQuoteResponse> {
    return this.http.post<CreateQuoteResponse>(
      '/quotes',
      data as unknown as Record<string, unknown>,
      options?.senderAccountId ? { 'X-Sender-Account-Id': options.senderAccountId } : undefined,
    );
  }
}
