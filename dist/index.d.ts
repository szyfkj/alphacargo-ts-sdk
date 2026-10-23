/**
 * TMS API SDK Types
 */
interface PaginationParams {
    page?: number;
    pageSize?: number;
}
interface PaginatedResponse<T> {
    data: T[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}
interface DateRangeParams {
    date_from?: string;
    date_to?: string;
}
interface Product {
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
interface LoadProperties {
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
interface Parcel {
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
interface CreateWaybillRequest {
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
    sender_account?: {
        code?: string;
        id?: string;
    };
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
type WaybillOverwriteBehavior = 'overwrite' | 'return_existing' | 'reject' | 'return_if_accepted';
interface CreateWaybillOptions {
    /** How to handle an existing waybill with the same outTradeNo */
    overwrite?: WaybillOverwriteBehavior;
}
interface WaybillPackage {
    package_no: string;
    external_package_no: string;
}
interface CreateWaybillResponse {
    waybill_no: string;
    external_waybill_no: string;
    status: string;
    packages: WaybillPackage[];
}
/** Response from POST /waybills/allocate-number. */
interface AllocateWaybillNumberResponse {
    /** The reserved number in the org's format, e.g. 'ABC1A748213905'. */
    number: string;
}
interface UpdateWaybillRequest {
    reference_no?: string | null;
    notes?: string | null;
    tags?: string[] | null;
    priority?: number | null;
    requires_signature?: boolean | null;
    sender_account_id?: string | null;
}
interface TrackingRoute {
    /** The cross-border milestone (e.g. `customs_finished`) when the event has one, otherwise the status. */
    state: string;
    stateText: string;
    message: string;
    createdAt: number;
}
interface WaybillEvents {
    trackingNo: string;
    state: string;
    stateText: string;
    licensePlate?: string;
    courierPhone?: string;
    podImages: string[];
    returnedItems: string[];
    routes: TrackingRoute[];
}
type LabelFormat = 'pdf' | 'png' | 'zpl';
type LabelSize = 'a4' | 'a6' | '4x6';
interface GetLabelParams {
    packageId?: string;
}
interface WaybillListParams extends PaginationParams {
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
interface WaybillSummary {
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
type WaybillServiceCountParams = Omit<WaybillListParams, keyof PaginationParams>;
/**
 * One row of the service-count aggregation: how many waybills resolve to a given
 * service (from the requesting org's delegation). service_id/service_name are null
 * for waybills with no delegation for the org.
 */
interface WaybillServiceCount {
    service_id: string | null;
    service_name: string | null;
    count: number;
}
interface WaybillAddress {
    id?: string;
    formatted_address?: string;
    town?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    coordinates?: unknown;
}
interface WaybillRecipient {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: WaybillAddress;
}
interface WaybillPackageSummary {
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
interface WaybillDelegation {
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
interface WaybillDetails {
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
    route?: {
        id: string;
        code: string;
        name: string;
    } | null;
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
interface AddParcel {
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
interface AddPackageRequest {
    parcel: AddParcel;
}
interface AddPackageResponse {
    package_no: string;
    external_package_no: string;
    waybill_id: string;
}
/** One resulting package of a split — its own dimensions/weight (piece_count 1). */
interface SplitPart {
    outParcelNo?: string;
    weight: number;
    length: number;
    width: number;
    height: number;
    notes?: string;
    photos?: string[];
}
interface SplitPackageRequest {
    /** At least two parts — the real packages the lot is split into. */
    parts: SplitPart[];
}
interface SplitPackageResponse {
    waybillNo: string;
    canceledPackageNo: string;
    packages: {
        packageNo: string;
        id: string;
    }[];
}
/** Fields of one package to change. Send at least one. */
interface UpdatePackageRequest {
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
interface UpdatePackageResponse {
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
interface PackageLabelOcrParams {
    /** A photo URL to download and scan. */
    imageUrl?: string;
    /** Base64-encoded image bytes (no data: prefix) to scan directly. */
    imageBase64?: string;
    /** Destination country (ISO alpha-2) used to pick the OCR tier. */
    country?: string;
}
interface PackageLabelOcrResult {
    /** The 5-letter sender-account code read from the label, or null if none. */
    code: string | null;
    /** OCR confidence for the matched token (0–1), when available. */
    confidence: number | null;
    /** Which Baidu OCR tier ran. */
    version: 'standard' | 'high_accuracy';
    /** Full recognized text (all lines joined by newline); null when none found. */
    text: string | null;
}
interface PackageLabelOcrResponse {
    success: boolean;
    data?: PackageLabelOcrResult;
    error?: string;
}
interface AdditionalService {
    id: string;
    service_id: string;
    waybill_id: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    result?: Record<string, unknown>;
    service?: {
        id: string;
        name: string;
    };
    created_at: string;
}
interface CreateAdditionalServicesRequest {
    service_ids: string[];
}
interface UpdateAdditionalServiceRequest {
    status: 'completed' | 'skipped' | 'in_progress';
    result?: Record<string, unknown>;
}
interface BatchLabelRequest {
    waybill_nos: string[];
}
interface RecipientAddress {
    street_line: string;
    block_floor_room?: string;
    city: string;
    state: string;
    town?: string;
    zip_code: string;
    country?: string;
}
interface RecipientInput {
    name: string;
    phone: string;
    email?: string;
    address: RecipientAddress;
}
interface ConsolidateWaybillsRequest {
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
interface ConsolidateWaybillsResponse {
    masterWaybill: {
        id: string;
        waybill_no: string;
    };
    subWaybills: Array<{
        id: string;
        waybill_no: string;
    }>;
}
type BillingStatus = 'pending' | 'draft' | 'invoiced' | 'paid' | 'canceled';
interface BillingRecord {
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
interface WaybillBillingRecord {
    id: string;
    name: string;
    amount: number;
    quantity: number;
    unit_price: number;
    status: string;
    invoice_id: string | null;
    waybill: {
        id: string;
        waybill_no: string;
    } | null;
    rate_card: {
        id: string;
        name: string;
    } | null;
    invoice: {
        id: string;
        invoice_no: string;
        status: string;
        total_amount: number;
    } | null;
    sender_account: {
        id: string;
        name: string;
        sender_code: string;
    } | null;
    contractor: {
        id: string;
        name: string;
    } | null;
}
interface CreateBillingRequest {
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
interface UpdateBillingRequest {
    name?: string;
    quantity?: number;
    status?: BillingStatus;
}
interface ListBillingsParams extends PaginationParams, DateRangeParams {
    contractor_id?: string;
    subcontractor_id?: string;
    rate_card_id?: string;
    status?: BillingStatus;
    invoice_id?: string;
}
interface BillingEmailRequest {
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
type InvoiceStatus = 'draft' | 'issued' | 'payment_processing' | 'partially_paid' | 'paid' | 'overdue' | 'canceled' | 'disputed';
interface InvoiceLineItem {
    id: string;
    billing_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    amount: number;
    waybill_no?: string;
}
interface Invoice {
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
interface CreateInvoiceRequest {
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
interface UpdateInvoiceRequest {
    status?: InvoiceStatus;
    notes?: string;
    payment_terms?: string;
    tax_rate?: number;
    discount_amount?: number;
}
interface ListInvoicesParams extends PaginationParams {
    contractor_id?: string;
    subcontractor_id?: string;
    status?: InvoiceStatus;
    issue_date_from?: string;
    issue_date_to?: string;
    due_date_from?: string;
    due_date_to?: string;
}
interface IssueInvoiceRequest {
    due_date?: string;
    issue_date?: string;
}
interface SendInvoiceEmailRequest {
    recipient_email: string;
    cc_emails?: string[];
    subject?: string;
    message?: string;
}
/** @deprecated Use SendInvoiceEmailRequest instead */
type SendEmailRequest = SendInvoiceEmailRequest;
/**
 * Payment lifecycle status. Mirrors the database enum (the `payments_status_check`
 * constraint plus the `processing` value the payment service uses for in-flight
 * bank-transfer/FlashPay verification). The previous `verified`/`rejected` values
 * never existed in the database and have been removed.
 */
type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'canceled';
type PaymentMethod = 'bank_transfer' | 'flashpay' | 'wallet';
interface PaymentAllocation {
    id: string;
    payment_id?: string;
    invoice_id: string;
    invoice_no?: string;
    amount: number;
    created_at?: string;
}
interface Payment {
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
interface CreatePaymentRequest {
    amount: number;
    payment_method: PaymentMethod;
    payment_date: string;
    notes?: string;
    allocations: Array<{
        invoice_id: string;
        amount: number;
    }>;
    /** Payer org (required for B2B) */
    contractor_id?: string;
    /** Payer sender account (required for B2C) */
    sender_account_id?: string;
}
interface UpdatePaymentRequest {
    status?: PaymentStatus;
    notes?: string;
    reference_no?: string;
}
interface ListPaymentsParams extends PaginationParams {
    contractor_id?: string;
    subcontractor_id?: string;
    sender_account_id?: string;
    invoice_id?: string;
    status?: PaymentStatus;
    payment_method?: PaymentMethod;
    from_date?: string;
    to_date?: string;
}
interface ReplaceAllocationsRequest {
    allocations: Array<{
        invoice_id: string;
        amount: number;
    }>;
}
interface BankSlip {
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
interface CreateBankSlipRequest {
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
interface VerifyBankSlipRequest {
    verified: boolean;
    verification_notes?: string;
}
/**
 * An organization's receiving account, as a PAYER may see it.
 *
 * Only the fields needed to actually make a transfer. The operator's label, the
 * account's monthly cap, its notes and its statement mapping are internal and
 * never cross this boundary.
 */
interface PublicBankAccount {
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
interface BankTransferInstructions {
    reference_code: string;
    account: PublicBankAccount;
    amount: number;
    currency: string;
    expires_at: string | null;
}
interface BankAccountAvailability {
    available: boolean;
    currency: string;
    /** `no_bank_account_available` when unavailable, else null. */
    reason: string | null;
}
type FlashPayType = 'qr' | 'app';
/** How a payer completes a method — the branch a client renders. */
type PaymentMode = 'qr' | 'deeplink' | 'wechat_applet' | 'manual_transfer' | 'settled';
/** Why an offered method cannot be used right now. */
type PaymentMethodUnavailableReason = 'not_configured' | 'no_bank_account_available' | 'insufficient_balance' | 'currency_unsupported' | 'no_sender_account' | 'unavailable';
interface AvailablePaymentMethod {
    name: PaymentMethod;
    /** Presentation shapes this method supports. */
    modes: PaymentMode[];
    available: boolean;
    /** Present only when `available` is false. */
    unavailable_reason?: PaymentMethodUnavailableReason;
}
interface PaymentMethodsResponse {
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
interface PaymentMethodsParams {
    invoice_id?: string;
    service_id?: string;
    sender_account_id?: string;
    amount?: number;
    currency?: string;
}
interface FlashPayRequest {
    amount: number;
    allocations: Array<{
        invoice_id: string;
        amount: number;
    }>;
    flashpay_type: FlashPayType;
    /** Required when flashpay_type is 'app' — Thai bank code */
    flashpay_bank_code?: string;
    description?: string;
    /** Payer org (optional — resolved from invoice if omitted) */
    contractor_id?: string;
    /** Payer sender account (optional — resolved from invoice if omitted) */
    sender_account_id?: string;
}
interface FlashPayQRResponse {
    id: string;
    qr_image: string;
    qr_raw_data: string;
    trade_no: string;
}
interface FlashPayAppResponse {
    id: string;
    deeplink_url: string;
    trade_no: string;
}
type FlashPayResponse = FlashPayQRResponse | FlashPayAppResponse;
type WalletTransactionType = 'topup' | 'debit' | 'refund' | 'adjust';
interface WalletBalance {
    wallet_id: string;
    sender_account_id: string;
    balance: number;
    currency: string;
}
interface WalletTransaction {
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
type WalletTopUpType = 'qr' | 'app' | 'wechat';
interface TopUpWalletRequest {
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
interface WalletTopUpQRResponse {
    type: 'qr';
    payment_id: string;
    trade_no: string;
    qr_image: string;
    qr_raw_data: string;
}
interface WalletTopUpAppResponse {
    type: 'app';
    payment_id: string;
    trade_no: string;
    deeplink_url: string;
}
/**
 * Params the mini-program passes to `wx.requestPayment`, mapped from FlashPay's
 * `wechatAppletParam`. `package` carries FlashPay's `prepayId`.
 */
interface WeChatAppletPaymentParams {
    time_stamp: string;
    nonce_str: string;
    package: string;
    sign_type: string;
    pay_sign: string;
}
interface WalletTopUpWeChatResponse {
    type: 'wechat';
    payment_id: string;
    trade_no: string;
    wechat_payment: WeChatAppletPaymentParams;
}
type WalletTopUpResponse = WalletTopUpQRResponse | WalletTopUpAppResponse | WalletTopUpWeChatResponse;
interface PayInvoiceWithWalletRequest {
    sender_account_id: string;
    invoice_id: string;
    /** Amount to debit. Defaults to the invoice's outstanding balance. */
    amount?: number;
}
interface PayInvoiceWithWalletResponse {
    payment_id: string;
    balance: number;
}
interface ListWalletTransactionsParams extends PaginationParams {
    sender_account_id: string;
    type?: WalletTransactionType;
}
interface WalletTransactionsResponse {
    data: WalletTransaction[];
    pagination: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}
/** Supported currency codes (ISO 4217) for the pricing chain. */
type CurrencyCode = 'THB' | 'USD' | 'CNY' | 'MYR' | 'SGD' | 'VND' | 'KZT';
interface RateCard {
    id: string;
    name: string;
    unit_price: number;
    /** Currency of unit_price. Defaults to "THB". */
    currency: CurrencyCode;
    billing_unit: 'kg' | 'cbm' | 'per_waybill' | 'per_package';
    service_id: string;
    service?: {
        id: string;
        name: string;
    };
    route_id?: string;
    /** Route leg this card prices. Matched independently of route_id, at higher priority. */
    route_leg_id?: string;
    contractor_id?: string;
    sender_account_type?: string;
    description?: string;
    created_at: string;
}
interface CreateRateCardRequest {
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
interface UpdateRateCardRequest {
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
interface ListRateCardsParams {
    service_id?: string;
    contractor_id?: string;
    route_id?: string;
    route_leg_id?: string;
}
interface SenderAccount {
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
interface CreateSenderAccountRequest {
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
interface UpdateSenderAccountRequest {
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
interface ListSenderAccountsParams {
    search?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
}
/** One row of a sender-account bulk import. */
interface ImportSenderAccountRow {
    name: string;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
    type?: string | null;
    /** The tenant's legacy code — the idempotency key for re-runnable imports. */
    slug?: string | null;
}
interface ImportSenderAccountsRequest {
    rows: ImportSenderAccountRow[];
}
interface ImportSenderAccountsResponse {
    created: number;
    updated: number;
    failed: number;
    errors: Array<{
        row: number;
        slug?: string | null;
        message: string;
    }>;
}
interface SenderAccountOwnershipRequest {
    /** The sender account code read from a package label. */
    sender_account_code: string;
}
interface SenderAccountOwnershipResponse {
    /** The `api_key` of the organization that owns the sender account. */
    api_key: string;
}
type AddressType = 'pickup' | 'return' | 'billing' | 'warehouse';
interface SenderAccountRecipient {
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
interface CreateSenderAccountRecipientAddress {
    original_address?: string;
    street_line?: string;
    block_floor_room?: string;
    city?: string;
    state?: string;
    town?: string;
    zip_code?: string;
    country?: string;
}
interface CreateSenderAccountRecipientRequest {
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
interface UpdateSenderAccountRecipientRequest {
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
interface ListSenderAccountRecipientsParams {
    is_active?: boolean;
}
type BillingType = 'consolidated' | 'transactional';
type BillingCycle = 'weekly' | 'biweekly' | 'monthly' | 'custom';
type PaymentTerms = 'due_on_receipt' | 'net_7' | 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'net_90' | 'custom';
interface BillingProfile {
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
interface CreateBillingProfileRequest {
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
interface UpdateBillingProfileRequest {
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
interface ListBillingProfilesParams extends PaginationParams {
    contractor_id?: string;
    sender_account_id?: string;
    billing_type?: BillingType;
    billing_cycle?: BillingCycle;
    is_active?: boolean;
}
type CycleRunStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
interface BillingCycleRun {
    id: string;
    billing_profile_id: string;
    status: CycleRunStatus;
    period_start: string;
    period_end: string;
    invoice_id?: string;
    error_message?: string;
    created_at: string;
}
interface ListCycleRunsParams extends PaginationParams {
    status?: CycleRunStatus;
}
interface TriggerCycleRequest {
    as_of_date?: string;
}
interface WaybillRouteUnitAddress {
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
interface WaybillRouteUnit {
    id: string;
    code: string;
    name: string;
    type: string;
    phone: string | null;
    email: string | null;
    address: WaybillRouteUnitAddress | null;
}
interface WaybillRouteLeg {
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
interface WaybillRoute {
    id: string;
    code: string;
    name: string;
    description: string | null;
    organization_id: string;
    created_at: string;
    updated_at: string;
    legs?: WaybillRouteLeg[];
}
interface WaybillRouteWithLegs extends WaybillRoute {
    legs: WaybillRouteLeg[];
}
interface ListWaybillRoutesParams {
    search?: string;
    page?: number;
    pageSize?: number;
}
type DeliveryEventType = 'draft' | 'created' | 'picked_up' | 'accepted' | 'delivering' | 'delivered' | 'failed' | 'exception' | 'canceled' | 'rescheduled' | 'returning' | 'returned' | 'in_transit_sorted' | 'in_transit_hub_inbound' | 'in_transit_hub_outbound';
/**
 * A cross-border milestone, recorded as one event type: transport_collecting →
 * picked_up, transport_originalport → in_transit_sorted, customs_finished and
 * transport_departed → in_transit_hub_outbound, transport_arrived →
 * in_transit_hub_inbound, transport_finished → in_transit_sorted,
 * transport_handover → delivered.
 */
type SecondaryEventType = 'transport_collecting' | 'transport_originalport' | 'customs_finished' | 'transport_departed' | 'transport_arrived' | 'transport_finished' | 'transport_handover';
interface DeliveryEvent {
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
interface CreateDeliveryEventRequest {
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
type PodUploadToken = {
    mode: 'server';
} | {
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
interface ReportDateRangeParams {
    date_from: string;
    date_to: string;
    format?: 'json' | 'csv';
}
interface BillingByServiceParams extends ReportDateRangeParams {
    contractor_id?: string;
}
interface BillingByServiceReport {
    date_from: string;
    date_to: string;
    data: Array<{
        service: string;
        service_id: string;
        quantity: number;
        amount: number;
    }>;
    totals: {
        quantity: number;
        amount: number;
    };
}
interface OutstandingInvoicesParams {
    contractor_id?: string;
    status?: 'issued' | 'overdue' | 'all';
    format?: 'json' | 'csv';
}
interface OutstandingInvoicesReport {
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
interface PaymentHistoryParams extends ReportDateRangeParams {
    contractor_id?: string;
    method?: PaymentMethod;
}
interface PaymentHistoryReport {
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
type ReportPeriod = 'daily' | 'weekly' | 'monthly';
interface RevenueSummaryParams extends ReportDateRangeParams {
    contractor_id?: string;
    period?: ReportPeriod;
}
interface RevenueSummaryReport {
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
interface RegionDistrict {
    name: string;
    code: string;
}
interface RegionCity {
    name: string;
    districts: RegionDistrict[];
}
interface RegionProvince {
    name: string;
    cities: RegionCity[];
}
interface RegionHierarchy {
    provinces: RegionProvince[];
}
interface ListRegionsParams {
    /** ISO country code, e.g. "TH" */
    country: string;
    /** Optional postal code to narrow the hierarchy */
    postal_code?: string;
}
/** Which geocoding strategy produced a resolved address. */
type GeocodeSource = 'google_geocoding' | 'google_places' | 'postal_centroid' | 'province_centroid';
/** Options shared by every address-resolution input mode. */
interface AddressResolveOptions {
    /** ISO alpha-2 country hint; scopes the geocoder's region bias and DB fallbacks. */
    country?: string;
    /**
     * Whether to persist an entry to the address_resolution_logs table.
     * Defaults to `true`; pass `false` to skip logging.
     */
    logResolution?: boolean;
}
/** Resolve free-text into structured address fields. */
interface AddressResolveByText extends AddressResolveOptions {
    address: string;
}
/** Resolve a Google-Maps pin / short link into coordinates. */
interface AddressResolveByUrl extends AddressResolveOptions {
    url: string;
}
/** Reverse-geocode a shared device location. */
interface AddressResolveByCoords extends AddressResolveOptions {
    lat: number;
    lng: number;
}
/**
 * Address-resolution request. Provide exactly one of `address`, `url`, or
 * `lat`+`lng`; the response shape is identical across all three modes.
 */
type AddressResolveRequest = AddressResolveByText | AddressResolveByUrl | AddressResolveByCoords;
/** Structured address returned by `client.address.resolve(...)`. */
interface ResolvedAddress {
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
interface Organization {
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
interface UpdateOrganizationRequest {
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
type OrganizationUnitType = 'branch' | 'warehouse' | 'office' | 'hub' | 'division' | 'department';
interface OrganizationUnit {
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
interface OrganizationUnitAddress {
    street_line?: string;
    block_floor_room?: string;
    city?: string;
    state?: string;
    town?: string;
    zip_code?: string;
    country?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
}
interface CreateOrganizationUnitRequest {
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
interface UpdateOrganizationUnitRequest {
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
interface ListOrganizationUnitsParams {
    search?: string;
    type?: OrganizationUnitType;
    is_active?: boolean;
    limit?: number;
    offset?: number;
}
interface ProductCategory {
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
interface ProductCategoryTreeNode extends ProductCategory {
    children: ProductCategoryTreeNode[];
}
interface CreateProductCategoryRequest {
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
interface UpdateProductCategoryRequest {
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
interface ListProductCategoriesParams {
    /** When true, returns the nested tree via {@link ProductCategoriesTreeResponse} instead of a flat list */
    tree?: boolean;
    search?: string;
    parent_id?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
}
/** Pickup / delivery address for a quote request. */
interface QuoteAddress {
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
interface QuoteItem {
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
type QuoteServiceType = 'ftl_transport' | 'ltl_transport';
interface CreateQuoteRequest {
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
    addons?: {
        key: string;
    }[];
}
/** One line of a quotation's price breakdown (base fare plus any add-ons). */
type QuoteBreakdownLine = {
    kind: 'base';
    amount: number;
} | {
    kind: 'addon';
    key: string;
    amount: number;
};
interface CreateQuoteResponse {
    quotation_id: string;
    request_id: string;
    /** Selected vehicle, or null when no vehicle dimension applies. */
    vehicle: {
        type: string;
        max_payload_kg: number;
    } | null;
    /**
     * Multi-vehicle composition — present (non-null) only when the cargo fits no
     * single vehicle and was split across a fleet (3PL/provider_markup only).
     * `estimated_total` is the sum of the per-vehicle `price` values.
     */
    vehicles: Array<{
        vehicle_type: string;
        price: number;
        items: Array<{
            name: string | null;
            qty: number;
        }>;
    }> | null;
    /** The quoted price (sum of per-vehicle prices for a composition). */
    estimated_total: number;
    /** Currency of `estimated_total` (ISO 4217). */
    currency: string;
    /** ISO-8601 timestamp after which the quote is no longer valid. */
    expires_at: string;
    /** Price breakdown: the base fare followed by any add-on lines. */
    breakdown: QuoteBreakdownLine[];
}
interface ShippingFeeDimensions {
    length_cm: number;
    width_cm: number;
    height_cm: number;
}
interface CreateShippingFeeRequest {
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
interface ShippingFeeBreakdownLine {
    label: string;
    amount: number;
}
interface ShippingFeeResponse {
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
/**
 * Language for localized API error messages, sent as the `Accept-Language`
 * header. The API supports English, Thai, and Chinese; any other value falls
 * back to English on the server. Only error messages are localized — response
 * shapes, HTTP status codes, and legacy numeric codes are unaffected.
 */
type TMSLanguage = 'en' | 'th' | 'zh' | (string & {});
interface TMSClientConfig {
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
interface TMSError {
    code: number;
    message: string;
    details?: unknown;
}

/**
 * Canonicalize a JSON object into a deterministic string representation.
 * Recursively sorts keys at all levels and removes whitespace.
 * Must match the server-side canonicalizeJson implementation.
 */
declare function canonicalizeJson(obj: unknown): string;
/**
 * The request signature: `HMAC-SHA256(apiSecret, canonicalJson(params without
 * sign))`, uppercase hex. Matches the server-side verification.
 *
 * Before 3.0 this function returned a bare SHA-256 that ignored the secret; that
 * scheme is gone — the TMS no longer accepts it.
 */
declare function generateSignature(params: Record<string, unknown>, apiSecret: string): Promise<string>;
/** @deprecated Same as {@link generateSignature}; kept for code written against 2.6/2.7. */
declare const generateKeyedSignature: typeof generateSignature;
/**
 * Verify a webhook signature from TMS.
 * Takes the parsed JSON body of the webhook request and validates the `sign` field
 * with `apiSecret` — the secret of the `api_key` in the body. A valid result
 * proves the request came from the TMS and was not altered.
 *
 * @param body - The parsed JSON body of the webhook request
 * @param options.apiSecret - Secret paired with the body's `api_key` (required)
 * @param options.maxAgeMs - Maximum age of the request in milliseconds (default: 5 minutes). Set to 0 to disable.
 * @returns Object with `valid` boolean and optional `error` message
 *
 * @example
 * ```typescript
 * import { verifyWebhookSignature } from '@alphacargo/tms-sdk';
 *
 * app.post('/webhooks/delivery-events', async (req, res) => {
 *   const result = await verifyWebhookSignature(req.body, { apiSecret: process.env.TMS_API_SECRET });
 *   if (!result.valid) {
 *     return res.status(401).json({ error: result.error });
 *   }
 *   // Process the verified webhook...
 *   res.json({ success: true });
 * });
 * ```
 */
declare function verifyWebhookSignature(body: Record<string, unknown>, options: {
    apiSecret: string;
    maxAgeMs?: number;
    /** @deprecated Ignored: the secret is always required since 3.0. */
    requireSecret?: boolean;
}): Promise<{
    valid: boolean;
    error?: string;
}>;
/**
 * Generate a random nonce string
 */
declare function generateNonce(length?: number): string;
/**
 * Get current Unix timestamp in seconds
 */
declare function getTimestamp(): number;
/**
 * TMS API Error class
 */
declare class TMSApiError extends Error {
    readonly code: number;
    readonly details?: unknown;
    readonly statusCode?: number;
    constructor(error: TMSError, statusCode?: number);
}
/**
 * HTTP client for making API requests
 */
declare class HttpClient {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly apiSecret;
    private readonly timeout;
    private readonly headers;
    private readonly debug;
    private language?;
    constructor(config: TMSClientConfig);
    /**
     * Set the preferred language for localized error messages (sent as the
     * `Accept-Language` header). Pass `undefined` to clear it (server defaults
     * to English).
     */
    setLanguage(language?: string): void;
    /**
     * Sign request body with HMAC signature
     */
    private signRequest;
    /**
     * Make HTTP request
     */
    request<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, options?: {
        body?: Record<string, unknown>;
        query?: Record<string, unknown>;
        sign?: boolean;
        /** Extra headers for this request only; they win over the client-wide ones. */
        headers?: Record<string, string>;
    }): Promise<T>;
    /**
     * GET request
     */
    get<T>(path: string, query?: Record<string, unknown>): Promise<T>;
    /**
     * POST request
     */
    post<T>(path: string, body?: Record<string, unknown>, headers?: Record<string, string>): Promise<T>;
    /**
     * PUT request
     */
    put<T>(path: string, body?: Record<string, unknown>): Promise<T>;
    /**
     * PATCH request
     */
    patch<T>(path: string, body?: Record<string, unknown>): Promise<T>;
    /**
     * DELETE request
     */
    delete<T>(path: string, body?: Record<string, unknown>): Promise<T>;
    /**
     * GET request with signature (for authenticated GET endpoints).
     *
     * All parameter values are coerced to strings before signing because
     * query-string parameters are always strings after URL parsing on the
     * server. Without this the canonical JSON would differ (e.g. `"page":1`
     * vs `"page":"1"`) and the signature would not match.
     */
    getWithSignature<T>(path: string, params?: Record<string, unknown>): Promise<T>;
}

/**
 * Waybills resource for managing shipping orders
 */
declare class Waybills {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * List waybills with optional filters and pagination
     *
     * @param params - Optional filter and pagination parameters
     * @returns Paginated list of waybill summaries
     *
     * @example
     * ```typescript
     * // List all waybills
     * const result = await client.waybills.list();
     * console.log(result.data); // WaybillSummary[]
     * console.log(result.total); // Total count
     *
     * // With filters
     * const filtered = await client.waybills.list({
     *   search: 'TH24020001,TH24020002',
     *   statuses: 'created,accepted',
     *   page: 1,
     *   pageSize: 50,
     *   date_from: '2026-01-01',
     *   route_id: 'route-uuid'
     * });
     * ```
     */
    list(params?: WaybillListParams): Promise<PaginatedResponse<WaybillSummary>>;
    /**
     * Count waybills grouped by the service resolved from the requesting org's
     * delegation. Aggregated server-side, so a caller can learn how many distinct
     * services a filtered set of waybills spans (and the per-service count) without
     * paging every row.
     *
     * @param params - Same filters as {@link list}, minus pagination
     * @returns One row per service: `{ service_id, service_name, count }`
     *          (service_id/service_name null for waybills with no delegation)
     *
     * @example
     * ```typescript
     * const counts = await client.waybills.countByService({
     *   route_id: 'route-uuid',
     *   statuses: 'delivered',
     *   sender_account_code: 'SND-001',
     * });
     * // [{ service_id: '…', service_name: '陆运', count: 3 }, …]
     * ```
     */
    countByService(params?: WaybillServiceCountParams): Promise<WaybillServiceCount[]>;
    /**
     * Get waybill details by waybill number
     *
     * @param waybillNo - Waybill number or external waybill number
     * @returns Full waybill details including packages, recipient, delegations,
     *          additional (add-on) services, billings, etc. For a master waybill,
     *          `billings` merges the master's own billings with its sub-waybills'
     *          billings (canceled excluded) — the same set `getBillings()`
     *          returns — so a separate call isn't needed.
     *
     * @example
     * ```typescript
     * const waybill = await client.waybills.get('TH24020001');
     * console.log(waybill.status); // 'accepted'
     * console.log(waybill.packages); // Package details
     * console.log(waybill.recipient?.name); // 'John Doe'
     * console.log(waybill.billings?.[0]?.amount); // 150
     * ```
     */
    get(waybillNo: string): Promise<WaybillDetails>;
    /**
     * Create a new waybill (shipping order)
     *
     * @param data - Waybill creation data
     * @returns Created waybill with tracking information
     *
     * @example
     * ```typescript
     * const waybill = await client.waybills.create({
     *   outTradeNo: 'ORDER-2024-001',
     *   owner: 'warehouse-a',
     *   senderName: 'Acme Warehouse',
     *   senderPhone: '0212345678',
     *   senderCityName: 'Bangkok',
     *   senderDistrictName: 'Watthana',
     *   senderPostCode: '10110',
     *   senderAddress: '123 Sukhumvit Road',
     *   receiverName: 'John Doe',
     *   receiverPhone: '0812345678',
     *   receiverProvinceName: 'Bangkok',
     *   receiverCityName: 'Bangkok',
     *   receiverDistrictName: 'Chatuchak',
     *   receiverPostCode: '10900',
     *   receiverAddress: '456 Phaholyothin Road',
     *   parcelList: [{
     *     outParcelNo: 'PKG-001',
     *     itemDesc: 'Electronics',
     *     itemValue: 1500,
     *     productList: [{ name: 'Wireless Mouse', sku: 'SKU-001', quantity: 2 }]
     *   }]
     * });
     * console.log(waybill.waybill_no); // 'TH24020001'
     * ```
     */
    create(data: CreateWaybillRequest, options?: CreateWaybillOptions): Promise<CreateWaybillResponse>;
    /**
     * Cancel a waybill
     *
     * @param waybillNo - Waybill number or external waybill number
     *
     * @example
     * ```typescript
     * await client.waybills.cancel('TH24020001');
     * ```
     */
    cancel(waybillNo: string): Promise<{
        message: string;
    }>;
    /**
     * Update waybill fields
     *
     * @param waybillNo - Waybill number or external waybill number
     * @param data - Fields to update
     * @returns Updated waybill details
     *
     * @example
     * ```typescript
     * const waybill = await client.waybills.update('TH24020001', {
     *   reference_no: 'PO-12345',
     *   notes: 'Handle with care',
     *   tags: ['fragile', 'priority'],
     * });
     * ```
     */
    update(waybillNo: string, data: UpdateWaybillRequest): Promise<WaybillDetails>;
    /**
     * Get tracking events for a waybill
     *
     * @param waybillNo - Waybill number
     * @returns Tracking events and status
     *
     * @example
     * ```typescript
     * const events = await client.waybills.getEvents('TH24020001');
     * console.log(events.state); // 'delivered'
     * console.log(events.routes); // Array of tracking events
     * ```
     */
    getEvents(waybillNo: string): Promise<WaybillEvents>;
    /**
     * Get billing records for a waybill, joined with rate card, invoice, sender
     * account and contractor. For a master waybill this includes the billings from
     * its sub-waybills (which carry the per-leg transport charges). Canceled
     * billings are excluded.
     *
     * @param waybillNoOrId - Waybill id (UUID), waybill number, or external waybill number
     * @returns Array of billing records
     *
     * @example
     * ```typescript
     * const billings = await client.waybills.getBillings('TH24020001');
     * console.log(billings[0].amount); // 150
     * console.log(billings[0].invoice?.invoice_no); // 'INV-0001'
     *
     * // Also accepts a waybill id (UUID)
     * await client.waybills.getBillings('a0f41ca5-d350-401f-a557-831084fc7ccc');
     * ```
     */
    getBillings(waybillNoOrId: string): Promise<WaybillBillingRecord[]>;
    /**
     * Get shipping label for a waybill (PDF)
     *
     * @param waybillNo - Waybill number
     * @param params - Optional label params (e.g. packageId for a specific package)
     * @returns Label as ArrayBuffer (PDF)
     *
     * @example
     * ```typescript
     * const label = await client.waybills.getLabel('TH24020001');
     * fs.writeFileSync('label.pdf', Buffer.from(label));
     *
     * // Get label for a specific package
     * const pkgLabel = await client.waybills.getLabel('TH24020001', { packageId: 'pkg-uuid' });
     * ```
     */
    getLabel(waybillNo: string, params?: GetLabelParams): Promise<ArrayBuffer>;
    /**
     * Generate a merged PDF with labels for multiple waybills
     *
     * @param waybillNos - Array of waybill numbers (max 100)
     * @returns Merged PDF as ArrayBuffer
     *
     * @example
     * ```typescript
     * const pdf = await client.waybills.getBatchLabel(['TH24020001', 'TH24020002']);
     * fs.writeFileSync('labels.pdf', Buffer.from(pdf));
     * ```
     */
    getBatchLabel(waybillNos: string[]): Promise<ArrayBuffer>;
    /**
     * Add a package to an existing waybill
     *
     * @param waybillNo - Waybill number
     * @param data - Package data
     * @returns Created package information
     *
     * @example
     * ```typescript
     * const pkg = await client.waybills.addPackage('TH24020001', {
     *   parcel: {
     *     outParcelNo: 'PKG-002',
     *     itemDesc: 'Keyboards',
     *     weight: 2.5,
     *     productList: [{ name: 'Keyboard', sku: 'SKU-002', quantity: 1 }],
     *   },
     * });
     * console.log(pkg.package_no); // 'TH24020001-002'
     * ```
     */
    addPackage(waybillNo: string, data: AddPackageRequest): Promise<AddPackageResponse>;
    /**
     * Reserve the next waybill number in the organization's configured format
     * WITHOUT creating a waybill. Used to mint a number for a loose, barcode-less
     * package so a scannable label can be printed before the package is
     * inbounded; the number later arrives as the package's external reference
     * (outTradeNo) at inbound.
     *
     * Requires the organization to have enabled custom waybill numbering in its
     * settings — otherwise the call fails with a 409.
     *
     * @returns The allocated number, e.g. `{ number: 'ABC1A748213905' }`
     *
     * @example
     * ```typescript
     * const { number } = await client.waybills.allocateNumber();
     * console.log(number); // 'ABC1A748213905'
     * ```
     */
    allocateNumber(): Promise<AllocateWaybillNumberResponse>;
    /**
     * Split one package on a waybill into multiple packages — the misoperation
     * recovery for a lot (piece_count > 1) that actually holds NON-identical items.
     * Each part becomes its own package (piece_count 1); the original combined
     * package is canceled and the waybill totals are recomputed.
     *
     * @param waybillNo - Waybill number or external waybill number
     * @param packageNo - The combined package's number to split
     * @param data - The parts (at least two) to split into
     *
     * @example
     * ```typescript
     * await client.waybills.splitPackage('TH24020001', 'TH24020001A1', {
     *   parts: [
     *     { weight: 2, length: 10, width: 10, height: 10 },
     *     { weight: 3, length: 20, width: 15, height: 12 },
     *   ],
     * });
     * ```
     */
    splitPackage(waybillNo: string, packageNo: string, data: SplitPackageRequest): Promise<SplitPackageResponse>;
    /**
     * Update a package, e.g. at warehouse inbound: measured weight and
     * dimensions, description, photos, cargo handling. Only the fields sent
     * change; works in any waybill status. A weight/dimension change recomputes
     * the waybill totals and re-prices its charges.
     *
     * @param waybillNo - Waybill number or external waybill number
     * @param packageNo - The package number or its external number (outParcelNo)
     * @param data - weight (kg), length/width/height (cm), itemDesc, photos
     *   (appended to the list), load_properties; at least one
     *
     * @example
     * ```typescript
     * await client.waybills.updatePackage('TH24020001', 'TH24020001A1', {
     *   weight: 3.2, length: 30, width: 25, height: 12,
     *   photos: ['https://example.com/inbound/1.jpg'],
     * });
     * ```
     */
    updatePackage(waybillNo: string, packageNo: string, data: UpdatePackageRequest): Promise<UpdatePackageResponse>;
    /**
     * List additional services for a waybill
     *
     * @param waybillNo - Waybill number
     * @returns Array of additional services
     *
     * @example
     * ```typescript
     * const services = await client.waybills.listAdditionalServices('TH24020001');
     * console.log(services); // [{ id: '...', status: 'pending', ... }]
     * ```
     */
    listAdditionalServices(waybillNo: string): Promise<AdditionalService[]>;
    /**
     * Add additional services to a waybill
     *
     * @param waybillNo - Waybill number
     * @param serviceIds - Array of service UUIDs to add
     * @returns Created additional services
     *
     * @example
     * ```typescript
     * await client.waybills.addAdditionalServices('TH24020001', ['service-uuid-1', 'service-uuid-2']);
     * ```
     */
    addAdditionalServices(waybillNo: string, serviceIds: string[]): Promise<AdditionalService[]>;
    /**
     * Update an additional service status
     *
     * @param waybillNo - Waybill number
     * @param serviceId - Additional service record ID
     * @param data - Status and optional result data
     *
     * @example
     * ```typescript
     * await client.waybills.updateAdditionalService('TH24020001', 'service-record-id', {
     *   status: 'completed',
     *   result: { photo_urls: ['https://...'] }
     * });
     * ```
     */
    updateAdditionalService(waybillNo: string, serviceId: string, data: UpdateAdditionalServiceRequest): Promise<AdditionalService>;
    /**
     * Remove an additional service from a waybill. This triggers a billing
     * recalculation that cancels the corresponding billing line item.
     *
     * @param waybillNo - Waybill number
     * @param serviceId - Additional service record ID
     *
     * @example
     * ```typescript
     * await client.waybills.removeAdditionalService('TH24020001', 'service-record-id');
     * ```
     */
    removeAdditionalService(waybillNo: string, serviceId: string): Promise<void>;
    /**
     * Create a consolidated waybill from multiple source waybills
     *
     * @param data - Consolidation request data
     * @returns Master waybill and sub-waybills
     *
     * @example
     * ```typescript
     * const result = await client.waybills.consolidate({
     *   waybill_ids: ['uuid-1', 'uuid-2'],
     *   external_waybill_no: 'CONSOL-001',
     *   sender: { id: 'sender-uuid' },
     *   recipient: {
     *     name: 'John Doe',
     *     phone: '0812345678',
     *     address: {
     *       street_line: '456 Road',
     *       city: 'Bangkok',
     *       state: 'Bangkok',
     *       zip_code: '10900'
     *     }
     *   },
     *   service_id: 'service-uuid'
     * });
     * console.log(result.masterWaybill.waybill_no);
     * ```
     */
    consolidate(data: ConsolidateWaybillsRequest): Promise<ConsolidateWaybillsResponse>;
    /**
     * Get tracking routes in legacy format (for Hisense integration)
     *
     * @param waybillNo - Waybill number
     * @returns Tracking routes with numeric state codes
     */
    getRoutes(waybillNo: string): Promise<WaybillEvents>;
    /**
     * OCR a package label photo via Baidu OCR — returns the full recognized text
     * and the 5-letter sender-account code parsed from it. Stateless — persists
     * nothing; pass the returned `code` to `create()` via `sender_account.code`
     * to set the sender account.
     *
     * Requires a Baidu OCR integration configured for the organization. The OCR
     * tier (standard vs high-accuracy) is chosen from the destination `country`.
     *
     * @param params - Image (imageUrl or imageBase64) and optional destination country
     * @returns The recognized text, extracted code, confidence and OCR tier used
     *
     * @example
     * ```typescript
     * const ocr = await client.waybills.extractPackageLabel({
     *   imageUrl: 'https://cdn/photo.jpg',
     *   country: 'TH',
     * });
     * if (ocr.data?.code) {
     *   await client.waybills.create({ ...waybill, sender_account: { code: ocr.data.code } });
     * }
     * ```
     */
    extractPackageLabel(params: PackageLabelOcrParams): Promise<PackageLabelOcrResponse>;
}

/**
 * Billing resource for managing billing records
 */
declare class Billings {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * List billing records with optional filters
     *
     * @param params - Query parameters for filtering
     * @returns Paginated list of billing records
     *
     * @example
     * ```typescript
     * const billings = await client.billings.list({
     *   status: 'pending',
     *   date_from: '2024-01-01',
     *   date_to: '2024-01-31',
     *   page: 1,
     *   pageSize: 20
     * });
     * console.log(billings.data); // Array of billing records
     * console.log(billings.total); // Total count
     * ```
     */
    list(params?: ListBillingsParams): Promise<PaginatedResponse<BillingRecord>>;
    /**
     * Get a single billing record by ID
     *
     * @param id - Billing record ID
     * @returns Billing record details
     *
     * @example
     * ```typescript
     * const billing = await client.billings.get('uuid-here');
     * console.log(billing.amount);
     * ```
     */
    get(id: string): Promise<BillingRecord>;
    /**
     * Create a new billing record
     *
     * @param data - Billing creation data
     * @returns Created billing record
     *
     * @example
     * ```typescript
     * const billing = await client.billings.create({
     *   rate_card_id: 'rate-card-uuid',
     *   contractor_id: 'contractor-uuid',
     *   waybill_id: 'waybill-uuid',
     *   quantity: 1
     * });
     * ```
     */
    create(data: CreateBillingRequest): Promise<BillingRecord>;
    /**
     * Update a billing record
     *
     * @param id - Billing record ID
     * @param data - Fields to update (name, quantity, status)
     * @returns Updated billing record
     */
    update(id: string, data: UpdateBillingRequest): Promise<BillingRecord>;
    /**
     * Delete a billing record
     *
     * @param id - Billing record ID
     */
    delete(id: string): Promise<void>;
    /**
     * Send billing records via email as CSV attachment
     *
     * @param data - Email request with recipient and optional filters or billing IDs
     *
     * @example
     * ```typescript
     * // Send specific billings
     * await client.billings.sendEmail({
     *   recipient_email: 'finance@example.com',
     *   billing_ids: ['billing-id-1', 'billing-id-2'],
     *   subject: 'Billing Statement',
     *   message: 'Please find attached.'
     * });
     *
     * // Send filtered billings
     * await client.billings.sendEmail({
     *   recipient_email: 'finance@example.com',
     *   filter: {
     *     contractor_id: 'contractor-uuid',
     *     date_from: '2024-01-01',
     *     date_to: '2024-01-31'
     *   }
     * });
     * ```
     */
    sendEmail(data: BillingEmailRequest): Promise<{
        success: boolean;
        message: string;
        records_count: number;
        total_amount: number;
    }>;
}

/**
 * Invoices resource for managing invoices
 */
declare class Invoices {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * List invoices with optional filters
     *
     * @param params - Query parameters for filtering
     * @returns Paginated list of invoices
     *
     * @example
     * ```typescript
     * const invoices = await client.invoices.list({
     *   status: 'issued',
     *   contractor_id: 'contractor-uuid',
     *   page: 1,
     *   pageSize: 20
     * });
     * ```
     */
    list(params?: ListInvoicesParams): Promise<PaginatedResponse<Invoice>>;
    /**
     * Get a single invoice by ID
     *
     * @param id - Invoice ID
     * @returns Invoice details with line items
     *
     * @example
     * ```typescript
     * const invoice = await client.invoices.get('invoice-uuid');
     * console.log(invoice.invoice_no); // 'INV-2024-001'
     * console.log(invoice.line_items); // Array of line items
     * ```
     */
    get(id: string): Promise<Invoice>;
    /**
     * Create a new invoice
     *
     * @param data - Invoice creation data
     * @returns Created invoice
     *
     * @example
     * ```typescript
     * // Create as draft (default)
     * const draft = await client.invoices.create({
     *   contractor_id: 'contractor-uuid',
     *   period_start: '2024-01-01',
     *   period_end: '2024-01-31',
     *   billing_ids: ['billing-1', 'billing-2'],
     * });
     *
     * // Create and issue in one step
     * const issued = await client.invoices.create({
     *   contractor_id: 'contractor-uuid',
     *   period_start: '2024-01-01',
     *   period_end: '2024-01-31',
     *   billing_ids: ['billing-1', 'billing-2'],
     *   status: 'issued',
     * });
     *
     * // Idempotent: hand back the invoice these lines are already on
     * const invoice = await client.invoices.create({ ..., reuse_existing: true });
     * if (invoice.reused) console.log('already invoiced as', invoice.invoice_no);
     * ```
     *
     * @throws TMSApiError with `statusCode` 409 when the lines already belong to
     * an invoice and neither `reuse_existing` nor `supersede_existing` applies.
     * `details.code` is a stable slug (`billings_already_invoiced`,
     * `billings_span_multiple_invoices`, `invoice_not_supersedable`,
     * `billings_already_settled`) and `details.invoices` lists the invoices
     * involved with their id, number and status — no message parsing needed.
     */
    create(data: CreateInvoiceRequest): Promise<Invoice>;
    /**
     * Update an invoice
     *
     * @param id - Invoice ID
     * @param data - Fields to update
     * @returns Updated invoice
     *
     * @example
     * ```typescript
     * await client.invoices.update('invoice-uuid', {
     *   status: 'canceled',
     *   notes: 'Invoice canceled due to order cancellation'
     * });
     * ```
     */
    update(id: string, data: UpdateInvoiceRequest): Promise<Invoice>;
    /**
     * Delete an invoice (only draft invoices can be deleted)
     *
     * @param id - Invoice ID
     */
    delete(id: string): Promise<void>;
    /**
     * Issue an invoice (change status from draft to issued)
     *
     * @param id - Invoice ID
     * @param data - Optional issue date and due date
     * @returns Updated invoice with issue date
     *
     * @example
     * ```typescript
     * const issued = await client.invoices.issue('invoice-uuid', {
     *   due_date: '2024-03-01'
     * });
     * console.log(issued.data.status); // 'issued'
     * ```
     */
    issue(id: string, data?: IssueInvoiceRequest): Promise<{
        success: boolean;
        message: string;
        data: Invoice;
    }>;
    /**
     * Send invoice via email as PDF attachment
     *
     * @param id - Invoice ID
     * @param data - Email details
     *
     * @example
     * ```typescript
     * await client.invoices.sendEmail('invoice-uuid', {
     *   recipient_email: 'billing@customer.com',
     *   cc_emails: ['accounts@customer.com'],
     *   subject: 'Invoice INV-2024-001',
     *   message: 'Please find your invoice attached.'
     * });
     * ```
     */
    sendEmail(id: string, data: SendInvoiceEmailRequest): Promise<{
        success: boolean;
        message: string;
        invoice_no: string;
    }>;
    /**
     * Add billing records as line items to an invoice
     *
     * @param id - Invoice ID
     * @param billingIds - Array of billing record IDs
     *
     * @example
     * ```typescript
     * await client.invoices.addLineItems('invoice-uuid', ['billing-1', 'billing-2']);
     * ```
     */
    addLineItems(id: string, billingIds: string[]): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Remove billing records from an invoice
     *
     * @param id - Invoice ID
     * @param billingIds - Array of billing record IDs to remove
     */
    removeLineItems(id: string, billingIds: string[]): Promise<{
        success: boolean;
        message: string;
    }>;
}

/**
 * Payments resource for managing payments
 */
declare class Payments {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * List payments with optional filters
     *
     * @param params - Query parameters for filtering
     * @returns Paginated list of payments
     *
     * @example
     * ```typescript
     * const payments = await client.payments.list({
     *   status: 'completed',
     *   invoice_id: 'invoice-uuid',
     *   from_date: '2024-01-01',
     *   to_date: '2024-01-31',
     *   page: 1,
     *   pageSize: 20
     * });
     * ```
     */
    list(params?: ListPaymentsParams): Promise<PaginatedResponse<Payment>>;
    /**
     * Get a single payment by ID
     *
     * @param id - Payment ID
     * @returns Payment details with allocations
     *
     * @example
     * ```typescript
     * const payment = await client.payments.get('payment-uuid');
     * console.log(payment.allocations); // Invoice allocations
     * ```
     */
    get(id: string): Promise<Payment>;
    /**
     * Create a new payment
     *
     * @param data - Payment creation data
     * @returns Created payment
     *
     * @example
     * ```typescript
     * const payment = await client.payments.create({
     *   amount: 5000,
     *   payment_method: 'bank_transfer',
     *   payment_date: '2024-02-01',
     *   contractor_id: 'contractor-uuid',
     *   allocations: [
     *     { invoice_id: 'invoice-1', amount: 3000 },
     *     { invoice_id: 'invoice-2', amount: 2000 }
     *   ]
     * });
     * ```
     */
    create(data: CreatePaymentRequest): Promise<Payment>;
    /**
     * Update a payment
     *
     * @param id - Payment ID
     * @param data - Fields to update
     * @returns Updated payment
     *
     * @example
     * ```typescript
     * await client.payments.update('payment-uuid', {
     *   status: 'completed',
     *   reference_no: 'BANK-REF-123'
     * });
     * ```
     */
    update(id: string, data: UpdatePaymentRequest): Promise<Payment>;
    /**
     * Delete a payment
     *
     * @param id - Payment ID
     */
    delete(id: string): Promise<void>;
    /**
     * Get allocations for a payment
     *
     * @param id - Payment ID
     * @returns Array of payment allocations
     */
    getAllocations(id: string): Promise<PaymentAllocation[]>;
    /**
     * Replace all allocations for a payment
     *
     * @param id - Payment ID
     * @param allocations - New allocations to set
     *
     * @example
     * ```typescript
     * await client.payments.replaceAllocations('payment-uuid', [
     *   { invoice_id: 'invoice-1', amount: 3000 },
     *   { invoice_id: 'invoice-2', amount: 2000 }
     * ]);
     * ```
     */
    replaceAllocations(id: string, allocations: Array<{
        invoice_id: string;
        amount: number;
    }>): Promise<{
        success: boolean;
    }>;
    /**
     * Create a payment allocation
     *
     * @param id - Payment ID
     * @param invoiceId - Invoice ID to allocate to
     * @param amount - Allocation amount
     * @returns Created allocation
     * @deprecated Use replaceAllocations instead
     */
    createAllocation(id: string, invoiceId: string, amount: number): Promise<PaymentAllocation>;
    /**
     * Get bank slip for a payment
     *
     * @param id - Payment ID
     * @returns Bank slip or null if none exists
     *
     * @example
     * ```typescript
     * const slip = await client.payments.getSlip('payment-uuid');
     * if (slip) {
     *   console.log(slip.slip_url);
     * }
     * ```
     */
    getSlip(id: string): Promise<BankSlip | null>;
    /**
     * Upload bank slip metadata for a payment
     *
     * @param id - Payment ID
     * @param data - Bank slip data
     * @returns Created bank slip
     *
     * @example
     * ```typescript
     * const slip = await client.payments.uploadSlip('payment-uuid', {
     *   slip_url: 'https://storage.example.com/slips/123.jpg',
     *   bank_name: 'Bangkok Bank',
     *   transfer_date: '2024-02-01',
     *   transfer_amount: 5000,
     *   transfer_reference: 'REF-123'
     * });
     * ```
     */
    uploadSlip(id: string, data: CreateBankSlipRequest): Promise<BankSlip>;
    /**
     * Verify or reject a bank slip
     *
     * @param id - Payment ID
     * @param data - Verification data
     *
     * @example
     * ```typescript
     * await client.payments.verifySlip('payment-uuid', {
     *   verified: true,
     *   verification_notes: 'Slip verified successfully'
     * });
     * ```
     */
    verifySlip(id: string, data: VerifyBankSlipRequest): Promise<{
        success: boolean;
    }>;
    /**
     * Initiate a FlashPay payment (QR code or mobile banking)
     *
     * @param data - FlashPay request data
     * @returns QR code data or deeplink URL depending on flashpay_type
     *
     * @example
     * ```typescript
     * // QR code payment
     * const qr = await client.payments.initiateFlashPay({
     *   amount: 5000,
     *   flashpay_type: 'qr',
     *   contractor_id: 'contractor-uuid',
     *   allocations: [{ invoice_id: 'invoice-1', amount: 5000 }]
     * });
     * if ('qr_image' in qr) {
     *   console.log(qr.qr_image); // Base64 QR image
     * }
     *
     * // Mobile banking payment
     * const app = await client.payments.initiateFlashPay({
     *   amount: 5000,
     *   flashpay_type: 'app',
     *   flashpay_bank_code: 'bbl',
     *   contractor_id: 'contractor-uuid',
     *   allocations: [{ invoice_id: 'invoice-1', amount: 5000 }]
     * });
     * if ('deeplink_url' in app) {
     *   console.log(app.deeplink_url);
     * }
     * ```
     */
    initiateFlashPay(data: FlashPayRequest): Promise<FlashPayResponse>;
    /**
     * Generate a FlashPay QR code for payment
     * @deprecated Use initiateFlashPay instead
     */
    generateFlashPayQR(data: FlashPayRequest): Promise<FlashPayResponse>;
    /**
     * Which payment methods may be used for a payment, and which of them will
     * actually work right now.
     *
     * Render your payment picker from this rather than a hardcoded list: the
     * organization decides which methods it accepts, and a service can narrow
     * that further. Methods that cannot be used come back `available: false` with
     * a reason, so show them greyed out rather than hiding them.
     *
     * Availability is advisory — it can change between this call and the payment.
     *
     * @example
     * ```typescript
     * const { methods, default: preselect } = await client.payments.methods({
     *   invoice_id: 'invoice-uuid',
     *   amount: 1500,
     *   currency: 'THB',
     * });
     * ```
     */
    methods(params?: PaymentMethodsParams): Promise<PaymentMethodsResponse>;
}

/**
 * RateCards resource for managing rate cards
 */
declare class RateCards {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * List rate cards with optional filters
     *
     * @param params - Query parameters for filtering
     * @returns Array of rate cards
     *
     * @example
     * ```typescript
     * const rateCards = await client.rateCards.list({
     *   service_id: 'service-uuid'
     * });
     * ```
     */
    list(params?: ListRateCardsParams): Promise<RateCard[]>;
    /**
     * Get a single rate card by ID
     *
     * @param id - Rate card ID
     * @returns Rate card details
     *
     * @example
     * ```typescript
     * const rateCard = await client.rateCards.get('rate-card-uuid');
     * console.log(rateCard.unit_price); // 50.00
     * ```
     */
    get(id: string): Promise<RateCard>;
    /**
     * Create a new rate card
     *
     * @param data - Rate card creation data
     * @returns Created rate card
     *
     * @example
     * ```typescript
     * const rateCard = await client.rateCards.create({
     *   name: 'Express Delivery',
     *   unit_price: 75.00,
     *   service_id: 'service-uuid',
     *   description: 'Same-day delivery rate'
     * });
     * ```
     */
    create(data: CreateRateCardRequest): Promise<RateCard>;
    /**
     * Update a rate card
     *
     * @param id - Rate card ID
     * @param data - Fields to update
     * @returns Updated rate card
     *
     * @example
     * ```typescript
     * await client.rateCards.update('rate-card-uuid', {
     *   unit_price: 80.00,
     *   name: 'Premium Express Delivery'
     * });
     * ```
     */
    update(id: string, data: UpdateRateCardRequest): Promise<RateCard>;
    /**
     * Delete a rate card
     *
     * @param id - Rate card ID
     */
    delete(id: string): Promise<void>;
}

interface ListSenderAccountsResponse {
    data: SenderAccount[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}
/**
 * SenderAccounts resource for managing sender accounts
 */
declare class SenderAccounts {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * List sender accounts with optional filters
     *
     * @param params - Query parameters for filtering
     * @returns Paginated list of sender accounts
     *
     * @example
     * ```typescript
     * const accounts = await client.senderAccounts.list({
     *   search: 'Acme',
     *   is_active: true,
     *   limit: 50
     * });
     * console.log(accounts.data); // Array of sender accounts
     * ```
     */
    list(params?: ListSenderAccountsParams): Promise<ListSenderAccountsResponse>;
    /**
     * Get a single sender account by ID, sender_code, or slug
     *
     * @param id - Sender account ID, sender_code, or slug (the tenant's own
     *   alternate/legacy account code)
     * @returns Sender account details
     *
     * @example
     * ```typescript
     * const account = await client.senderAccounts.get('account-uuid');
     * console.log(account.sender_code); // 'ACMEE'
     * // Also resolves by the tenant's migrated code:
     * const bySlug = await client.senderAccounts.get('EK-XXMF-BBFLC');
     * ```
     */
    get(id: string): Promise<SenderAccount>;
    /**
     * Bulk-import sender accounts migrated from another TMS system.
     *
     * Idempotent per-row on `slug` (the tenant's legacy code): a row whose slug
     * already exists in the org updates that account; otherwise a new account is
     * created with a freshly-generated internal `sender_code`. Safe to re-run.
     *
     * @param data - The rows to import
     * @returns Summary of created / updated / failed rows
     *
     * @example
     * ```typescript
     * const summary = await client.senderAccounts.import({
     *   rows: [
     *     { name: 'Acme Corp', slug: 'EK-XXMF-BBFLC', phone: '0812345678' },
     *   ],
     * });
     * console.log(summary.created, summary.updated, summary.failed);
     * ```
     */
    import(data: ImportSenderAccountsRequest): Promise<ImportSenderAccountsResponse>;
    /**
     * Create a new sender account
     *
     * @param data - Sender account creation data
     * @returns Created sender account
     *
     * @example
     * ```typescript
     * const account = await client.senderAccounts.create({
     *   name: 'Acme Corp',
     *   company_name: 'Acme Corporation',
     *   email: 'shipping@acme.com',
     *   phone: '0812345678'
     * });
     * console.log(account.sender_code); // Auto-generated code
     * ```
     */
    create(data: CreateSenderAccountRequest): Promise<SenderAccount>;
    /**
     * Update a sender account
     *
     * @param id - Sender account ID
     * @param data - Fields to update
     * @returns Updated sender account
     *
     * @example
     * ```typescript
     * await client.senderAccounts.update('account-uuid', {
     *   is_active: false
     * });
     * ```
     */
    update(id: string, data: UpdateSenderAccountRequest): Promise<SenderAccount>;
    /**
     * Delete a sender account
     *
     * @param id - Sender account ID
     */
    delete(id: string): Promise<void>;
    /**
     * List recipients linked to a sender account
     *
     * @param id - Sender account ID
     * @param params - Optional filters (is_active)
     * @returns Array of sender account recipients
     *
     * @example
     * ```typescript
     * const recipients = await client.senderAccounts.listRecipients('account-uuid', {
     *   is_active: true
     * });
     * ```
     */
    listRecipients(id: string, params?: ListSenderAccountRecipientsParams): Promise<SenderAccountRecipient[]>;
    /**
     * Get a single recipient linked to a sender account
     *
     * @param id - Sender account ID
     * @param recipientId - Recipient ID
     * @returns Sender account recipient details
     */
    getRecipient(id: string, recipientId: string): Promise<SenderAccountRecipient>;
    /**
     * Link a recipient to a sender account
     *
     * @param id - Sender account ID
     * @param data - Recipient data (name, phone, email, address, junction metadata)
     * @returns Created sender account recipient
     *
     * @example
     * ```typescript
     * const recipient = await client.senderAccounts.createRecipient('account-uuid', {
     *   name: 'John Doe',
     *   phone: '0812345678',
     *   email: 'john@example.com',
     *   address: {
     *     street_line: '123 Main St',
     *     city: 'Bangkok',
     *     state: 'Bangkok',
     *     zip_code: '10110',
     *     country: 'TH',
     *   },
     *   is_default: true,
     * });
     * ```
     */
    createRecipient(id: string, data: CreateSenderAccountRecipientRequest): Promise<SenderAccountRecipient>;
    /**
     * Update a recipient link on a sender account
     *
     * @param id - Sender account ID
     * @param recipientId - Recipient ID
     * @param data - Junction fields to update (is_default, label, etc.)
     * @returns Updated sender account recipient
     *
     * @example
     * ```typescript
     * await client.senderAccounts.updateRecipient('account-uuid', 'recipient-uuid', {
     *   is_default: true
     * });
     * ```
     */
    updateRecipient(id: string, recipientId: string, data: UpdateSenderAccountRecipientRequest): Promise<SenderAccountRecipient>;
    /**
     * Remove a recipient from a sender account
     *
     * @param id - Sender account ID
     * @param recipientId - Recipient ID
     */
    deleteRecipient(id: string, recipientId: string): Promise<void>;
    /**
     * Resolve which organization owns a sender account, returning that org's
     * `api_key`. Intended for a shared-warehouse WMS that receives a package,
     * reads its sender account code, and needs to know which TMS org (and which
     * credentials) to call.
     *
     * **Auth:** this endpoint requires the non-org-scoped **WMS partner
     * credential**. Construct the client with the partner `apiKey`/`apiSecret`
     * (not a regular organization key) — a normal org key returns 401. Returns a
     * 404 (thrown as `TMSApiError`) when no owning org/secret is found.
     *
     * @param code - The sender account code read from the package label
     * @returns The owning organization's `api_key`
     *
     * @example
     * ```typescript
     * const partner = new TMSClient({
     *   baseUrl: 'https://your-domain.com/api',
     *   apiKey: process.env.WMS_PARTNER_API_KEY!,
     *   apiSecret: process.env.WMS_PARTNER_API_SECRET!,
     * });
     * const { api_key } = await partner.senderAccounts.resolveOwnership('ACME1');
     * ```
     */
    resolveOwnership(code: string): Promise<SenderAccountOwnershipResponse>;
}

/**
 * BillingProfiles resource for managing billing profiles and cycles
 */
declare class BillingProfiles {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * List billing profiles with optional filters
     *
     * @param params - Query parameters for filtering
     * @returns Paginated list of billing profiles
     *
     * @example
     * ```typescript
     * const profiles = await client.billingProfiles.list({
     *   billing_type: 'consolidated',
     *   is_active: true,
     *   page: 1,
     *   pageSize: 20
     * });
     * ```
     */
    list(params?: ListBillingProfilesParams): Promise<PaginatedResponse<BillingProfile>>;
    /**
     * Get a single billing profile by ID
     *
     * @param id - Billing profile ID
     * @returns Billing profile details
     *
     * @example
     * ```typescript
     * const profile = await client.billingProfiles.get('profile-uuid');
     * console.log(profile.billing_cycle); // 'monthly'
     * ```
     */
    get(id: string): Promise<BillingProfile>;
    /**
     * Create a new billing profile
     *
     * @param data - Billing profile creation data
     * @returns Created billing profile
     *
     * @example
     * ```typescript
     * const profile = await client.billingProfiles.create({
     *   contractor_id: 'contractor-uuid',
     *   billing_type: 'consolidated',
     *   billing_cycle: 'monthly',
     *   cycle_day: 1,
     *   payment_terms: 'net_30',
     *   default_tax_rate: 7,
     *   auto_issue: true
     * });
     * ```
     */
    create(data: CreateBillingProfileRequest): Promise<BillingProfile>;
    /**
     * Update a billing profile
     *
     * @param id - Billing profile ID
     * @param data - Fields to update
     * @returns Updated billing profile
     *
     * @example
     * ```typescript
     * await client.billingProfiles.update('profile-uuid', {
     *   auto_issue: false,
     *   payment_terms: 'net_60'
     * });
     * ```
     */
    update(id: string, data: UpdateBillingProfileRequest): Promise<BillingProfile>;
    /**
     * Deactivate a billing profile (soft delete)
     *
     * @param id - Billing profile ID
     * @returns Deactivated billing profile
     */
    delete(id: string): Promise<BillingProfile>;
    /**
     * List cycle runs for a billing profile
     *
     * @param id - Billing profile ID
     * @param params - Optional filters (status, pagination)
     * @returns Paginated list of cycle runs
     *
     * @example
     * ```typescript
     * const cycles = await client.billingProfiles.listCycles('profile-uuid', {
     *   status: 'completed',
     *   page: 1,
     *   pageSize: 10
     * });
     * ```
     */
    listCycles(id: string, params?: ListCycleRunsParams): Promise<PaginatedResponse<BillingCycleRun>>;
    /**
     * Manually trigger a billing cycle run
     *
     * @param id - Billing profile ID (must be a consolidated profile)
     * @param data - Optional as_of_date
     * @returns Cycle run result
     *
     * @example
     * ```typescript
     * const result = await client.billingProfiles.triggerCycle('profile-uuid', {
     *   as_of_date: '2024-02-01'
     * });
     * ```
     */
    triggerCycle(id: string, data?: TriggerCycleRequest): Promise<BillingCycleRun>;
}

/**
 * DeliveryEvents resource for managing delivery events and POD uploads
 */
declare class DeliveryEvents {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * Create a delivery event
     *
     * @param data - Event creation data
     * @returns Created delivery event
     *
     * @example
     * ```typescript
     * const event = await client.deliveryEvents.create({
     *   waybill_id: 'waybill-uuid',
     *   event_type: 'delivered',
     *   notes: 'Left at front door',
     *   photos: ['base64-encoded-image...']
     * });
     * ```
     */
    create(data: CreateDeliveryEventRequest): Promise<DeliveryEvent>;
    /**
     * Upload POD images for a delivery event via multipart form data
     *
     * Note: This method accepts File or Blob objects for browser/Node.js environments.
     * For Node.js, you can use the `File` or `Blob` class from `node:buffer`.
     *
     * @param eventId - Delivery event ID
     * @param photos - Array of File or Blob objects
     * @returns Upload result
     *
     * @example
     * ```typescript
     * // Node.js
     * import { readFileSync } from 'fs';
     * const photoBuffer = readFileSync('photo.jpg');
     * const blob = new Blob([photoBuffer], { type: 'image/jpeg' });
     *
     * await client.deliveryEvents.uploadPods('event-uuid', [blob]);
     * ```
     */
    uploadPods(eventId: string, photos: Blob[]): Promise<Record<string, unknown>>;
    /**
     * Get a temporary Aliyun STS credential to upload POD photos for an event
     * straight to OSS. It can only write objects under `prefix`, for 15 minutes.
     * Upload with it, then call {@link attachPods} with the keys. `mode: "server"`
     * means OSS isn't configured: use {@link uploadPods} instead.
     *
     * @param eventId - Delivery event ID
     */
    getPodUploadToken(eventId: string): Promise<PodUploadToken>;
    /**
     * Attach POD photos already uploaded to OSS with a token from
     * {@link getPodUploadToken}.
     *
     * @param eventId - Delivery event ID
     * @param keys - 1 to 10 object keys, each under the token's prefix
     */
    attachPods(eventId: string, keys: string[]): Promise<Record<string, unknown>>;
    /**
     * Delete a POD image from a delivery event
     *
     * @param eventId - Delivery event ID
     * @param imageUrl - The image URL to delete (URL-encoded)
     *
     * @example
     * ```typescript
     * await client.deliveryEvents.deletePod('event-uuid', 'https://storage.example.com/pods/photo.jpg');
     * ```
     */
    deletePod(eventId: string, imageUrl: string): Promise<void>;
}

/**
 * Reports resource for generating financial reports
 */
declare class Reports {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * Get billing breakdown by service
     *
     * @param params - Date range and optional contractor filter
     * @returns Billing data grouped by service with totals
     *
     * @example
     * ```typescript
     * const report = await client.reports.billingByService({
     *   date_from: '2024-01-01',
     *   date_to: '2024-01-31',
     *   contractor_id: 'contractor-uuid'
     * });
     * console.log(report.totals); // { quantity: 150, amount: 7500 }
     * ```
     */
    billingByService(params: BillingByServiceParams): Promise<BillingByServiceReport>;
    /**
     * Get billing by service report as CSV
     *
     * @param params - Date range and optional contractor filter
     * @returns CSV content as string
     */
    billingByServiceCSV(params: Omit<BillingByServiceParams, 'format'>): Promise<ArrayBuffer>;
    /**
     * Get outstanding invoices report
     *
     * @param params - Optional contractor and status filters
     * @returns Outstanding invoices with aging analysis
     *
     * @example
     * ```typescript
     * const report = await client.reports.outstandingInvoices({
     *   status: 'overdue'
     * });
     * console.log(report.data); // Array of overdue invoices
     * ```
     */
    outstandingInvoices(params?: OutstandingInvoicesParams): Promise<OutstandingInvoicesReport>;
    /**
     * Get outstanding invoices report as CSV
     */
    outstandingInvoicesCSV(params?: Omit<OutstandingInvoicesParams, 'format'>): Promise<ArrayBuffer>;
    /**
     * Get payment history report
     *
     * @param params - Date range and optional filters
     * @returns Payment history with summary
     *
     * @example
     * ```typescript
     * const report = await client.reports.paymentHistory({
     *   date_from: '2024-01-01',
     *   date_to: '2024-01-31'
     * });
     * ```
     */
    paymentHistory(params: PaymentHistoryParams): Promise<PaymentHistoryReport>;
    /**
     * Get payment history report as CSV
     */
    paymentHistoryCSV(params: Omit<PaymentHistoryParams, 'format'>): Promise<ArrayBuffer>;
    /**
     * Get revenue summary report
     *
     * @param params - Date range, period, and optional contractor filter
     * @returns Revenue data grouped by time period
     *
     * @example
     * ```typescript
     * const report = await client.reports.revenueSummary({
     *   date_from: '2024-01-01',
     *   date_to: '2024-12-31',
     *   period: 'monthly'
     * });
     * ```
     */
    revenueSummary(params: RevenueSummaryParams): Promise<RevenueSummaryReport>;
    /**
     * Get revenue summary report as CSV
     */
    revenueSummaryCSV(params: Omit<RevenueSummaryParams, 'format'>): Promise<ArrayBuffer>;
    /**
     * Internal helper to fetch CSV reports
     */
    private _fetchCSV;
}

/**
 * Regions resource for querying location hierarchy data
 * (countries → provinces → cities → districts)
 *
 * Use this to build cascading address selectors in your UI.
 *
 * @example
 * ```typescript
 * // Get available countries
 * const countries = await client.regions.listCountries();
 * // => ['TH']
 *
 * // Get full hierarchy for a country
 * const hierarchy = await client.regions.getHierarchy({ country: 'TH' });
 * // => { provinces: [{ name: 'Bangkok', cities: [{ name: 'Phra Nakhon', districts: [...] }] }] }
 *
 * // Narrow to a specific postal code
 * const filtered = await client.regions.getHierarchy({ country: 'TH', postal_code: '10110' });
 * ```
 */
declare class Regions {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * List all available countries that have region data
     *
     * @returns Array of ISO country codes
     *
     * @example
     * ```typescript
     * const countries = await client.regions.listCountries();
     * console.log(countries); // ['TH']
     * ```
     */
    listCountries(): Promise<string[]>;
    /**
     * Get the region hierarchy (provinces → cities → districts) for a country.
     * Optionally filter by postal code to narrow results.
     *
     * @param params - Country code and optional postal code
     * @returns Region hierarchy tree
     *
     * @example
     * ```typescript
     * const hierarchy = await client.regions.getHierarchy({ country: 'TH' });
     * for (const province of hierarchy.provinces) {
     *   console.log(province.name);
     *   for (const city of province.cities) {
     *     console.log(`  ${city.name}`);
     *     for (const district of city.districts) {
     *       console.log(`    ${district.name} (${district.code})`);
     *     }
     *   }
     * }
     * ```
     */
    getHierarchy(params: ListRegionsParams): Promise<RegionHierarchy>;
}

/**
 * WaybillRoutes resource for querying waybill routes
 */
declare class WaybillRoutes {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * List waybill routes with optional filters
     *
     * @param params - Query parameters for filtering
     * @returns Array of waybill routes
     *
     * @example
     * ```typescript
     * const routes = await client.waybillRoutes.list({ search: 'BKK' });
     * ```
     */
    list(params?: ListWaybillRoutesParams): Promise<WaybillRoute[]>;
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
    get(id: string): Promise<WaybillRouteWithLegs>;
}

/**
 * Organizations resource for managing the current organization
 */
declare class Organizations {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * Get the current authenticated organization
     *
     * @returns Organization details
     *
     * @example
     * ```typescript
     * const org = await client.organizations.get();
     * console.log(org.name); // 'Acme Corp'
     * ```
     */
    get(): Promise<Organization>;
    /**
     * Update the current organization
     *
     * @param data - Fields to update
     * @returns Updated organization
     *
     * @example
     * ```typescript
     * const org = await client.organizations.update({
     *   name: 'Acme Corp Updated',
     *   phone: '0812345678'
     * });
     * ```
     */
    update(data: UpdateOrganizationRequest): Promise<Organization>;
}

interface ListOrganizationUnitsResponse {
    data: OrganizationUnit[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}
/**
 * OrganizationUnits resource for managing organization units (branches, warehouses, etc.)
 */
declare class OrganizationUnits {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * List organization units with optional filters
     *
     * @param params - Query parameters for filtering
     * @returns Paginated list of organization units
     *
     * @example
     * ```typescript
     * const units = await client.organizationUnits.list({
     *   type: 'branch',
     *   is_active: true,
     *   limit: 50
     * });
     * console.log(units.data); // Array of organization units
     * ```
     */
    list(params?: ListOrganizationUnitsParams): Promise<ListOrganizationUnitsResponse>;
    /**
     * Create a new organization unit
     *
     * @param data - Organization unit creation data
     * @returns Created organization unit
     *
     * @example
     * ```typescript
     * const unit = await client.organizationUnits.create({
     *   name: 'Bangkok Branch',
     *   code: 'BKK-01',
     *   type: 'branch',
     *   address: {
     *     street_line: '123 Sukhumvit Rd',
     *     city: 'Bangkok',
     *     state: 'Bangkok',
     *     zip_code: '10110',
     *     country: 'TH'
     *   },
     *   phone: '0212345678'
     * });
     * ```
     */
    create(data: CreateOrganizationUnitRequest): Promise<OrganizationUnit>;
    /**
     * Update an organization unit
     *
     * @param id - Organization unit ID
     * @param data - Fields to update
     * @returns Updated organization unit
     *
     * @example
     * ```typescript
     * await client.organizationUnits.update('unit-uuid', {
     *   name: 'Bangkok Main Branch',
     *   is_active: false
     * });
     * ```
     */
    update(id: string, data: UpdateOrganizationUnitRequest): Promise<OrganizationUnit>;
    /**
     * Delete an organization unit
     *
     * @param id - Organization unit ID
     */
    delete(id: string): Promise<void>;
}

interface ListProductCategoriesResponse {
    data: ProductCategory[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}
interface ProductCategoriesTreeResponse {
    data: ProductCategoryTreeNode[];
}
/**
 * ProductCategories resource for managing the org-scoped product category tree.
 *
 * Category IDs returned here can be passed as `product_category_id` when creating
 * a waybill.
 */
declare class ProductCategories {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * List product categories as a flat, paginated list.
     *
     * @param params - Query parameters for filtering
     * @returns Paginated list of product categories
     *
     * @example
     * ```typescript
     * const categories = await client.productCategories.list({ is_active: true });
     * console.log(categories.data); // Array of product categories
     * ```
     */
    list(params?: ListProductCategoriesParams): Promise<ListProductCategoriesResponse>;
    /**
     * Fetch the full category hierarchy as a nested tree.
     *
     * @returns The category tree (roots with nested `children`)
     *
     * @example
     * ```typescript
     * const { data } = await client.productCategories.tree();
     * data.forEach(root => console.log(root.name, root.children.length));
     * ```
     */
    tree(): Promise<ProductCategoriesTreeResponse>;
    /**
     * Create a new product category.
     *
     * @param data - Category creation data (omit `parent_id` for a root category)
     * @returns The created product category
     *
     * @example
     * ```typescript
     * const root = await client.productCategories.create({ name: 'Electronics' });
     * const child = await client.productCategories.create({
     *   name: 'Batteries',
     *   parent_id: root.id,
     * });
     * ```
     */
    create(data: CreateProductCategoryRequest): Promise<ProductCategory>;
    /**
     * Update a product category. Setting `parent_id` re-parents the node.
     *
     * @param id - Product category ID
     * @param data - Fields to update
     * @returns The updated product category
     *
     * @example
     * ```typescript
     * await client.productCategories.update('category-uuid', { is_active: false });
     * ```
     */
    update(id: string, data: UpdateProductCategoryRequest): Promise<ProductCategory>;
    /**
     * Delete a product category and its subtree.
     *
     * @param id - Product category ID
     */
    delete(id: string): Promise<void>;
}

/**
 * Receiving bank accounts — where an organization's customers send money for
 * the `bank_transfer` payment method.
 *
 * Read-only over the SDK, and only the payer-safe projection. Managing accounts
 * (caps, priority, statement mappings) is an operator surface in the TMS app,
 * because those settings decide how inbound volume is spread and are not the
 * business of an API client.
 *
 * Not to be confused with a bank slip, which is the PAYER's evidence of having
 * sent money and describes THEIR account.
 */
declare class BankAccounts {
    private readonly http;
    constructor(http: HttpClient);
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
    list(params?: {
        currency?: string;
    }): Promise<PublicBankAccount[]>;
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
    checkAvailability(params: {
        amount: number;
        currency: string;
    }): Promise<BankAccountAvailability>;
}

/**
 * Wallets resource — prepaid deposit balances.
 *
 * A wallet is a single money ledger per sender account. Top-ups are funded
 * through FlashPay (credited on webhook confirmation); the balance can then be
 * used to pay invoices.
 */
declare class Wallets {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * Get the wallet balance for a sender account (created lazily on first access).
     *
     * @example
     * ```typescript
     * const wallet = await client.wallets.getBalance('sender-account-uuid');
     * console.log(wallet.balance); // e.g. 1500.00
     * ```
     */
    getBalance(senderAccountId: string): Promise<WalletBalance>;
    /**
     * Start a wallet top-up via FlashPay. Returns the QR image / deeplink and the
     * payment id. The balance is credited only when FlashPay confirms the payment.
     *
     * @example
     * ```typescript
     * const topup = await client.wallets.topUp({
     *   sender_account_id: 'sender-account-uuid',
     *   amount: 1000,
     *   flashpay_type: 'qr',
     * });
     * if (topup.type === 'qr') console.log(topup.qr_image);
     * ```
     */
    topUp(data: TopUpWalletRequest): Promise<WalletTopUpResponse>;
    /**
     * Pay (part of) an invoice from the wallet balance. Defaults to the invoice's
     * outstanding balance when `amount` is omitted.
     *
     * @example
     * ```typescript
     * const result = await client.wallets.pay({
     *   sender_account_id: 'sender-account-uuid',
     *   invoice_id: 'invoice-uuid',
     * });
     * console.log(result.balance); // remaining wallet balance
     * ```
     */
    pay(data: PayInvoiceWithWalletRequest): Promise<PayInvoiceWithWalletResponse>;
    /**
     * List ledger entries for a sender account's wallet (most recent first).
     *
     * @example
     * ```typescript
     * const { data, pagination } = await client.wallets.listTransactions({
     *   sender_account_id: 'sender-account-uuid',
     *   page: 1,
     *   pageSize: 20,
     * });
     * ```
     */
    listTransactions(params: ListWalletTransactionsParams): Promise<WalletTransactionsResponse>;
}

/**
 * Quotes resource for the FTL/LTL shipping-quote flow.
 *
 * Only quote creation is exposed here so far. The downstream quote operations —
 * `GET /api/quotes`, `GET /api/quotes/{id}`, `POST /api/quotes/{id}/pay`,
 * `POST /api/quotes/{id}/cancel`, `GET /api/quotes/{id}/payment-methods` and
 * `GET /api/orders/{id}/tracking` — take the same organization API-key
 * signature as everything else in this SDK, plus an `X-Sender-Account-Id`
 * header naming the sender you act for. They are callable server-to-server;
 * they simply have no wrapper here yet. Call them directly meanwhile.
 */
declare class Quotes {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * Create a shipping quotation.
     *
     * Selects a vehicle/pricing source for the shipment and persists a quotation,
     * returning the quote ID along with the resolved provider and vehicle.
     *
     * A quote needs no owner. When you already know which sender account it is
     * for, pass `senderAccountId` (sent as the `X-Sender-Account-Id` header); it
     * must belong to your organization.
     *
     * Addresses must carry coordinates — quoting never geocodes on your behalf.
     * Resolve free text with {@link Address.resolve} first and use the
     * `confidence` it reports to decide whether the match is good enough to price
     * against; the resolver always returns something, down to a province centroid.
     *
     * @param data - Quote request (addresses, cargo, options)
     * @param options - `senderAccountId`: the sender account that owns the quote
     * @returns The created quotation
     *
     * @example
     * ```typescript
     * const from = await client.address.resolve({ address: '123 Sukhumvit Rd, Bangkok' });
     * const to = await client.address.resolve({ address: '456 Nimman Rd, Chiang Mai' });
     * if (from.confidence < 0.7 || to.confidence < 0.7) {
     *   throw new Error('Address too vague to price — ask the customer to confirm.');
     * }
     *
     * const quote = await client.quotes.create({
     *   request_id: 'req-123',
     *   pickup: { address: from.formatted_address ?? '…', lat: from.lat, lng: from.lng },
     *   delivery: { address: to.formatted_address ?? '…', lat: to.lat, lng: to.lng },
     *   items: [
     *     { qty: 2, length_cm: 100, width_cm: 80, height_cm: 60, weight_kg: 25 },
     *   ],
     * });
     * console.log(quote.quotation_id, quote.vehicle, quote.estimated_total);
     * ```
     */
    create(data: CreateQuoteRequest, options?: {
        senderAccountId?: string;
    }): Promise<CreateQuoteResponse>;
}

/**
 * Address resource for resolving locations into structured address fields.
 */
declare class Address {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * Resolve a location into structured address fields (country, province,
     * district, subdistrict, postal code, coordinates). Provide exactly one of
     * three input modes — the response shape is identical across all of them:
     *
     *   - `{ address }`      → free-text geocode cascade
     *   - `{ url }`          → Google-Maps pin / short link → coordinates
     *   - `{ lat, lng }`     → reverse-geocode a shared device location
     *
     * @param request - One of the three input modes, plus optional `country`
     *   (ISO alpha-2 hint) and `logResolution` (defaults to `true`).
     * @returns The resolved address. Throws `TMSApiError` with status `404` when
     *   the location could not be resolved, or `400` for invalid input.
     *
     * @example
     * ```typescript
     * // Free-text
     * const a = await client.address.resolve({
     *   address: '123 Sukhumvit Rd, Bangkok',
     *   country: 'TH',
     * });
     *
     * // Google-Maps link
     * const b = await client.address.resolve({ url: 'https://maps.app.goo.gl/xyz' });
     *
     * // Reverse-geocode coordinates
     * const c = await client.address.resolve({ lat: 13.7563, lng: 100.5018 });
     * console.log(c.province, c.postal_code);
     * ```
     */
    resolve(request: AddressResolveRequest): Promise<ResolvedAddress>;
}

/**
 * ShippingFee resource for ad-hoc forwarding-fee estimates.
 *
 * `POST /shipping-fee` resolves the destination route from the recipient postal
 * code (the same route-resolution waybill billing uses), then prices the
 * selected service against it with the rate-card engine — read-only, no billing
 * records are written. Intended for customer-facing shipping calculators.
 */
declare class ShippingFee {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * Estimate the forwarding fee for a parcel to a destination postal code.
     *
     * @param data - Service, weight/dimensions, add-ons, and destination postal code.
     * @returns The priced estimate `{ cost, currency, service_name, chargeable_weight, breakdown }`.
     *
     * @example
     * ```typescript
     * const quote = await client.shippingFee.calculate({
     *   service_id: 'svc-uuid',
     *   weight_kg: 12.5,
     *   dimensions: { length_cm: 40, width_cm: 30, height_cm: 20 },
     *   destination_postal_code: '10110',
     *   country: 'TH',
     * });
     * console.log(quote.cost, quote.currency); // 375 THB
     * ```
     */
    calculate(data: CreateShippingFeeRequest): Promise<ShippingFeeResponse>;
}

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
declare class TMSClient {
    private readonly http;
    private readonly config;
    /**
     * Waybills resource for managing shipping orders
     */
    readonly waybills: Waybills;
    /**
     * Billings resource for managing billing records
     */
    readonly billings: Billings;
    /**
     * Invoices resource for managing invoices
     */
    readonly invoices: Invoices;
    /**
     * Payments resource for managing payments
     */
    readonly payments: Payments;
    /** Receiving bank accounts, read-only and payer-safe. */
    readonly bankAccounts: BankAccounts;
    /**
     * RateCards resource for managing rate cards
     */
    readonly rateCards: RateCards;
    /**
     * SenderAccounts resource for managing sender accounts
     */
    readonly senderAccounts: SenderAccounts;
    /**
     * BillingProfiles resource for managing billing profiles and cycles
     */
    readonly billingProfiles: BillingProfiles;
    /**
     * DeliveryEvents resource for managing delivery events and PODs
     */
    readonly deliveryEvents: DeliveryEvents;
    /**
     * Reports resource for generating financial reports
     */
    readonly reports: Reports;
    /**
     * Regions resource for querying location hierarchy (provinces, cities, districts)
     */
    readonly regions: Regions;
    /**
     * WaybillRoutes resource for querying waybill routes
     */
    readonly waybillRoutes: WaybillRoutes;
    /**
     * Organizations resource for managing the current organization
     */
    readonly organizations: Organizations;
    /**
     * OrganizationUnits resource for managing organization units (branches, warehouses, etc.)
     */
    readonly organizationUnits: OrganizationUnits;
    /**
     * ProductCategories resource for managing the org-scoped product category tree
     */
    readonly productCategories: ProductCategories;
    /**
     * Wallets resource for prepaid deposit balances (top-up, pay, transactions)
     */
    readonly wallets: Wallets;
    /**
     * Quotes resource for creating FTL/LTL shipping quotations
     */
    readonly quotes: Quotes;
    /**
     * Address resource for resolving locations into structured address fields
     */
    readonly address: Address;
    /**
     * ShippingFee resource for ad-hoc forwarding-fee estimates
     */
    readonly shippingFee: ShippingFee;
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
    constructor(config: TMSClientConfig);
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
    setLanguage(language?: TMSLanguage): void;
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
    withLanguage(language?: TMSLanguage): TMSClient;
}

export { type AddPackageRequest, type AddPackageResponse, type AdditionalService, Address, type AddressResolveByCoords, type AddressResolveByText, type AddressResolveByUrl, type AddressResolveOptions, type AddressResolveRequest, type AddressType, type AllocateWaybillNumberResponse, type AvailablePaymentMethod, type BankAccountAvailability, BankAccounts, type BankSlip, type BankTransferInstructions, type BatchLabelRequest, type BillingByServiceParams, type BillingByServiceReport, type BillingCycle, type BillingCycleRun, type BillingEmailRequest, type BillingProfile, BillingProfiles, type BillingRecord, type BillingStatus, type BillingType, Billings, type ConsolidateWaybillsRequest, type ConsolidateWaybillsResponse, type CreateAdditionalServicesRequest, type CreateBankSlipRequest, type CreateBillingProfileRequest, type CreateBillingRequest, type CreateDeliveryEventRequest, type CreateInvoiceRequest, type CreateOrganizationUnitRequest, type CreatePaymentRequest, type CreateProductCategoryRequest, type CreateQuoteRequest, type CreateQuoteResponse, type CreateRateCardRequest, type CreateSenderAccountRecipientAddress, type CreateSenderAccountRecipientRequest, type CreateSenderAccountRequest, type CreateShippingFeeRequest, type CreateWaybillRequest, type CreateWaybillResponse, type CycleRunStatus, type DateRangeParams, type DeliveryEvent, type DeliveryEventType, DeliveryEvents, type FlashPayAppResponse, type FlashPayQRResponse, type FlashPayRequest, type FlashPayResponse, type FlashPayType, type GeocodeSource, type GetLabelParams, type ImportSenderAccountRow, type ImportSenderAccountsRequest, type ImportSenderAccountsResponse, type Invoice, type InvoiceLineItem, type InvoiceStatus, Invoices, type IssueInvoiceRequest, type LabelFormat, type LabelSize, type ListBillingProfilesParams, type ListBillingsParams, type ListCycleRunsParams, type ListInvoicesParams, type ListOrganizationUnitsParams, type ListPaymentsParams, type ListProductCategoriesParams, type ListRateCardsParams, type ListRegionsParams, type ListSenderAccountRecipientsParams, type ListSenderAccountsParams, type ListWalletTransactionsParams, type ListWaybillRoutesParams, type Organization, type OrganizationUnit, type OrganizationUnitAddress, type OrganizationUnitType, OrganizationUnits, Organizations, type OutstandingInvoicesParams, type OutstandingInvoicesReport, type PackageLabelOcrParams, type PackageLabelOcrResponse, type PackageLabelOcrResult, type PaginatedResponse, type PaginationParams, type Parcel, type PayInvoiceWithWalletRequest, type PayInvoiceWithWalletResponse, type Payment, type PaymentAllocation, type PaymentHistoryParams, type PaymentHistoryReport, type PaymentMethod, type PaymentMethodUnavailableReason, type PaymentMethodsParams, type PaymentMethodsResponse, type PaymentMode, type PaymentStatus, type PaymentTerms, Payments, type PodUploadToken, type Product, ProductCategories, type ProductCategory, type ProductCategoryTreeNode, type PublicBankAccount, type QuoteAddress, type QuoteBreakdownLine, type QuoteItem, type QuoteServiceType, Quotes, type RateCard, RateCards, type RecipientAddress, type RecipientInput, type RegionCity, type RegionDistrict, type RegionHierarchy, type RegionProvince, Regions, type ReplaceAllocationsRequest, type ReportDateRangeParams, type ReportPeriod, Reports, type ResolvedAddress, type RevenueSummaryParams, type RevenueSummaryReport, type SendEmailRequest, type SendInvoiceEmailRequest, type SenderAccount, type SenderAccountOwnershipRequest, type SenderAccountOwnershipResponse, type SenderAccountRecipient, SenderAccounts, ShippingFee, type ShippingFeeBreakdownLine, type ShippingFeeDimensions, type ShippingFeeResponse, type SplitPackageRequest, type SplitPackageResponse, type SplitPart, TMSApiError, TMSClient, type TMSClientConfig, type TMSError, type TMSLanguage, type TopUpWalletRequest, type TrackingRoute, type TriggerCycleRequest, type UpdateAdditionalServiceRequest, type UpdateBillingProfileRequest, type UpdateBillingRequest, type UpdateInvoiceRequest, type UpdateOrganizationRequest, type UpdateOrganizationUnitRequest, type UpdatePackageRequest, type UpdatePackageResponse, type UpdatePaymentRequest, type UpdateProductCategoryRequest, type UpdateRateCardRequest, type UpdateSenderAccountRecipientRequest, type UpdateSenderAccountRequest, type VerifyBankSlipRequest, type WalletBalance, type WalletTopUpAppResponse, type WalletTopUpQRResponse, type WalletTopUpResponse, type WalletTransaction, type WalletTransactionType, type WalletTransactionsResponse, Wallets, type WaybillAddress, type WaybillBillingRecord, type WaybillDelegation, type WaybillDetails, type WaybillEvents, type WaybillListParams, type WaybillPackage, type WaybillPackageSummary, type WaybillRecipient, type WaybillRoute, type WaybillRouteLeg, type WaybillRouteUnit, type WaybillRouteUnitAddress, type WaybillRouteWithLegs, WaybillRoutes, type WaybillServiceCount, type WaybillServiceCountParams, type WaybillSummary, Waybills, canonicalizeJson, generateKeyedSignature, generateNonce, generateSignature, getTimestamp, verifyWebhookSignature };
