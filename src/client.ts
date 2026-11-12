import { HttpClient } from './utils';
import {
  BankAccounts,
  Waybills,
  Billings,
  Invoices,
  Payments,
  RateCards,
  SenderAccounts,
  CarrierAccounts,
  Agent,
  BillingProfiles,
  DeliveryEvents,
  Reports,
  Regions,
  WaybillRoutes,
  Organizations,
  OrganizationUnits,
  ProductCategories,
  Wallets,
  Quotes,
  Address,
  ShippingFee,
} from './resources';
import type { TMSClientConfig, TMSLanguage } from './types';

/**
 * TMS API Client
 *
 * The main entry point for interacting with the TMS API.
 *
 * @example
 * ```typescript
 * import { TMSClient } from '@alphacargo/tms-sdk';
 *
 * const client = new TMSClient({
 *   baseUrl: 'https://your-domain.com/api',
 *   apiKey: 'your-api-key',
 *   apiSecret: 'your-api-secret'
 * });
 *
 * // Create a waybill
 * const waybill = await client.waybills.create({
 *   outTradeNo: 'ORDER-001',
 *   // ... other fields
 * });
 *
 * // Get tracking events
 * const events = await client.waybills.getEvents(waybill.waybill_no);
 * ```
 */
export class TMSClient {
  private readonly http: HttpClient;
  private readonly config: TMSClientConfig;

  /**
   * Waybills resource for managing shipping orders
   */
  public readonly waybills: Waybills;

  /**
   * Billings resource for managing billing records
   */
  public readonly billings: Billings;

  /**
   * Invoices resource for managing invoices
   */
  public readonly invoices: Invoices;

  /**
   * Payments resource for managing payments
   */
  public readonly payments: Payments;
  /** Receiving bank accounts, read-only and payer-safe. */
  public readonly bankAccounts: BankAccounts;

  /**
   * RateCards resource for managing rate cards
   */
  public readonly rateCards: RateCards;

  /**
   * SenderAccounts resource for managing sender accounts
   */
  public readonly senderAccounts: SenderAccounts;

  /**
   * Carrier accounts (Agent Workbench): logins on carrier portals
   */
  public readonly carrierAccounts: CarrierAccounts;

  /**
   * Agent Workbench views (unmatched-marker queue)
   */
  public readonly agent: Agent;

  /**
   * BillingProfiles resource for managing billing profiles and cycles
   */
  public readonly billingProfiles: BillingProfiles;

  /**
   * DeliveryEvents resource for managing delivery events and PODs
   */
  public readonly deliveryEvents: DeliveryEvents;

  /**
   * Reports resource for generating financial reports
   */
  public readonly reports: Reports;

  /**
   * Regions resource for querying location hierarchy (provinces, cities, districts)
   */
  public readonly regions: Regions;

  /**
   * WaybillRoutes resource for querying waybill routes
   */
  public readonly waybillRoutes: WaybillRoutes;

  /**
   * Organizations resource for managing the current organization
   */
  public readonly organizations: Organizations;

  /**
   * OrganizationUnits resource for managing organization units (branches, warehouses, etc.)
   */
  public readonly organizationUnits: OrganizationUnits;

  /**
   * ProductCategories resource for managing the org-scoped product category tree
   */
  public readonly productCategories: ProductCategories;

  /**
   * Wallets resource for prepaid deposit balances (top-up, pay, transactions)
   */
  public readonly wallets: Wallets;

  /**
   * Quotes resource for creating FTL/LTL shipping quotations
   */
  public readonly quotes: Quotes;

  /**
   * Address resource for resolving locations into structured address fields
   */
  public readonly address: Address;

  /**
   * ShippingFee resource for ad-hoc forwarding-fee estimates
   */
  public readonly shippingFee: ShippingFee;

  /**
   * Create a new TMS API client
   *
   * @param config - Client configuration
   *
   * @example
   * ```typescript
   * const client = new TMSClient({
   *   baseUrl: 'https://your-domain.com/api',
   *   apiKey: 'your-api-key',
   *   apiSecret: 'your-api-secret',
   *   timeout: 30000 // optional, defaults to 30 seconds
   * });
   * ```
   */
  constructor(config: TMSClientConfig) {
    if (!config.baseUrl) {
      throw new Error('baseUrl is required');
    }
    if (!config.apiKey) {
      throw new Error('apiKey is required');
    }
    if (!config.apiSecret) {
      throw new Error('apiSecret is required');
    }

    this.config = config;
    this.http = new HttpClient(config);

    // Initialize resources
    this.waybills = new Waybills(this.http);
    this.billings = new Billings(this.http);
    this.invoices = new Invoices(this.http);
    this.payments = new Payments(this.http);
    this.bankAccounts = new BankAccounts(this.http);
    this.rateCards = new RateCards(this.http);
    this.senderAccounts = new SenderAccounts(this.http);
    this.carrierAccounts = new CarrierAccounts(this.http);
    this.agent = new Agent(this.http);
    this.billingProfiles = new BillingProfiles(this.http);
    this.deliveryEvents = new DeliveryEvents(this.http);
    this.reports = new Reports(this.http);
    this.regions = new Regions(this.http);
    this.waybillRoutes = new WaybillRoutes(this.http);
    this.organizations = new Organizations(this.http);
    this.organizationUnits = new OrganizationUnits(this.http);
    this.productCategories = new ProductCategories(this.http);
    this.wallets = new Wallets(this.http);
    this.quotes = new Quotes(this.http);
    this.address = new Address(this.http);
    this.shippingFee = new ShippingFee(this.http);
  }

  /**
   * Set the preferred language for localized API error messages (sent as the
   * `Accept-Language` header) on this client, affecting all subsequent requests.
   * Pass `undefined` to clear it (server defaults to English).
   *
   * @example
   * ```typescript
   * client.setLanguage('zh'); // error messages now returned in Chinese
   * ```
   */
  setLanguage(language?: TMSLanguage): void {
    this.http.setLanguage(language);
  }

  /**
   * Create a new client scoped to a different language for localized error
   * messages, leaving this client unchanged. Useful for a single request or a
   * per-user-request handler.
   *
   * @example
   * ```typescript
   * const zhClient = client.withLanguage('zh');
   * await zhClient.waybills.get('UNKNOWN'); // error message in Chinese
   * ```
   */
  withLanguage(language?: TMSLanguage): TMSClient {
    return new TMSClient({ ...this.config, language });
  }
}
