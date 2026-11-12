import { HttpClient } from '../utils';
import type {
  Carrier,
  CarrierWarehouse,
  CarrierAccount,
  BindCarrierAccountRequest,
  ListCarrierAccountsParams,
  UnbindCarrierAccountResponse,
  SyncCarrierAccountResponse,
} from '../types';

/**
 * Carrier accounts (Agent Workbench): an agent organization's logins on
 * carrier portals. Needs the `carrier_accounts` plan feature. Passwords are
 * stored encrypted and never returned.
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

  /** A carrier's warehouses, where a last-mile delivery picks up. */
  async listWarehouses(carrierOrgId: string): Promise<{ data: CarrierWarehouse[] }> {
    return this.http.get<{ data: CarrierWarehouse[] }>(`/carriers/${encodeURIComponent(carrierOrgId)}/warehouses`);
  }

  /** The organization's carrier accounts (unbound ones only with `include_unbound`). */
  async list(params?: ListCarrierAccountsParams): Promise<{ data: CarrierAccount[] }> {
    const query: Record<string, unknown> = {};
    if (params?.carrier_org_id) query.carrier_org_id = params.carrier_org_id;
    if (params?.include_unbound) query.include_unbound = 'true';
    return this.http.get<{ data: CarrierAccount[] }>('/carrier-accounts', query);
  }

  async get(id: string): Promise<CarrierAccount> {
    const res = await this.http.get<{ data: CarrierAccount }>(`/carrier-accounts/${encodeURIComponent(id)}`);
    return res.data;
  }

  /**
   * Bind an account. The first sync is scheduled right away.
   * Throws 409 when the organization already has a bound account with this
   * name on the carrier, 503 when credential storage is unavailable.
   */
  async bind(request: BindCarrierAccountRequest): Promise<CarrierAccount> {
    const res = await this.http.post<{ data: CarrierAccount }>('/carrier-accounts', request as unknown as Record<string, unknown>);
    return res.data;
  }

  /** Unbind: the stored password is destroyed and tracking of its packages stops. Idempotent. */
  async unbind(id: string): Promise<UnbindCarrierAccountResponse> {
    const res = await this.http.delete<{ data: UnbindCarrierAccountResponse }>(`/carrier-accounts/${encodeURIComponent(id)}`);
    return res.data;
  }

  /** Sync this account as soon as possible. */
  async sync(id: string): Promise<SyncCarrierAccountResponse> {
    const res = await this.http.post<{ data: SyncCarrierAccountResponse }>(`/carrier-accounts/${encodeURIComponent(id)}/sync`, {});
    return res.data;
  }
}
