import { HttpClient } from '../utils';
import type {
  Carrier,
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

  /** The organization's carrier accounts. */
  async list(params?: ListCarrierAccountsParams): Promise<{ data: CarrierAccount[] }> {
    const query: Record<string, unknown> = {};
    if (params?.carrier_org_id) query.carrier_org_id = params.carrier_org_id;
    return this.http.get<{ data: CarrierAccount[] }>('/carrier-accounts', query);
  }

  async get(id: string): Promise<CarrierAccount> {
    const res = await this.http.get<{ data: CarrierAccount }>(`/carrier-accounts/${encodeURIComponent(id)}`);
    return res.data;
  }

  /**
   * Bind an account. The first sync is scheduled right away.
   * Throws 409 when the organization already has an account with this name,
   * 503 when credential storage is unavailable.
   */
  async bind(request: BindCarrierAccountRequest): Promise<CarrierAccount> {
    const res = await this.http.post<{ data: CarrierAccount }>('/carrier-accounts', request as unknown as Record<string, unknown>);
    return res.data;
  }

  /** Unbind: the stored password is destroyed, tracking of its packages stops and the account is removed. */
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
