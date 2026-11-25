import { HttpClient } from '../utils';
import type { PublicBankAccount, BankAccountAvailability, ManagedBankAccount, CreateBankAccountRequest, UpdateBankAccountRequest } from '../types';

/**
 * Receiving bank accounts — where an organization's customers send money for
 * the `bank_transfer` payment method.
 *
 * `list` is the payer-safe projection. The account's owner manages its own
 * accounts with `listManaged`, `create`, `update` and `remove` (an Agent
 * Workbench agent's 收款方式): a bank account, or a WeChat, Alipay or local QR
 * code (`channel`). Only a bank account takes a payer's bank transfer.
 *
 * Not to be confused with a bank slip, which is the PAYER's evidence of having
 * sent money and describes THEIR account.
 */
export class BankAccounts {
  constructor(private readonly http: HttpClient) {}

  /**
   * List the active receiving accounts, as a payer may see them.
   *
   * @param params.currency - Only accounts denominated in this currency. Worth
   * passing: money can only be received into an account in its own currency, so
   * an account in the wrong one is never a valid answer.
   *
   * @example
   * ```typescript
   * const accounts = await client.bankAccounts.list({ currency: 'THB' });
   * ```
   */
  async list(params?: { currency?: string }): Promise<PublicBankAccount[]> {
    const query = new URLSearchParams({ view: 'public' });
    if (params?.currency) query.set('currency', params.currency);
    return this.http.get<PublicBankAccount[]>(`/bank-accounts?${query.toString()}`);
  }

  /**
   * Whether a bank transfer can be offered for this amount and currency.
   *
   * Call it before showing the option, so a customer is never handed a payment
   * method that immediately dead-ends. It comes back false when the organization
   * holds no active account in that currency, or when every such account would
   * breach its monthly receiving cap.
   *
   * Advisory only: another payment can consume the headroom a moment later, so
   * a `true` here is not a promise that the payment will succeed.
   *
   * @example
   * ```typescript
   * const { available } = await client.bankAccounts.checkAvailability({
   *   amount: 1500,
   *   currency: 'THB',
   * });
   * ```
   */
  async checkAvailability(params: {
    amount: number;
    currency: string;
  }): Promise<BankAccountAvailability> {
    const query = new URLSearchParams({
      amount: String(params.amount),
      currency: params.currency,
    });
    return this.http.get<BankAccountAvailability>(
      `/bank-accounts/availability?${query.toString()}`,
    );
  }

  /** Your receiving accounts, every field, with this month's usage against each cap. */
  async listManaged(): Promise<ManagedBankAccount[]> {
    return this.http.get<ManagedBankAccount[]>('/bank-accounts');
  }

  /** Add a receiving account: a bank account, or a WeChat, Alipay or local QR code (`qr_image_url`). */
  async create(data: CreateBankAccountRequest): Promise<{ id: string }> {
    return this.http.post<{ id: string }>('/bank-accounts', data as unknown as Record<string, unknown>);
  }

  async update(id: string, data: UpdateBankAccountRequest): Promise<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`/bank-accounts/${encodeURIComponent(id)}`, data as unknown as Record<string, unknown>);
  }

  /** Refused (409) once the account has received a transfer: deactivate it instead (`is_active: false`). */
  async remove(id: string): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`/bank-accounts/${encodeURIComponent(id)}`);
  }
}
