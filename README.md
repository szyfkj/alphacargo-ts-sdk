# TMS Node.js SDK

Official Node.js SDK for the TMS (Transport Management System) API.

## Installation

```bash
npm install @alphacargo/tms-sdk
```

Or using yarn:

```bash
yarn add @alphacargo/tms-sdk
```

Or using pnpm:

```bash
pnpm add @alphacargo/tms-sdk
```

## Requirements

- Node.js 18.0.0 or higher
- TypeScript 5.0+ (for TypeScript users)

## Quick Start

```typescript
import { TMSClient } from '@alphacargo/tms-sdk';

// Initialize the client
const client = new TMSClient({
  baseUrl: 'https://your-domain.com/api',
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
});

// Create a waybill
const waybill = await client.waybills.create({
  outTradeNo: 'ORDER-2024-001',
  owner: 'warehouse-a',
  senderName: 'Acme Warehouse',
  senderPhone: '0212345678',
  senderCityName: 'Bangkok',
  senderDistrictName: 'Watthana',
  senderPostCode: '10110',
  senderAddress: '123 Sukhumvit Road',
  receiverName: 'John Doe',
  receiverPhone: '0812345678',
  receiverProvinceName: 'Bangkok',
  receiverCityName: 'Bangkok',
  receiverDistrictName: 'Chatuchak',
  receiverPostCode: '10900',
  receiverAddress: '456 Phaholyothin Road',
  parcelList: [{
    outParcelNo: 'PKG-001',
    itemDesc: 'Electronics',
    itemValue: 1500,
    weight: 1.5,
    productList: [{
      name: 'Wireless Mouse',
      sku: 'SKU-001',
      quantity: 2
    }]
  }],
  remark: 'Handle with care'
});

console.log('Waybill created:', waybill.waybill_no);
```

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `baseUrl` | string | Yes | Base URL of the TMS API |
| `apiKey` | string | Yes | Your API key (merchant ID) |
| `apiSecret` | string | Yes | Your API secret for signature generation |
| `timeout` | number | No | Request timeout in ms (default: 30000) |
| `language` | string | No | Preferred language for error messages (`en`, `th`, `zh`). Sent as `Accept-Language`. Defaults to English. |
| `headers` | object | No | Custom headers to include in all requests |
| `debug` | boolean | No | Log each request's method, path and status. Never logs query strings, bodies or responses |

### Request signing

Every request carries `api_key`, `nonceStr` and `sign`, where
`sign = HMAC-SHA256(apiSecret, canonicalJson(request without sign))`. The secret
itself is never sent.

> **Upgrading to 3.0.** Earlier versions could sign with a plain SHA-256 that did
> not involve the secret (`signatureScheme: 'sha256'`, the default before 2.7).
> The TMS no longer accepts it, so 3.0 removes it: `generateSignature(params,
> apiSecret)` is now the keyed signature, `verifyWebhookSignature` requires
> `apiSecret`, and its result no longer carries `scheme`. The `signatureScheme`
> and `requireSecret` options are still accepted, and ignored.

### Verifying webhooks

```typescript
import { verifyWebhookSignature } from '@alphacargo/tms-sdk';

const result = await verifyWebhookSignature(req.body, {
  apiSecret: process.env.TMS_API_SECRET, // secret of the api_key in the body
});
if (!result.valid) return res.status(401).json({ error: result.error });
```

A webhook from an organization with no API key/secret arrives **unsigned** (no
`sign` field) and never verifies — treat it as unauthenticated.

### Localized error messages

API error messages can be returned in English (`en`), Thai (`th`), or Chinese
(`zh`). Set `language` on the client, or override it per client/request. Only the
error message text is localized — response shapes and codes are unchanged. If
`language` is omitted, messages are returned in English.

```typescript
// Set once for the whole client
const client = new TMSClient({
  baseUrl: 'https://your-domain.com/api',
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  language: 'zh',
});

try {
  await client.waybills.get('UNKNOWN123');
} catch (err) {
  if (err instanceof TMSApiError) {
    console.log(err.message); // "运单不存在"
  }
}

// Change it later
client.setLanguage('th');

// Or scope a single call without mutating the original client
const zhClient = client.withLanguage('zh');
await zhClient.waybills.get('UNKNOWN123');
```

## Available Resources

| Resource | Property | Description |
|----------|----------|-------------|
| **Waybills** | `client.waybills` | Shipping orders, labels, packages, tracking |
| **Billings** | `client.billings` | Billing records |
| **Invoices** | `client.invoices` | Invoice management, issuing, email |
| **Payments** | `client.payments` | Payments, bank slips, FlashPay |
| **Rate Cards** | `client.rateCards` | Pricing rate cards |
| **Sender Accounts** | `client.senderAccounts` | Sender accounts and addresses |
| **Billing Profiles** | `client.billingProfiles` | Automated billing cycles |
| **Delivery Events** | `client.deliveryEvents` | Delivery events and POD photos |
| **Reports** | `client.reports` | Financial reports |
| **Quotes** | `client.quotes` | FTL/LTL shipping quotations |

## Usage Examples

### Waybills

```typescript
// Create a waybill
const waybill = await client.waybills.create({
  outTradeNo: 'ORDER-001',
  // ... see Quick Start for full example
});

// Get tracking events
const events = await client.waybills.getEvents('TH24020001');
console.log('Status:', events.state);
console.log('Events:', events.routes);

// Cancel a waybill
await client.waybills.cancel('TH24020001');

// Get shipping label (PDF)
const label = await client.waybills.getLabel('TH24020001');
import { writeFileSync } from 'fs';
writeFileSync('label.pdf', Buffer.from(label));

// Get label for a specific package
const pkgLabel = await client.waybills.getLabel('TH24020001', { packageId: 'pkg-uuid' });

// Batch print labels for multiple waybills
const batchPdf = await client.waybills.getBatchLabel(['TH24020001', 'TH24020002']);
writeFileSync('batch-labels.pdf', Buffer.from(batchPdf));

// Add package to existing waybill
const pkg = await client.waybills.addPackage('TH24020001', {
  external_package_no: 'PKG-002',
  weight: 2.5,
  products: [{ name: 'Keyboard', sku: 'SKU-002', quantity: 1 }]
});

// Additional services
const services = await client.waybills.listAdditionalServices('TH24020001');
await client.waybills.addAdditionalServices('TH24020001', ['service-uuid']);
await client.waybills.updateAdditionalService('TH24020001', 'record-id', {
  status: 'completed',
  result: { photo_urls: ['https://...'] }
});

// Consolidate multiple waybills
const consolidated = await client.waybills.consolidate({
  waybill_ids: ['uuid-1', 'uuid-2'],
  external_waybill_no: 'CONSOL-001',
  sender: { id: 'sender-uuid' },
  recipient: {
    name: 'John Doe',
    phone: '0812345678',
    address: { street_line: '456 Road', city: 'Bangkok', state: 'Bangkok', zip_code: '10900' }
  },
  service_id: 'service-uuid'
});
```

### Billings

```typescript
// List billing records
const billings = await client.billings.list({
  status: 'pending',
  date_from: '2024-01-01',
  date_to: '2024-01-31',
  page: 1,
  pageSize: 20
});

// Create a billing record
const billing = await client.billings.create({
  rate_card_id: 'rate-card-uuid',
  contractor_id: 'contractor-uuid',
  waybill_id: 'waybill-uuid',
  quantity: 1
});

// Update a billing record
await client.billings.update(billing.id, { status: 'draft' });

// Send billing email
await client.billings.sendEmail({
  recipient_email: 'finance@example.com',
  billing_ids: ['billing-id-1', 'billing-id-2'],
  subject: 'Billing Statement'
});
```

### Invoices

```typescript
// List invoices
const invoices = await client.invoices.list({
  status: 'issued',
  contractor_id: 'contractor-uuid'
});

// Create an invoice
const invoice = await client.invoices.create({
  contractor_id: 'contractor-uuid',
  period_start: '2024-01-01',
  period_end: '2024-01-31',
  billing_ids: ['billing-1', 'billing-2'],
  tax_rate: 7
});

// Issue the invoice with a due date
await client.invoices.issue(invoice.id, { due_date: '2024-03-01' });

// Send invoice via email
await client.invoices.sendEmail(invoice.id, {
  recipient_email: 'billing@customer.com',
  cc_emails: ['accounts@customer.com'],
  subject: `Invoice ${invoice.invoice_no}`
});

// Add/remove line items
await client.invoices.addLineItems(invoice.id, ['billing-3']);
await client.invoices.removeLineItems(invoice.id, ['billing-1']);
```

### Payments

```typescript
// List payments
const payments = await client.payments.list({
  status: 'verified',
  from_date: '2024-01-01',
  to_date: '2024-01-31'
});

// Create a payment
const payment = await client.payments.create({
  amount: 5000,
  payment_method: 'bank_transfer',
  payment_date: '2024-02-01',
  contractor_id: 'contractor-uuid',
  allocations: [
    { invoice_id: 'invoice-1', amount: 3000 },
    { invoice_id: 'invoice-2', amount: 2000 }
  ]
});

// Manage allocations
const allocations = await client.payments.getAllocations(payment.id);
await client.payments.replaceAllocations(payment.id, [
  { invoice_id: 'invoice-1', amount: 5000 }
]);

// Bank slip management
await client.payments.uploadSlip(payment.id, {
  slip_url: 'https://storage.example.com/slip.jpg',
  bank_name: 'Bangkok Bank',
  transfer_date: '2024-02-01',
  transfer_amount: 5000
});
const slip = await client.payments.getSlip(payment.id);
await client.payments.verifySlip(payment.id, { verified: true, verification_notes: 'OK' });

// FlashPay QR payment
const qr = await client.payments.initiateFlashPay({
  amount: 5000,
  flashpay_type: 'qr',
  contractor_id: 'contractor-uuid',
  allocations: [{ invoice_id: 'invoice-1', amount: 5000 }]
});

// FlashPay mobile banking
const app = await client.payments.initiateFlashPay({
  amount: 5000,
  flashpay_type: 'app',
  flashpay_bank_code: 'bbl',
  contractor_id: 'contractor-uuid',
  allocations: [{ invoice_id: 'invoice-1', amount: 5000 }]
});
```

### Rate Cards

```typescript
// List rate cards
const rateCards = await client.rateCards.list({
  service_id: 'service-uuid'
});

// Create a rate card
const rateCard = await client.rateCards.create({
  name: 'Express Delivery',
  unit_price: 75.00,
  service_id: 'service-uuid',
  description: 'Same-day delivery rate'
});

// Update rate card
await client.rateCards.update(rateCard.id, {
  unit_price: 80.00,
  service_id: 'new-service-uuid'
});
```

### Sender Accounts

```typescript
// List sender accounts
const accounts = await client.senderAccounts.list({
  search: 'Acme',
  is_active: true
});

// Create a sender account
const account = await client.senderAccounts.create({
  name: 'Acme Corp',
  company_name: 'Acme Corporation',
  email: 'shipping@acme.com',
  phone: '0812345678'
});

// Manage addresses
const addresses = await client.senderAccounts.listAddresses(account.id, {
  address_type: 'pickup'
});

const address = await client.senderAccounts.createAddress(account.id, {
  street_line: '123 Sukhumvit Road',
  city: 'Bangkok',
  state: 'Bangkok',
  zip_code: '10110',
  address_type: 'pickup',
  is_default: true
});

await client.senderAccounts.updateAddress(account.id, address.id, {
  address: { street_line: '456 New Road' },
  is_default: true
});

await client.senderAccounts.deleteAddress(account.id, address.id);
```

### Billing Profiles

```typescript
// Create a billing profile
const profile = await client.billingProfiles.create({
  contractor_id: 'contractor-uuid',
  billing_type: 'consolidated',
  billing_cycle: 'monthly',
  cycle_day: 1,
  payment_terms: 'net_30',
  default_tax_rate: 7,
  auto_issue: true
});

// List billing profiles
const profiles = await client.billingProfiles.list({
  is_active: true,
  billing_type: 'consolidated'
});

// Update a billing profile
await client.billingProfiles.update(profile.id, {
  auto_issue: false,
  payment_terms: 'net_60'
});

// View cycle history
const cycles = await client.billingProfiles.listCycles(profile.id, {
  status: 'completed'
});

// Manually trigger a billing cycle
const result = await client.billingProfiles.triggerCycle(profile.id, {
  as_of_date: '2024-02-01'
});
```

### Delivery Events

```typescript
// Create a delivery event
const event = await client.deliveryEvents.create({
  waybill_id: 'waybill-uuid',
  event_type: 'delivered',
  notes: 'Left at front door',
  photos: ['base64-encoded-image...']
});

// Upload POD photos
const blob = new Blob([photoBuffer], { type: 'image/jpeg' });
await client.deliveryEvents.uploadPods(event.id, [blob]);

// Delete a POD photo
await client.deliveryEvents.deletePod(event.id, 'https://storage.example.com/photo.jpg');
```

### Reports

```typescript
// Billing by service
const billingReport = await client.reports.billingByService({
  date_from: '2024-01-01',
  date_to: '2024-12-31',
  contractor_id: 'contractor-uuid'
});

// Outstanding invoices
const outstanding = await client.reports.outstandingInvoices({
  status: 'overdue'
});

// Payment history
const history = await client.reports.paymentHistory({
  date_from: '2024-01-01',
  date_to: '2024-12-31'
});

// Revenue summary
const revenue = await client.reports.revenueSummary({
  date_from: '2024-01-01',
  date_to: '2024-12-31',
  period: 'monthly'
});

// Download CSV reports
const csv = await client.reports.billingByServiceCSV({
  date_from: '2024-01-01',
  date_to: '2024-12-31'
});
writeFileSync('report.csv', Buffer.from(csv));
```

### Quotes

```typescript
// Addresses must carry coordinates — quoting never geocodes for you. Resolve
// free text first and judge the match yourself.
const from = await client.address.resolve({ address: '123 Sukhumvit Rd, Bangkok' });
const to = await client.address.resolve({ address: '456 Nimman Rd, Chiang Mai' });
if (from.confidence < 0.7 || to.confidence < 0.7) {
  throw new Error('Address too vague to price — ask the customer to confirm.');
}

// Create an FTL/LTL shipping quotation. To bind it to a sender account of your
// organization, pass `{ senderAccountId }` as the second argument.
const quote = await client.quotes.create({
  request_id: 'req-123',
  pickup: { address: from.formatted_address ?? '', lat: from.lat, lng: from.lng },
  delivery: { address: to.formatted_address ?? '', lat: to.lat, lng: to.lng },
  items: [
    { qty: 2, length_cm: 100, width_cm: 80, height_cm: 60, weight_kg: 25 }
  ]
});

console.log(quote.quotation_id, quote.vehicle);
console.log(`${quote.estimated_total} ${quote.currency}, valid until ${quote.expires_at}`);
console.log(quote.breakdown); // [{ kind: 'base', amount }, { kind: 'addon', key, amount }]
```

> `request_id` is your own correlation ID (e.g. your cart/order ID), echoed back
> and stored on the quotation — there is no entity to create in the TMS first.
> Quoting is read-only, so repeating a request is harmless.

> Shipment totals are always derived from `items`, and how full a vehicle may be
> loaded is decided server-side: a shipment may use the full rated weight and
> volume, and whether it really fits is settled by a 3D pack that leaves
> clearance around every item. Neither is a request parameter.

> `client.address.resolve()` always returns a result, falling back as far as a
> province centroid (`confidence` 0.32, `source` `province_centroid`). Check
> `confidence` before pricing — that judgement is deliberately yours, since only
> you know how much a wrong pickup point costs.

> Quote creation (`POST /api/quotes`) uses your API key (signature auth). The
> customer-facing quote operations (view, pay, cancel, order tracking) are
> authenticated with a sender-account session, not an API key, so they are not
> exposed by this server-to-server SDK.

## Error Handling

The SDK throws `TMSApiError` for all non-2xx responses. For modern (RESTful) endpoints, `error.code` is the HTTP status code. For legacy endpoints, `error.code` may be a legacy error code (see below).

```typescript
import { TMSClient, TMSApiError } from '@alphacargo/tms-sdk';

try {
  const waybill = await client.waybills.create({ ... });
} catch (error) {
  if (error instanceof TMSApiError) {
    console.error('API Error:', error.message);
    console.error('HTTP Status:', error.statusCode); // e.g. 400, 404, 422, 500
    console.error('Details:', error.details);
  } else {
    throw error;
  }
}
```

### Common HTTP Status Codes

| Status | Description |
|--------|-------------|
| `400` | Bad request / validation error |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate waybill) |
| `422` | Unprocessable entity |
| `500` | Internal server error |

### Legacy Error Codes

Legacy error codes are only returned when using the legacy response format (enabled via the `X-Legacy-Response: true` header). They apply only to waybill creation, cancellation, label, and tracking endpoints.

| Code | Description |
|------|-------------|
| `0` | Success |
| `-1` | System error |
| `1000` | Invalid parameters |
| `1001` | Invalid merchant ID |
| `1002` | Invalid signature |
| `1003` | Duplicated waybill |
| `1004` | Origin not found |
| `1005` | Destination not found |
| `1006` | Waybill not found |
| `1007` | No carrier assigned |
| `1008` | Duplicated package |

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions. All request and response types are exported:

```typescript
import type {
  CreateWaybillRequest,
  CreateWaybillResponse,
  WaybillEvents,
  Invoice,
  Payment,
  BillingProfile,
  DeliveryEvent,
  // ... and more
} from '@alphacargo/tms-sdk';
```

## License

MIT
