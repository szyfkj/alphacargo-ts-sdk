import { HttpClient } from '../utils';
import type { Service, ListServicesParams, SellerBinding, UpdateSellerMarkupRequest } from '../types';

/**
 * Services resource (read-only): the organization's services, each with the
 * selector that chooses it for a waybill. With `rateCards` this is the
 * organization's price list — e.g. an agent's route tiers, each a service whose
 * selector tests the route and a chargeable-weight band.
 */
export class Services {
  constructor(private readonly http: HttpClient) {}

  /**
   * List the organization's services, by name.
   *
   * @example
   * ```typescript
   * const services = await client.services.list();
   * const tiers = services.filter((s) =>
   *   s.selector?.conditions.some((c) => c.field === 'route_id' && c.value === routeId));
   * ```
   */
  async list(params?: ListServicesParams): Promise<Service[]> {
    return this.http.get<Service[]>('/services', params as Record<string, unknown>);
  }

  /** Get one of the organization's services. */
  async get(id: string): Promise<Service> {
    return this.http.get<Service>(`/services/${encodeURIComponent(id)}`);
  }

  /**
   * The sellers one of the organization's FTL services resells, each with the
   * organization's markup over that seller's price. No seller price is returned.
   */
  async listSellers(serviceId: string): Promise<SellerBinding[]> {
    const res = await this.http.get<{ data: SellerBinding[] }>(`/services/${encodeURIComponent(serviceId)}/sellers`);
    return res.data;
  }

  /**
   * Set the organization's markup over one seller of its FTL service. Quotes
   * from then on price `seller price × (1 + markup_rate) + markup_fixed`: an
   * Agent Workbench agent's last-mile markup, passed on to its customer.
   *
   * @example
   * ```typescript
   * const [binding] = await client.services.listSellers(serviceId);
   * await client.services.updateSellerMarkup(serviceId, binding.id, { markup_rate: 0.1, markup_fixed: 50 });
   * ```
   */
  async updateSellerMarkup(serviceId: string, bindingId: string, data: UpdateSellerMarkupRequest): Promise<SellerBinding> {
    const res = await this.http.patch<{ data: SellerBinding }>(
      `/services/${encodeURIComponent(serviceId)}/sellers/${encodeURIComponent(bindingId)}`,
      data as unknown as Record<string, unknown>,
    );
    return res.data;
  }
}
