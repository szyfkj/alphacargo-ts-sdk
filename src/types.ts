/**
 * TMS API SDK Types
 */

// ============================================================================
// Common Types
// ============================================================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DateRangeParams {
  date_from?: string;
  date_to?: string;
}

// ============================================================================
// Waybill Types
// ============================================================================

export interface Product {
  sku: string;
  name: string;
  quantity?: number;
  number?: number;
  weight?: number;
  width?: number;
  length?: number;
  height?: number;
  /**
   * Free-form custom data, e.g. production details for customs clearance. Any
   * JSON object up to 8 KB. On a re-push, leaving it out keeps the stored value
   * and `null` clears it.
   */
  metadata?: Record<string, unknown> | null;
}

/**
 * Cargo handling for load planning. Every field is optional; unset fields
 * inherit from the waybill's product category (`load_defaults`), then from the
 * default (upright, may turn, stackable).
 */
export interface LoadProperties {
  /** `longship`: upright, lengthwise only; `rotatable`: upright, may turn; `tiltable`: any side up */
  orientation?: 'longship' | 'rotatable' | 'tiltable';
  /** Other cargo may be placed on top */
  stackable?: boolean;
  /** Nothing may be placed on top (overrides `stackable`) */
  fragile?: boolean;
  /** Must stand on the vehicle floor */
  bottom_only?: boolean;
  /** Most units in one stack (1–100) */
  max_layers?: number;
  /** Most weight that may rest on one unit, kg */
  max_load_kg?: number;
  geometry?: 'box' | 'cylinder';
}

export interface Parcel {
  outParcelNo: string;
  itemDesc: string;
  itemValue: number;
  weight?: number;
  width?: number;
  length?: number;
  height?: number;
  /**
   * Number of identical pieces this parcel represents as one lot. Defaults to 1.
   * Only honored when the waybill is created with `autoSplit: false` — otherwise
   * each product unit becomes its own package.
   */
  piece_count?: number;
  productList: Product[];
  photos?: string[];
  /** Cargo handling for load planning */
  load_properties?: LoadProperties;
}

export interface CreateWaybillRequest {
  outTradeNo: string;
  owner: string;
  /** Sender name. Optional if route_id is provided (derived from route's first leg start unit) */
  senderName?: string;
  /** Sender phone. Optional if route_id is provided (derived from route's first leg start unit) */
  senderPhone?: string;
  /** Sender city. Optional if route_id is provided */
  senderCityName?: string;
  /** Sender district. Optional if route_id is provided */
  senderDistrictName?: string;
  /** Sender postal code. Optional if route_id is provided */
  senderPostCode?: string;
  /** Sender address. Optional if route_id is provided */
  senderAddress?: string;
  /** Receiver name. Optional if route_id is provided (derived from route's last leg end unit) */
  receiverName?: string;
  /** Receiver phone. Optional if route_id is provided */
  receiverPhone?: string;
  receiverPhone2?: string;
  /** Receiver province. Optional if route_id is provided */
  receiverProvinceName?: string;
  /** Receiver city. Optional if route_id is provided */
  receiverCityName?: string;
  /** Receiver district. Optional if route_id is provided */
  receiverDistrictName?: string;
  /** Receiver postal code. Optional if route_id is provided */
  receiverPostCode?: string;
  /** Receiver address. Optional if route_id is provided */
  receiverAddress?: string;
  parcelList: Parcel[];
  remark?: string;
  /** Optional external reference number (e.g., customer PO number) */
  reference_no?: string;
  /** Free-text product/cargo category (legacy; e.g. "general", "sensitive") */
  product_category?: string;
  /** UUID of a managed product category (Settings → Product Categories). Coexists with product_category */
  product_category_id?: string;
  service_id?: string;
  /**
   * One of your organization's routes (another org's is refused with 400). When
   * provided, sender/receiver can be omitted - derived from route's first/last leg units
   */
  route_id?: string;
  additional_service_ids?: string[];
  sender_account?: { code?: string; id?: string };
  /** Estimated total weight (kg) for billing when actual values are unavailable (e.g. consolidation) */
  estimatedWeight?: number;
  /** Estimated total volume (m³) for billing when actual values are unavailable (e.g. consolidation) */
  estimatedVolume?: number;
  /** Total volumetric weight (kg) for the whole waybill. Callers sending a lot of
   *  N identical pieces should supply the already-multiplied total. */
  volumetricWeight?: number;
  /**
   * When true, each product unit in a parcel becomes its own package (with a
   * `-N` suffix on `outParcelNo`). When false, each parcel is persisted as a
   * single package carrying `piece_count` (a lot of N identical pieces). If
   * omitted, falls back to the organization's "Automatically split parcels"
   * preference (default false). */
  autoSplit?: boolean;
}

export type WaybillOverwriteBehavior = 'overwrite' | 'return_existing' | 'reject' | 'return_if_accepted';

export interface CreateWaybillOptions {
  /** How to handle an existing waybill with the same outTradeNo */
  overwrite?: WaybillOverwriteBehavior;
}

export interface WaybillPackage {
  package_no: string;
  external_package_no: string;
}

export interface CreateWaybillResponse {
  waybill_no: string;
  external_waybill_no: string;
  status: string;
  packages: WaybillPackage[];
}

/** Response from POST /waybills/allocate-number. */
export interface AllocateWaybillNumberResponse {
  /** The reserved number in the org's format, e.g. 'ABC1A748213905'. */
  number: string;
}

export interface UpdateWaybillRequest {
  reference_no?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  priority?: number | null;
  requires_signature?: boolean | null;
  sender_account_id?: string | null;
}

export interface TrackingRoute {
  /** The cross-border milestone (e.g. `customs_finished`) when the event has one, otherwise the status. */
  state: string;
  stateText: string;
  message: string;
  createdAt: number;
}

export interface WaybillEvents {
  trackingNo: string;
  state: string;
  stateText: string;
  licensePlate?: string;
  courierPhone?: string;
  podImages: string[];
  returnedItems: string[];
  routes: TrackingRoute[];
}

export type LabelFormat = 'pdf' | 'png' | 'zpl';
export type LabelSize = 'a4' | 'a6' | '4x6';

export interface GetLabelParams {
  packageId?: string;
}

// --- Waybill List / Details ---

export interface WaybillListParams extends PaginationParams {
  /** Waybill numbers to search for (space or comma-separated) */
  search?: string;
  /** Comma-separated list of statuses to filter by */
  statuses?: string;
  /** Comma-separated list of tags to filter by */
  tags?: string;
  service_id?: string;
  route_id?: string;
  route_leg_id?: string;
  contractor_id?: string;
  subcontractor_id?: string;
  latest_station_id?: string;
  service_area_id?: string;
  sender_account_code?: string;
  /** Filter by reference number. Pass a string for exact match, null to find waybills with no reference_no, or omit to skip filtering. */
  reference_no?: string | null;
  waiting_for_assignment?: boolean;
  date_from?: string;
  date_to?: string;
  /** Filter by payment status (e.g. "paid", "unpaid") */
  payment_status?: string;
  /** Filter by consolidation status. `true` = only consolidation parents, `false` = exclude them, omit = no filter. */
  is_consolidated?: boolean;
}

/** Lightweight waybill summary returned by the list endpoint (query_waybills_optimized) */
export interface WaybillSummary {
  id: string;
  waybill_no: string;
  external_waybill_no: string;
  reference_no?: string | null;
  status: string;
  latest_station_name: string;
  service_area_name: string;
  /** Service resolved from the requesting org's delegation. */
  service_id?: string | null;
  service_name?: string | null;
  /** Route resolved from the requesting org's delegation. */
  route_id?: string | null;
  weight: number;
  volume: number;
  volumetric_weight: number;
  estimated_weight?: number | null;
  estimated_volume?: number | null;
  sender_account_code?: string | null;
  max_length?: number | null;
  max_width?: number | null;
  max_height?: number | null;
  /** Sum of non-canceled billing amounts for this waybill. */
  billing_total?: number;
  /** Payment status derived from billings: "paid" when all non-canceled billings are paid, otherwise "unpaid". */
  payment_status?: string;
  /** True when this waybill is a consolidation parent (a master created by waybill consolidation). */
  is_consolidated?: boolean;
}

/**
 * Filters for counting waybills grouped by service. Same filter surface as
 * WaybillListParams but without pagination — the count endpoint aggregates the
 * whole matching set.
 */
export type WaybillServiceCountParams = Omit<WaybillListParams, keyof PaginationParams>;

/**
 * One row of the service-count aggregation: how many waybills resolve to a given
 * service (from the requesting org's delegation). service_id/service_name are null
 * for waybills with no delegation for the org.
 */
export interface WaybillServiceCount {
  service_id: string | null;
  service_name: string | null;
  count: number;
}

export interface WaybillAddress {
  id?: string;
  formatted_address?: string;
  town?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  coordinates?: unknown;
}

export interface WaybillRecipient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: WaybillAddress;
}

export interface WaybillPackageSummary {
  id: string;
  package_no: string;
  external_package_no?: string;
  status?: string;
  weight?: number;
  width?: number;
  length?: number;
  height?: number;
  products?: unknown[];
  metadata?: unknown;
  sub_package_no?: string;
  events?: unknown[];
}

export interface WaybillDelegation {
  organization_id: string;
  service_area_id?: string;
  /** This organization's route for the waybill. */
  route_id?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
  service_area_name?: string;
  organization_name?: string;
}

export interface WaybillDetails {
  id: string;
  waybill_no: string;
  external_waybill_no?: string;
  reference_no?: string | null;
  status: string;
  priority?: number;
  recipient?: WaybillRecipient;
  packages?: WaybillPackageSummary[];
  sender?: unknown;
  sender_account?: unknown;
  service?: unknown;
  service_area?: unknown;
  contractor_id?: string;
  delegations?: WaybillDelegation[];
  tags?: string[];
  notes?: string;
  requires_signature?: boolean;
  weight?: number;
  volume?: number;
  volumetric_weight?: number;
  estimated_weight?: number | null;
  estimated_volume?: number | null;
  /** Your organization's route for the waybill (from its delegation); null when it has none. */
  route_id?: string | null;
  route?: { id: string; code: string; name: string } | null;
  latest_station?: string;
  picked_up_time?: string;
  delivered_time?: string;
  created_at?: string;
  updated_at?: string;
  sub_waybills?: unknown[];
  leg?: unknown[];
  /**
   * Billing line items for the waybill, joined with rate card, invoice, sender
   * account and contractor. For a master waybill this is the merge of the
   * master's own billings and its sub-waybills' billings (a routed master's
   * transport charges live on its per-leg sub-waybills). Canceled billings are
   * excluded. Same shape as `client.waybills.getBillings()`.
   */
  billings?: WaybillBillingRecord[];
  /** Add-on / additional services attached to the waybill */
  additional_services?: AdditionalService[];
}

/** The parcel added to a waybill by {@link AddPackageRequest}. */
export interface AddParcel {
  /** External package number */
  outParcelNo: string;
  /** Item description; stored as the package's notes */
  itemDesc: string;
  itemValue?: number;
  /** Weight in kg, per piece when `piece_count` > 1 */
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  /** Number of identical pieces this parcel represents as one lot (default 1) */
  piece_count?: number;
  /** Cargo handling for load planning */
  load_properties?: LoadProperties;
  /** Itemised contents. May be empty or omitted (e.g. a box packed at the warehouse). */
  productList?: Product[];
  photos?: string[];
  /** Package ids this package physically contains (consolidation) */
  containedPackageIds?: string[];
}

export interface AddPackageRequest {
  parcel: AddParcel;
}

export interface AddPackageResponse {
  package_no: string;
  external_package_no: string;
  waybill_id: string;
}

/** One resulting package of a split — its own dimensions/weight (piece_count 1). */
export interface SplitPart {
  outParcelNo?: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  notes?: string;
  photos?: string[];
}

export interface SplitPackageRequest {
  /** At least two parts — the real packages the lot is split into. */
  parts: SplitPart[];
}

export interface SplitPackageResponse {
  waybillNo: string;
  canceledPackageNo: string;
  packages: { packageNo: string; id: string }[];
}

/** Fields of one package to change. Send at least one. */
export interface UpdatePackageRequest {
  /** Weight in kg. */
  weight?: number;
  /** Length in cm. */
  length?: number;
  /** Width in cm. */
  width?: number;
  /** Height in cm. */
  height?: number;
  /** Item description. */
  itemDesc?: string;
  /** Photo URLs to add. Appended to the package's photos; URLs it already has are skipped. */
  photos?: string[];
  /** Cargo handling for load planning. Replaces the package's. */
  load_properties?: LoadProperties;
}

export interface UpdatePackageResponse {
  waybillNo: string;
  packageNo: string;
  outParcelNo: string | null;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  itemDesc: string | null;
  photos: string[];
  load_properties: LoadProperties;
}

// --- Package Label OCR ---

export interface PackageLabelOcrParams {
  /** A photo URL to download and scan. */
  imageUrl?: string;
  /** Base64-encoded image bytes (no data: prefix) to scan directly. */
  imageBase64?: string;
  /** Destination country (ISO alpha-2) used to pick the OCR tier. */
  country?: string;
}

export interface PackageLabelOcrResult {
  /** The 5-letter sender-account code read from the label, or null if none. */
  code: string | null;
  /** OCR confidence for the matched token (0–1), when available. */
  confidence: number | null;
  /** Which Baidu OCR tier ran. */
  version: 'standard' | 'high_accuracy';
  /** Full recognized text (all lines joined by newline); null when none found. */
  text: string | null;
}

export interface PackageLabelOcrResponse {
  success: boolean;
  data?: PackageLabelOcrResult;
  error?: string;
}

// --- Additional Services ---

export interface AdditionalService {
  id: string;
  service_id: string;
  waybill_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  result?: Record<string, unknown>;
  service?: { id: string; name: string };
  created_at: string;
}

export interface CreateAdditionalServicesRequest {
  service_ids: string[];
}

export interface UpdateAdditionalServiceRequest {
  status: 'completed' | 'skipped' | 'in_progress';
  result?: Record<string, unknown>;
}

// --- Batch Label ---

export interface BatchLabelRequest {
  waybill_nos: string[];
}

// --- Consolidated Waybills ---

export interface RecipientAddress {
  street_line: string;
  block_floor_room?: string;
  city: string;
  state: string;
  town?: string;
  zip_code: string;
  country?: string;
}

export interface RecipientInput {
  name: string;
  phone: string;
  email?: string;
  address: RecipientAddress;
}

export interface ConsolidateWaybillsRequest {
  waybill_ids: string[];
  /** Optional — if omitted, resolved from the route's last leg end unit */
  recipient?: RecipientInput;
  service_id: string;
  /**
   * Delivery route for the consolidated master. Omit to let TMS auto-select the
   * consolidation delivery route from the recipient's service area (postal code),
   * falling back to the org's default delivery route.
   */
  route_id?: string;
  notes?: string;
  tags?: string[];
}

export interface ConsolidateWaybillsResponse {
  masterWaybill: { id: string; waybill_no: string };
  subWaybills: Array<{ id: string; waybill_no: string }>;
}

// ============================================================================
// Billing Types
// ============================================================================

export type BillingStatus = 'pending' | 'draft' | 'invoiced' | 'paid' | 'canceled';

export interface BillingRecord {
  id: string;
  name: string;
  rate_card_id: string;
  contractor_id?: string;
  sender_account_id?: string;
  organization_id?: string;
  waybill_id?: string;
  delivery_id?: string;
  /** Route leg this billing priced (snapshot, for per-leg consolidated shipments). */
  route_leg_id?: string;
  invoice_id?: string;
  billing_profile_id?: string;
  quantity: number;
  unit_price: number;
  amount: number;
  /** Currency, copied from the rate card at creation. Defaults to "THB". */
  currency: CurrencyCode;
  status: BillingStatus;
  created_at: string;
  updated_at: string;
}

/**
 * A billing record for a waybill, joined with its related entities. Returned by
 * `client.waybills.getBillings()` and embedded as the `billings` field of
 * `client.waybills.get()`. For a master waybill this includes billings from its
 * sub-waybills (which carry the per-leg transport charges).
 */
export interface WaybillBillingRecord {
  id: string;
  name: string;
  amount: number;
  quantity: number;
  unit_price: number;
  status: string;
  invoice_id: string | null;
  waybill: { id: string; waybill_no: string } | null;
  rate_card: { id: string; name: string } | null;
  invoice: {
    id: string;
    invoice_no: string;
    status: string;
    total_amount: number;
  } | null;
  sender_account: { id: string; name: string; sender_code: string } | null;
  contractor: { id: string; name: string } | null;
}

export interface CreateBillingRequest {
  name?: string;
  rate_card_id: string;
  contractor_id?: string;
  subcontractor_id?: string;
  sender_account_id?: string;
  organization_id?: string;
  waybill_id?: string;
  delivery_id?: string;
  /** Route leg this billing prices (snapshot). */
  route_leg_id?: string;
  quantity: number;
  status?: BillingStatus;
}

export interface UpdateBillingRequest {
  name?: string;
  quantity?: number;
  status?: BillingStatus;
}

export interface ListBillingsParams extends PaginationParams, DateRangeParams {
  contractor_id?: string;
  subcontractor_id?: string;
  rate_card_id?: string;
  status?: BillingStatus;
  invoice_id?: string;
}

export interface BillingEmailRequest {
  recipient_email: string;
  subject?: string;
  message?: string;
  filter?: {
    contractor_id?: string;
    subcontractor_id?: string;
    status?: BillingStatus;
    date_from?: string;
    date_to?: string;
  };
  billing_ids?: string[];
}

// ============================================================================
// Invoice Types
// ============================================================================

export type InvoiceStatus = 'draft' | 'issued' | 'payment_processing' | 'partially_paid' | 'paid' | 'overdue' | 'canceled' | 'disputed';

export interface InvoiceLineItem {
  id: string;
  billing_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  amount: number;
  waybill_no?: string;
}

export interface Invoice {
  id: string;
  invoice_no: string;
  contractor_id?: string;
  sender_account_id?: string;
  status: InvoiceStatus;
  /** Currency, derived from the invoice's billings. Defaults to "THB". An invoice never mixes currencies. */
  currency: CurrencyCode;
  subtotal: number;
  tax_amount: number;
  discount_amount?: number;
  total_amount: number;
  issue_date?: string;
  due_date?: string;
  period_start: string;
  period_end: string;
  notes?: string;
  payment_terms?: string;
  created_at: string;
  line_items?: InvoiceLineItem[];
  /**
   * Only on a create response: this invoice already existed and was returned
   * untouched (`reuse_existing`), rather than being created by that call.
   */
  reused?: boolean;
}

export interface CreateInvoiceRequest {
  contractor_id?: string;
  sender_account_id?: string;
  /**
   * Billings to invoice. They must all share one currency, which becomes the
   * invoice's currency — a mismatch is rejected with HTTP 400. Omit to create an
   * empty draft that defaults to the billing profile's currency.
   *
   * A billing already attached to an invoice is rejected with HTTP 400 naming
   * that invoice; billings are never moved between invoices. Reuse the named
   * invoice, or cancel it (which releases its billings) before re-billing.
   */
  billing_ids?: string[];
  period_start: string;
  period_end: string;
  notes?: string;
  payment_terms?: string;
  tax_rate?: number;
  /**
   * Fixed discount applied to the invoice (THB). Defaults to 0. Clamped to the
   * computed subtotal server-side. Use to push a coupon/points discount into
   * the invoice total at creation time.
   */
  discount_amount?: number;
  /**
   * Initial status — 'draft' (default) or 'issued' to create and issue in one
   * step. Issuing requires at least one line item.
   */
  status?: 'draft' | 'issued';
  /**
   * Cancel whatever invoice currently holds any of `billing_ids` and bill those
   * lines here instead — for a customer who abandoned payment and came back
   * with an overlapping selection. Cancelling releases the superseded invoice's
   * lines, including any not selected this time, and cancels any payment still
   * pending against it. Rejected with HTTP 400 when a superseded invoice has a
   * completed payment.
   */
  supersede_existing?: boolean;
  /**
   * Return the invoice these lines are already on instead of failing, when every
   * id in `billing_ids` sits on one live invoice — making the create idempotent
   * for a caller whose first step of paying is creating the invoice. The
   * returned invoice carries `reused: true`.
   *
   * Evaluated before `supersede_existing`, so passing both means "give me the
   * existing invoice if it covers exactly this set, otherwise replace it".
   */
  reuse_existing?: boolean;
  /** Issue date (YYYY-MM-DD). Defaults to today when status='issued'. */
  issue_date?: string;
  /** Due date (YYYY-MM-DD). Defaults to issue_date + billing profile payment terms when status='issued'. */
  due_date?: string;
}

export interface UpdateInvoiceRequest {
  status?: InvoiceStatus;
  notes?: string;
  payment_terms?: string;
  tax_rate?: number;
  discount_amount?: number;
}

export interface ListInvoicesParams extends PaginationParams {
  contractor_id?: string;
  subcontractor_id?: string;
  status?: InvoiceStatus;
  issue_date_from?: string;
  issue_date_to?: string;
  due_date_from?: string;
  due_date_to?: string;
}

export interface IssueInvoiceRequest {
  due_date?: string;
  issue_date?: string;
}

export interface SendInvoiceEmailRequest {
  recipient_email: string;
  cc_emails?: string[];
  subject?: string;
  message?: string;
}

/** @deprecated Use SendInvoiceEmailRequest instead */
export type SendEmailRequest = SendInvoiceEmailRequest;

// ============================================================================
// Payment Types
// ============================================================================

/**
 * Payment lifecycle status. Mirrors the database enum (the `payments_status_check`
 * constraint plus the `processing` value the payment service uses for in-flight
 * bank-transfer/FlashPay verification). The previous `verified`/`rejected` values
 * never existed in the database and have been removed.
 */
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'canceled';
export type PaymentMethod = 'bank_transfer' | 'flashpay' | 'wallet';

export interface PaymentAllocation {
  id: string;
  payment_id?: string;
  invoice_id: string;
  invoice_no?: string;
  amount: number;
  created_at?: string;
}

export interface Payment {
  id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_no?: string;
  status: PaymentStatus;
  notes?: string;
  contractor_id?: string;
  subcontractor_id?: string;
  sender_account_id?: string;
  created_at: string;
  allocations?: PaymentAllocation[];
}

export interface CreatePaymentRequest {
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  notes?: string;
  allocations: Array<{ invoice_id: string; amount: number }>;
  /** Payer org (required for B2B) */
  contractor_id?: string;
  /** Payer sender account (required for B2C) */
  sender_account_id?: string;
}

export interface UpdatePaymentRequest {
  status?: PaymentStatus;
  notes?: string;
  reference_no?: string;
}

export interface ListPaymentsParams extends PaginationParams {
  contractor_id?: string;
  subcontractor_id?: string;
  sender_account_id?: string;
  invoice_id?: string;
  status?: PaymentStatus;
  payment_method?: PaymentMethod;
  from_date?: string;
  to_date?: string;
}

export interface ReplaceAllocationsRequest {
  allocations: Array<{ invoice_id: string; amount: number }>;
}

// --- Bank Slip ---

export interface BankSlip {
  id: string;
  payment_id: string;
  /** The stored slip image. */
  file_url: string;
  /** Clearing code of the PAYER's bank, e.g. "014" for SCB. */
  bank_code: string | null;
  /** The PAYER's account number, when they supply it. */
  bank_account_no?: string | null;
  /** Reference the payer quoted for the transfer. */
  transfer_reference?: string | null;
  transfer_date: string;
  transfer_amount: number;
  verified?: boolean;
  verification_notes?: string;
  created_at: string;
}

export interface CreateBankSlipRequest {
  slip_url: string;
  /**
   * The PAYER's bank as a clearing code, not a display name. This was
   * `bank_name` and carried the full name, which the column rejected outright.
   */
  bank_code: string;
  transfer_date: string;
  transfer_amount: number;
  transfer_reference?: string;
}

export interface VerifyBankSlipRequest {
  verified: boolean;
  verification_notes?: string;
}

// --- Receiving Bank Accounts ---

/**
 * An organization's receiving account, as a PAYER may see it.
 *
 * Only the fields needed to actually make a transfer. The operator's label, the
 * account's monthly cap, its notes and its statement mapping are internal and
 * never cross this boundary.
 */
export interface PublicBankAccount {
  bank_name: string;
  bank_code: string | null;
  account_number: string;
  account_name: string;
  branch: string | null;
  currency: string;
  qr_image_url: string | null;
  instructions: string | null;
}

/** Where to send a bank transfer, and the reference that identifies it. */
export interface BankTransferInstructions {
  reference_code: string;
  account: PublicBankAccount;
  amount: number;
  currency: string;
  expires_at: string | null;
}

export interface BankAccountAvailability {
  available: boolean;
  currency: string;
  /** `no_bank_account_available` when unavailable, else null. */
  reason: string | null;
}

// --- FlashPay ---

export type FlashPayType = 'qr' | 'app';

/** How a payer completes a method — the branch a client renders. */
export type PaymentMode =
  | 'qr'
  | 'deeplink'
  | 'wechat_applet'
  | 'manual_transfer'
  | 'settled';

/** Why an offered method cannot be used right now. */
export type PaymentMethodUnavailableReason =
  | 'not_configured'
  | 'no_bank_account_available'
  | 'insufficient_balance'
  | 'currency_unsupported'
  | 'no_sender_account'
  | 'unavailable';

export interface AvailablePaymentMethod {
  name: PaymentMethod;
  /** Presentation shapes this method supports. */
  modes: PaymentMode[];
  available: boolean;
  /** Present only when `available` is false. */
  unavailable_reason?: PaymentMethodUnavailableReason;
}

export interface PaymentMethodsResponse {
  /** Allowed methods, in the order they should be shown. */
  methods: AvailablePaymentMethod[];
  /** The method to preselect, or null when nothing is enabled. */
  default: PaymentMethod | null;
}

/**
 * Query for the methods that may pay for something.
 *
 * Give `invoice_id` OR `service_id`, not both. With neither, only the
 * organization's own enabled list applies. `amount` and `currency` matter
 * because availability depends on the charge.
 */
export interface PaymentMethodsParams {
  invoice_id?: string;
  service_id?: string;
  sender_account_id?: string;
  amount?: number;
  currency?: string;
}

export interface FlashPayRequest {
  amount: number;
  allocations: Array<{ invoice_id: string; amount: number }>;
  flashpay_type: FlashPayType;
  /** Required when flashpay_type is 'app' — Thai bank code */
  flashpay_bank_code?: string;
  description?: string;
  /** Payer org (optional — resolved from invoice if omitted) */
  contractor_id?: string;
  /** Payer sender account (optional — resolved from invoice if omitted) */
  sender_account_id?: string;
}

export interface FlashPayQRResponse {
  id: string;
  qr_image: string;
  qr_raw_data: string;
  trade_no: string;
}

export interface FlashPayAppResponse {
  id: string;
  deeplink_url: string;
  trade_no: string;
}

export type FlashPayResponse = FlashPayQRResponse | FlashPayAppResponse;

// ============================================================================
// Wallet (prepaid deposit) Types
// ============================================================================

export type WalletTransactionType = 'topup' | 'debit' | 'refund' | 'adjust';

export interface WalletBalance {
  wallet_id: string;
  sender_account_id: string;
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: WalletTransactionType;
  amount: number;
  balance_after: number;
  related_payment_id?: string | null;
  idempotency_key: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

/** FlashPay top-up funding methods. */
export type WalletTopUpType = 'qr' | 'app' | 'wechat';

export interface TopUpWalletRequest {
  sender_account_id: string;
  amount: number;
  flashpay_type: WalletTopUpType;
  /** Required when flashpay_type is 'app' — Thai bank code. */
  flashpay_bank_code?: string;
  /**
   * Required when flashpay_type is 'wechat' — the payer's WeChat openId in the
   * merchant mini-program (resolved by the caller from the WeChat session).
   */
  open_id?: string;
  description?: string;
}

export interface WalletTopUpQRResponse {
  type: 'qr';
  payment_id: string;
  trade_no: string;
  qr_image: string;
  qr_raw_data: string;
}

export interface WalletTopUpAppResponse {
  type: 'app';
  payment_id: string;
  trade_no: string;
  deeplink_url: string;
}

/**
 * Params the mini-program passes to `wx.requestPayment`, mapped from FlashPay's
 * `wechatAppletParam`. `package` carries FlashPay's `prepayId`.
 */
export interface WeChatAppletPaymentParams {
  time_stamp: string;
  nonce_str: string;
  package: string;
  sign_type: string;
  pay_sign: string;
}

export interface WalletTopUpWeChatResponse {
  type: 'wechat';
  payment_id: string;
  trade_no: string;
  wechat_payment: WeChatAppletPaymentParams;
}

export type WalletTopUpResponse =
  | WalletTopUpQRResponse
  | WalletTopUpAppResponse
  | WalletTopUpWeChatResponse;

export interface PayInvoiceWithWalletRequest {
  sender_account_id: string;
  invoice_id: string;
  /** Amount to debit. Defaults to the invoice's outstanding balance. */
  amount?: number;
}

export interface PayInvoiceWithWalletResponse {
  payment_id: string;
  balance: number;
}

export interface ListWalletTransactionsParams extends PaginationParams {
  sender_account_id: string;
  type?: WalletTransactionType;
}

export interface WalletTransactionsResponse {
  data: WalletTransaction[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ============================================================================
// Rate Card Types
// ============================================================================

/** Supported currency codes (ISO 4217) for the pricing chain. */
export type CurrencyCode = 'THB' | 'USD' | 'CNY' | 'MYR' | 'SGD' | 'VND' | 'KZT';

export interface RateCard {
  id: string;
  name: string;
  unit_price: number;
  /** Currency of unit_price. Defaults to "THB". */
  currency: CurrencyCode;
  billing_unit: 'kg' | 'cbm' | 'per_waybill' | 'per_package';
  service_id: string;
  service?: { id: string; name: string };
  route_id?: string;
  /** Route leg this card prices. Matched independently of route_id, at higher priority. */
  route_leg_id?: string;
  contractor_id?: string;
  sender_account_type?: string;
  description?: string;
  created_at: string;
}

export interface CreateRateCardRequest {
  name: string;
  unit_price: number;
  /** Currency of unit_price (ISO 4217). Defaults to "THB". */
  currency?: CurrencyCode;
  billing_unit: 'kg' | 'cbm' | 'per_waybill' | 'per_package';
  service_id: string;
  route_id?: string;
  /** Route-leg-specific pricing. Matched independently of route_id, at higher priority. */
  route_leg_id?: string;
  contractor_id?: string;
  sender_account_type?: string;
  description?: string;
}

export interface UpdateRateCardRequest {
  name?: string;
  unit_price?: number;
  /** Currency of unit_price (ISO 4217). */
  currency?: CurrencyCode;
  billing_unit?: 'kg' | 'cbm' | 'per_waybill' | 'per_package';
  service_id?: string;
  route_id?: string;
  /** Route-leg-specific pricing. Matched independently of route_id, at higher priority. */
  route_leg_id?: string;
  contractor_id?: string;
  sender_account_type?: string;
  description?: string;
}

export interface ListRateCardsParams {
  service_id?: string;
  contractor_id?: string;
  route_id?: string;
  route_leg_id?: string;
}

// ============================================================================
// Sender Account Types
// ============================================================================

export interface SenderAccount {
  id: string;
  name: string;
  company_name?: string;
  sender_code: string;
  /**
   * Tenant's own alternate account code (per-org unique, free-form). Preserves a
   * code from a migrated external TMS; usable as a lookup key in `get()`.
   */
  slug?: string | null;
  email?: string;
  phone?: string;
  type: string;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface CreateSenderAccountRequest {
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  type?: string;
  is_active?: boolean;
  sender_code?: string;
  /** Tenant's own alternate account code (per-org unique, free-form). */
  slug?: string | null;
  address_id?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSenderAccountRequest {
  name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address_id?: string;
  is_active?: boolean;
  /** Tenant's own alternate account code (per-org unique, free-form). */
  slug?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ListSenderAccountsParams {
  search?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

/** One row of a sender-account bulk import. */
export interface ImportSenderAccountRow {
  name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  type?: string | null;
  /** The tenant's legacy code — the idempotency key for re-runnable imports. */
  slug?: string | null;
}

export interface ImportSenderAccountsRequest {
  rows: ImportSenderAccountRow[];
}

export interface ImportSenderAccountsResponse {
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; slug?: string | null; message: string }>;
}

// --- Sender Account Ownership (partner credential) ---

export interface SenderAccountOwnershipRequest {
  /** The sender account code read from a package label. */
  sender_account_code: string;
}

export interface SenderAccountOwnershipResponse {
  /** The `api_key` of the organization that owns the sender account. */
  api_key: string;
}

// --- Sender Account Recipients ---

export type AddressType = 'pickup' | 'return' | 'billing' | 'warehouse';

export interface SenderAccountRecipient {
  id: string;
  sender_account_id: string;
  recipient_id: string;
  recipient?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: {
      id: string;
      original_address?: string;
      formatted_address?: string;
      street_line?: string;
      block_floor_room?: string;
      city?: string;
      state?: string;
      town?: string;
      zip_code?: string;
      country?: string;
    } | null;
  } | null;
  is_default: boolean;
  is_active: boolean;
  label?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSenderAccountRecipientAddress {
  original_address?: string;
  street_line?: string;
  block_floor_room?: string;
  city?: string;
  state?: string;
  town?: string;
  zip_code?: string;
  country?: string;
}

export interface CreateSenderAccountRecipientRequest {
  /** Recipient name (required) */
  name: string;
  /** Recipient phone number (required) */
  phone: string;
  /** Recipient email */
  email?: string;
  /** Recipient address (required) */
  address: CreateSenderAccountRecipientAddress;
  /** Whether this is the default recipient for the sender account */
  is_default?: boolean;
  /** Human-friendly label */
  label?: string;
  /** Arbitrary key-value pairs */
  metadata?: Record<string, unknown>;
}

export interface UpdateSenderAccountRecipientRequest {
  /** Recipient name */
  name?: string;
  /** Recipient phone number */
  phone?: string;
  /** Recipient email */
  email?: string;
  /** Recipient address */
  address?: CreateSenderAccountRecipientAddress;
  /** Whether this is the default recipient for the sender account */
  is_default?: boolean;
  /** Whether the recipient link is active */
  is_active?: boolean;
  /** Human-friendly label */
  label?: string;
  /** Arbitrary key-value pairs */
  metadata?: Record<string, unknown>;
}

export interface ListSenderAccountRecipientsParams {
  is_active?: boolean;
}

// ============================================================================
// Billing Profile Types
// ============================================================================

export type BillingType = 'consolidated' | 'transactional';
export type BillingCycle = 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type PaymentTerms =
  | 'due_on_receipt'
  | 'net_7'
  | 'net_15'
  | 'net_30'
  | 'net_45'
  | 'net_60'
  | 'net_90'
  | 'custom';

export interface BillingProfile {
  id: string;
  contractor_id?: string;
  sender_account_id?: string;
  billing_type: BillingType;
  billing_cycle: BillingCycle;
  cycle_day?: number;
  cycle_weekday?: number;
  cycle_interval_days?: number;
  cycle_anchor_date?: string;
  payment_terms: PaymentTerms;
  payment_terms_days?: number;
  default_tax_rate: number;
  default_currency: string;
  default_notes?: string;
  auto_issue: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CreateBillingProfileRequest {
  contractor_id?: string;
  sender_account_id?: string;
  billing_type: BillingType;
  billing_cycle?: BillingCycle;
  cycle_day?: number;
  cycle_weekday?: number;
  cycle_interval_days?: number;
  cycle_anchor_date?: string;
  payment_terms?: PaymentTerms;
  payment_terms_days?: number;
  default_tax_rate?: number;
  default_currency?: string;
  default_notes?: string;
  auto_issue?: boolean;
}

export interface UpdateBillingProfileRequest {
  billing_type?: BillingType;
  billing_cycle?: BillingCycle;
  cycle_day?: number | null;
  cycle_weekday?: number | null;
  cycle_interval_days?: number | null;
  cycle_anchor_date?: string | null;
  payment_terms?: PaymentTerms;
  payment_terms_days?: number | null;
  default_tax_rate?: number;
  default_currency?: string;
  default_notes?: string | null;
  auto_issue?: boolean;
  is_active?: boolean;
}

export interface ListBillingProfilesParams extends PaginationParams {
  contractor_id?: string;
  sender_account_id?: string;
  billing_type?: BillingType;
  billing_cycle?: BillingCycle;
  is_active?: boolean;
}

export type CycleRunStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface BillingCycleRun {
  id: string;
  billing_profile_id: string;
  status: CycleRunStatus;
  period_start: string;
  period_end: string;
  invoice_id?: string;
  error_message?: string;
  created_at: string;
}

export interface ListCycleRunsParams extends PaginationParams {
  status?: CycleRunStatus;
}

export interface TriggerCycleRequest {
  as_of_date?: string;
}

// ============================================================================
// Waybill Route Types
// ============================================================================

export interface WaybillRouteUnitAddress {
  id: string;
  original_address: string;
  formatted_address: string | null;
  street_line: string | null;
  block_floor_room: string | null;
  city: string | null;
  town: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
  coordinates: unknown | null;
}

export interface WaybillRouteUnit {
  id: string;
  code: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  address: WaybillRouteUnitAddress | null;
}

export interface WaybillRouteLeg {
  id: string;
  code: string;
  name: string;
  start_unit_id: string;
  end_unit_id: string | null;
  start_unit: WaybillRouteUnit | null;
  end_unit: WaybillRouteUnit | null;
  consolidation: string;
  sequence_number: number;
}

export interface WaybillRoute {
  id: string;
  code: string;
  name: string;
  description: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  legs?: WaybillRouteLeg[];
}

export interface WaybillRouteWithLegs extends WaybillRoute {
  legs: WaybillRouteLeg[];
}

export interface ListWaybillRoutesParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// Delivery Event Types
// ============================================================================

export type DeliveryEventType =
  | 'draft'
  | 'created'
  | 'picked_up'
  | 'accepted'
  | 'delivering'
  | 'delivered'
  | 'failed'
  | 'exception'
  | 'canceled'
  | 'rescheduled'
  | 'returning'
  | 'returned'
  | 'in_transit_sorted'
  | 'in_transit_hub_inbound'
  | 'in_transit_hub_outbound';

/**
 * A cross-border milestone, recorded as one event type: transport_collecting →
 * picked_up, transport_originalport → in_transit_sorted, customs_finished and
 * transport_departed → in_transit_hub_outbound, transport_arrived →
 * in_transit_hub_inbound, transport_finished → in_transit_sorted,
 * transport_handover → delivered.
 */
export type SecondaryEventType =
  | 'transport_collecting'
  | 'transport_originalport'
  | 'customs_finished'
  | 'transport_departed'
  | 'transport_arrived'
  | 'transport_finished'
  | 'transport_handover';

export interface DeliveryEvent {
  id: string;
  waybill_id?: string;
  package_id?: string;
  event_type: DeliveryEventType;
  /** The cross-border milestone; null for other events. */
  secondary_event_type?: SecondaryEventType | null;
  event_time: string;
  coordinates?: Record<string, unknown>;
  notes?: string;
  photos?: string[];
  created_at: string;
}

export interface CreateDeliveryEventRequest {
  waybill_id?: string;
  package_id?: string;
  /** Required unless secondary_event_type is given; with it, the milestone's event type. */
  event_type?: DeliveryEventType;
  secondary_event_type?: SecondaryEventType;
  event_time?: string;
  coordinates?: Record<string, unknown>;
  notes?: string;
  photos?: string[];
}

/** From `POST /delivery-events/{eventId}/pods/upload-token`. */
export type PodUploadToken =
  | { mode: 'server' }
  | {
      mode: 'oss';
      region: string;
      bucket: string;
      /** The OSS host to upload to; pass it as ali-oss's `endpoint`. */
      endpoint: string;
      /** Every object key you upload must start with this. */
      prefix: string;
      accessKeyId: string;
      accessKeySecret: string;
      securityToken: string;
      expiration: string;
    };

// ============================================================================
// Report Types
// ============================================================================

export interface ReportDateRangeParams {
  date_from: string;
  date_to: string;
  format?: 'json' | 'csv';
}

export interface BillingByServiceParams extends ReportDateRangeParams {
  contractor_id?: string;
}

export interface BillingByServiceReport {
  date_from: string;
  date_to: string;
  data: Array<{
    service: string;
    service_id: string;
    quantity: number;
    amount: number;
  }>;
  totals: { quantity: number; amount: number };
}

export interface OutstandingInvoicesParams {
  contractor_id?: string;
  status?: 'issued' | 'overdue' | 'all';
  format?: 'json' | 'csv';
}

export interface OutstandingInvoicesReport {
  date_as_of: string;
  data: Array<{
    invoice_no: string;
    contractor: string;
    issue_date: string;
    due_date: string;
    amount: number;
    paid: number;
    balance: number;
    days_overdue: number;
    aging_bucket: string;
  }>;
  summary: Record<string, unknown>;
}

export interface PaymentHistoryParams extends ReportDateRangeParams {
  contractor_id?: string;
  method?: PaymentMethod;
}

export interface PaymentHistoryReport {
  date_from: string;
  date_to: string;
  data: Array<{
    date: string;
    reference: string;
    contractor: string;
    method: string;
    amount: number;
    invoices: string[];
    status: string;
  }>;
  summary: Record<string, unknown>;
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export interface RevenueSummaryParams extends ReportDateRangeParams {
  contractor_id?: string;
  period?: ReportPeriod;
}

export interface RevenueSummaryReport {
  period: ReportPeriod;
  date_from: string;
  date_to: string;
  data: Array<{
    period: string;
    invoiced: number;
    paid: number;
    pending: number;
  }>;
  totals: Record<string, unknown>;
}

// ============================================================================
// Region / Location Types
// ============================================================================

export interface RegionDistrict {
  name: string;
  code: string;
}

export interface RegionCity {
  name: string;
  districts: RegionDistrict[];
}

export interface RegionProvince {
  name: string;
  cities: RegionCity[];
}

export interface RegionHierarchy {
  provinces: RegionProvince[];
}

export interface ListRegionsParams {
  /** ISO country code, e.g. "TH" */
  country: string;
  /** Optional postal code to narrow the hierarchy */
  postal_code?: string;
}

// ============================================================================
// Address Resolution Types
// ============================================================================

/** Which geocoding strategy produced a resolved address. */
export type GeocodeSource =
  | 'google_geocoding'
  | 'google_places'
  | 'postal_centroid'
  | 'province_centroid';

/** Options shared by every address-resolution input mode. */
export interface AddressResolveOptions {
  /** ISO alpha-2 country hint; scopes the geocoder's region bias and DB fallbacks. */
  country?: string;
  /**
   * Whether to persist an entry to the address_resolution_logs table.
   * Defaults to `true`; pass `false` to skip logging.
   */
  logResolution?: boolean;
}

/** Resolve free-text into structured address fields. */
export interface AddressResolveByText extends AddressResolveOptions {
  address: string;
}

/** Resolve a Google-Maps pin / short link into coordinates. */
export interface AddressResolveByUrl extends AddressResolveOptions {
  url: string;
}

/** Reverse-geocode a shared device location. */
export interface AddressResolveByCoords extends AddressResolveOptions {
  lat: number;
  lng: number;
}

/**
 * Address-resolution request. Provide exactly one of `address`, `url`, or
 * `lat`+`lng`; the response shape is identical across all three modes.
 */
export type AddressResolveRequest =
  | AddressResolveByText
  | AddressResolveByUrl
  | AddressResolveByCoords;

/** Structured address returned by `client.address.resolve(...)`. */
export interface ResolvedAddress {
  lat: number;
  lng: number;
  country: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  postal_code: string | null;
  formatted_address: string | null;
  place_name: string | null;
  /** Confidence of the resolution, 0–1. */
  confidence: number;
  source: GeocodeSource;
}

// ============================================================================
// Organization Types
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: 'business' | 'individual' | 'enterprise';
  size: 'small' | 'medium' | 'large' | 'enterprise';
  status: 'active' | 'suspended' | 'pending';
  owner_id: string;
  logo_url?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  custom_domain?: string | null;
  domain_verified?: boolean;
  description?: string | null;
  settings?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  type?: 'business' | 'individual' | 'enterprise';
  size?: 'small' | 'medium' | 'large' | 'enterprise';
  logo_url?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Organization Unit Types
// ============================================================================

export type OrganizationUnitType = 'branch' | 'warehouse' | 'office' | 'hub' | 'division' | 'department';

export interface OrganizationUnit {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  type: OrganizationUnitType;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  address_id?: string | null;
  manager_user_id?: string | null;
  parent_unit_id?: string | null;
  is_active: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUnitAddress {
  street_line?: string;
  block_floor_room?: string;
  city?: string;
  state?: string;
  town?: string;
  zip_code?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
}

export interface CreateOrganizationUnitRequest {
  name: string;
  code: string;
  type?: OrganizationUnitType;
  address: OrganizationUnitAddress;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
  manager_user_id?: string | null;
  parent_unit_id?: string | null;
  service_area_ids?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateOrganizationUnitRequest {
  name?: string;
  type?: OrganizationUnitType;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
  manager_user_id?: string | null;
  parent_unit_id?: string | null;
  service_area_ids?: string[];
  address_id?: string | null;
  address?: OrganizationUnitAddress;
  metadata?: Record<string, unknown>;
}

export interface ListOrganizationUnitsParams {
  search?: string;
  type?: OrganizationUnitType;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Product Category Types
// ============================================================================

export interface ProductCategory {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  /** Default cargo handling for waybills in this category and its subcategories */
  load_defaults: LoadProperties;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/** A product category with its children resolved (returned when `tree=true`). */
export interface ProductCategoryTreeNode extends ProductCategory {
  children: ProductCategoryTreeNode[];
}

export interface CreateProductCategoryRequest {
  name: string;
  /** Parent category UUID; omit or null for a root category */
  parent_id?: string | null;
  description?: string | null;
  is_active?: boolean;
  sort_order?: number;
  /** Default cargo handling for load planning */
  load_defaults?: LoadProperties;
  /**
   * Services this category's cargo may travel on. Omit to allow every service;
   * a subcategory with none of its own inherits the nearest ancestor's list.
   */
  allowed_service_ids?: string[];
}

export interface UpdateProductCategoryRequest {
  name?: string;
  /** Set to re-parent; moving a node under itself or a descendant is rejected */
  parent_id?: string | null;
  description?: string | null;
  is_active?: boolean;
  sort_order?: number;
  /** Replaces the category's handling defaults */
  load_defaults?: LoadProperties;
  /**
   * Replaces the services this category's cargo may travel on. Omit to leave
   * the list untouched; `[]` clears it back to inheriting from its ancestors.
   */
  allowed_service_ids?: string[];
}

export interface ListProductCategoriesParams {
  /** When true, returns the nested tree via {@link ProductCategoriesTreeResponse} instead of a flat list */
  tree?: boolean;
  search?: string;
  parent_id?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Quote Types
// ============================================================================

/** Pickup / delivery address for a quote request. */
export interface QuoteAddress {
  /** Free-text address line. */
  address: string;
  /**
   * Latitude (-90..90). REQUIRED: quoting never geocodes. Resolve free text
   * with `client.address.resolve({ address })` first and check its `confidence`.
   */
  lat: number;
  /** Longitude (-180..180). Required, see `lat`. */
  lng: number;
  country?: string | null;
  province?: string | null;
  district?: string | null;
  postal_code?: string | null;
  phone?: string | null;
}

/** A cargo line item in a quote request. */
export interface QuoteItem {
  /** Quantity (integer > 0). */
  qty: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  weight_kg: number;
  volume_m3?: number | null;
  stackable?: boolean | null;
  fragile?: boolean | null;
  name?: string | null;
  notes?: string | null;
  /** Image URLs. Defaults to [] server-side when omitted. */
  image_urls?: string[];
}

export type QuoteServiceType = 'ftl_transport' | 'ltl_transport';

export interface CreateQuoteRequest {
  /** Caller-supplied correlation ID (echoed back). Generated when omitted. */
  request_id?: string;
  /** Pickup address, coordinates included. */
  pickup: QuoteAddress;
  /** Delivery address, coordinates included. */
  delivery: QuoteAddress;
  /**
   * Cargo items (min 1). Shipment totals are always derived from these
   * server-side, so there is nothing to send alongside them.
   */
  items: QuoteItem[];
  /** Defaults to "ftl_transport". */
  service_type?: QuoteServiceType;
  cargo_notes?: string | null;
  /** Add-on requests, each identified by `key`. */
  addons?: { key: string }[];
}

/** One line of a quotation's price breakdown (base fare plus any add-ons). */
export type QuoteBreakdownLine =
  | { kind: 'base'; amount: number }
  | { kind: 'addon'; key: string; amount: number };

export interface CreateQuoteResponse {
  quotation_id: string;
  request_id: string;
  /** Selected vehicle, or null when no vehicle dimension applies. */
  vehicle: { type: string; max_payload_kg: number } | null;
  /**
   * Multi-vehicle composition — present (non-null) only when the cargo fits no
   * single vehicle and was split across a fleet (3PL/provider_markup only).
   * `estimated_total` is the sum of the per-vehicle `price` values.
   */
  vehicles:
    | Array<{
        vehicle_type: string;
        price: number;
        items: Array<{ name: string | null; qty: number }>;
      }>
    | null;
  /** The quoted price (sum of per-vehicle prices for a composition). */
  estimated_total: number;
  /** Currency of `estimated_total` (ISO 4217). */
  currency: string;
  /** ISO-8601 timestamp after which the quote is no longer valid. */
  expires_at: string;
  /** Price breakdown: the base fare followed by any add-on lines. */
  breakdown: QuoteBreakdownLine[];
}

// ============================================================================
// Shipping Fee Types
// ============================================================================

export interface ShippingFeeDimensions {
  length_cm: number;
  width_cm: number;
  height_cm: number;
}

export interface CreateShippingFeeRequest {
  /** The transport-mode service to price (a shipping-service id). */
  service_id: string;
  /** Actual weight in kilograms. */
  weight_kg: number;
  /** Optional box dimensions (cm) — used to derive volume and volumetric weight. */
  dimensions?: ShippingFeeDimensions | null;
  /** Piece count for per_package rate cards. Defaults to 1 server-side. */
  package_count?: number;
  /** Extra service ids to price alongside the primary (e.g. wooden crate). */
  addon_service_ids?: string[];
  /** Recipient postal code — resolves the destination service area / route. */
  destination_postal_code: string;
  /** ISO country of the destination. Defaults to "TH" server-side. */
  country?: string;
  /**
   * The company's before-consolidation route id (supplied server-side from
   * credentials, not by the app). Priced as one leg; its terminal end unit is
   * the start of the after-consolidation delivery route.
   */
  before_consolidation_route_id?: string | null;
}

export interface ShippingFeeBreakdownLine {
  label: string;
  amount: number;
}

export interface ShippingFeeResponse {
  /** Total estimated fee (primary service + any add-ons), in `currency`. */
  cost: number;
  /** ISO 4217 currency of `cost` (defaults to THB). */
  currency: string;
  /** Human label for the primary service (the priced rate card's name). */
  service_name: string;
  /** The weight the primary card was charged on (max of actual & volumetric). */
  chargeable_weight: number;
  breakdown: ShippingFeeBreakdownLine[];
}

// ============================================================================
// SDK Configuration Types
// ============================================================================

/**
 * Language for localized API error messages, sent as the `Accept-Language`
 * header. The API supports English, Thai, and Chinese; any other value falls
 * back to English on the server. Only error messages are localized — response
 * shapes, HTTP status codes, and legacy numeric codes are unaffected.
 */
export type TMSLanguage = 'en' | 'th' | 'zh' | (string & {});

export interface TMSClientConfig {
  /**
   * Base URL of the TMS API
   * @example 'https://your-domain.com/api'
   */
  baseUrl: string;

  /**
   * API key (merchant ID) for signature authentication
   */
  apiKey: string;

  /**
   * API secret for generating request signatures
   */
  apiSecret: string;
  /**
   * @deprecated Ignored. Requests are always signed with HMAC-SHA256 keyed by
   * `apiSecret`; the unkeyed `'sha256'` scheme was removed in 3.0.
   */
  signatureScheme?: 'hmac-sha256';
  /**
   * Log each request's method, path and status. Off by default. Query strings,
   * bodies and responses are never logged: a signed request is a credential.
   */
  debug?: boolean;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Preferred language for localized error messages, sent as the
   * `Accept-Language` header on every request. Defaults to English when
   * omitted. Can be overridden per-client with {@link TMSClient.setLanguage}
   * or scoped with {@link TMSClient.withLanguage}.
   * @example 'zh'
   */
  language?: TMSLanguage;

  /**
   * Custom headers to include in all requests. A header set here takes
   * precedence over the one derived from `language`.
   */
  headers?: Record<string, string>;
}

export interface TMSError {
  code: number;
  message: string;
  details?: unknown;
}
