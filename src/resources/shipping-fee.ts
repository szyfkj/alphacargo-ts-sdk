import { HttpClient } from '../utils';
import type { CreateShippingFeeRequest, ShippingFeeResponse } from '../types';

/**
 * ShippingFee resource for ad-hoc forwarding-fee estimates.
 *
 * `POST /shipping-fee` resolves the destination route from the recipient postal
 * code (the same route-resolution waybill billing uses), then prices the
 * selected service against it with the rate-card engine — read-only, no billing
 * records are written. Intended for customer-facing shipping calculators.
 *
 * Without a `service_id` the organization's service selectors choose the
 * service (as on waybill create); without any route the service's org-wide or
 * customer-type rate cards price it — how an agent quotes its price list.
 */
export class ShippingFee {
  constructor(private readonly http: HttpClient) {}

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
  async calculate(data: CreateShippingFeeRequest): Promise<ShippingFeeResponse> {
    return this.http.post<ShippingFeeResponse>(
      '/shipping-fee',
      data as unknown as Record<string, unknown>,
    );
  }
}
