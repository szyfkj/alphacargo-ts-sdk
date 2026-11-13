import { HttpClient } from '../utils';
import type { PaginatedResponse, WaybillRoute, WaybillRouteWithLegs, ListWaybillRoutesParams } from '../types';

/**
 * WaybillRoutes resource for querying waybill routes
 */
export class WaybillRoutes {
  constructor(private readonly http: HttpClient) {}

  /**
   * List waybill routes with optional filters
   *
   * @param params - Query parameters for filtering
   * @returns A page of waybill routes (`data`, `total`, `page`, …)
   *
   * @example
   * ```typescript
   * const { data: routes } = await client.waybillRoutes.list({ search: 'BKK' });
   * ```
   */
  async list(params?: ListWaybillRoutesParams): Promise<PaginatedResponse<WaybillRoute>> {
    return this.http.get<PaginatedResponse<WaybillRoute>>('/waybill-routes', params as Record<string, unknown>);
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
  async get(id: string): Promise<WaybillRouteWithLegs> {
    return this.http.get<WaybillRouteWithLegs>(`/waybill-routes/${encodeURIComponent(id)}`);
  }
}
