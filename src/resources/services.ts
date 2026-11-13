import { HttpClient } from '../utils';
import type { Service, ListServicesParams } from '../types';

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
}
