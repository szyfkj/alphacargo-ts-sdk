import { HttpClient } from '../utils';
import type { MarkerQueueEntry, MarkerQueueStatus } from '../types';

/**
 * Agent Workbench views of an agent organization's carrier waybills. Needs the
 * `carrier_accounts` plan feature. The waybills themselves are ordinary
 * waybills (`client.waybills`).
 */
export class Agent {
  constructor(private readonly http: HttpClient) {}

  /**
   * The unmatched-marker queue, grouped per carrier: codes no mapping covers,
   * sub-codes of known customers with no address mapped, and irregular markers.
   *
   * @example
   * ```typescript
   * const { data } = await client.agent.unmatchedMarkers({ status: ['customer_unmatched'] });
   * ```
   */
  async unmatchedMarkers(params?: { status?: MarkerQueueStatus[]; carrier_org_id?: string }): Promise<{ data: MarkerQueueEntry[] }> {
    const query: Record<string, unknown> = {};
    if (params?.status?.length) query.status = params.status.join(',');
    if (params?.carrier_org_id) query.carrier_org_id = params.carrier_org_id;
    return this.http.get<{ data: MarkerQueueEntry[] }>('/agent/markers/unmatched', query);
  }

}
