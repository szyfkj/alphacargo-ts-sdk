import { HttpClient } from '../utils';
import type { Carrier } from '../types';

/**
 * Carriers (Agent Workbench). Agents' accounts on them, their credentials and
 * the carrier sync live in the Agent Workbench service; the TMS lists the
 * carriers. Needs the `agent_workbench` plan feature.
 */
export class CarrierAccounts {
  constructor(private readonly http: HttpClient) {}

  /**
   * The carriers an account can be bound on.
   *
   * @example
   * ```typescript
   * const { data: carriers } = await client.carrierAccounts.listCarriers();
   * ```
   */
  async listCarriers(): Promise<{ data: Carrier[] }> {
    return this.http.get<{ data: Carrier[] }>('/carriers');
  }
}
