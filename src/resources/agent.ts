import { HttpClient } from '../utils';
import type {
  MarkerQueueEntry,
  MarkerQueueStatus,
  AgentWaybill,
  AgentWaybillDetail,
  ListAgentWaybillsParams,
  LastMileQuoteRequest,
  LastMileQuote,
  LastMileOrder,
} from '../types';

/**
 * Agent Workbench views of an agent organization's carrier waybills. Needs the
 * `carrier_accounts` plan feature.
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

  /**
   * The agent's carrier waybills with carrier fields, customer and delivery address.
   *
   * @example
   * ```typescript
   * const { data, pagination } = await client.agent.listWaybills({ match_status: ['recipient_unmatched'] });
   * ```
   */
  async listWaybills(
    params?: ListAgentWaybillsParams
  ): Promise<{ data: AgentWaybill[]; pagination: { total: number; limit: number; offset: number } }> {
    const query: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === undefined || value === null) continue;
      query[key] = Array.isArray(value) ? value.join(',') : String(value);
    }
    return this.http.get('/agent/waybills', query);
  }

  /** One carrier waybill with its event timeline and legs. */
  async getWaybill(id: string): Promise<AgentWaybillDetail> {
    const res = await this.http.get<{ data: AgentWaybillDetail }>(`/agent/waybills/${encodeURIComponent(id)}`);
    return res.data;
  }

  /**
   * Pick a waybill's delivery address from its customer's recipients, or pass
   * `null` to drop the choice and let the marker decide. Throws 409 once
   * delivery was ordered.
   */
  async chooseRecipient(id: string, recipientId: string | null): Promise<AgentWaybill> {
    const res = await this.http.patch<{ data: AgentWaybill }>(`/agent/waybills/${encodeURIComponent(id)}/recipient`, {
      recipient_id: recipientId,
    });
    return res.data;
  }

  /**
   * Price delivering a waybill from a carrier warehouse to its address with an
   * Alpha Cargo delivery service (FTL). Order it with `orderLastMile` before
   * `expires_at`.
   */
  async quoteLastMile(id: string, request: LastMileQuoteRequest): Promise<LastMileQuote> {
    const res = await this.http.post<{ data: LastMileQuote }>(
      `/agent/waybills/${encodeURIComponent(id)}/last-mile/quote`,
      request as unknown as Record<string, unknown>
    );
    return res.data;
  }

  /** Order the quoted delivery (on account). Alpha Cargo's dispatchers book the vehicle. */
  async orderLastMile(id: string, quotationId: string): Promise<LastMileOrder> {
    const res = await this.http.post<{ data: LastMileOrder }>(`/agent/waybills/${encodeURIComponent(id)}/last-mile`, {
      quotation_id: quotationId,
    });
    return res.data;
  }
}
