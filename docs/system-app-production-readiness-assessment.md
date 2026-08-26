# Chapman Prestige: Operations System and Mobile App Assessment

**Assessment date:** 26 August 2026  
**Scope:** Read-only review of the authorised Chapman operations system and comparison with the existing Chapman Prestige mobile client. No live records, settings, payments, staff accounts, or services were changed.

## Executive conclusion

Chapman already has a capable **staff operations system**. It manages orders, services and pricing, clients, staff, payment balances, receipts, reports, access control, and system settings. The mobile app now offers a strong **customer experience**: service discovery, richer request forms, date preference, appointment-response states, routines, payment preference, visible progress, loyalty, chat, and notifications.

The two products should be connected, but **not by giving the app direct access to the existing operational tables**. Today the app should remain local-first until a secure identity and customer-access layer is in place. The system has three immediate production blockers: customer-record security, least-privilege staff permissions, and a canonical order/event model that both staff and customers can consume safely.

> **Recommended architecture:** The operations system remains the internal source of truth. The mobile app talks only to a narrow customer API or Supabase policies that expose the authenticated customer’s own records, public service catalogue, approved appointment information, and permitted service events.

| Area | Current strength | Readiness for direct app connection | Decision |
| --- | --- | --- | --- |
| Service catalogue and laundry price list | Strong staff configuration with 82 items and 18 categories | Medium | Publish a controlled customer-safe catalogue API/read policy. |
| Internal order workflow | Strong multi-stage process from received to completed | Medium | Add customer-safe event history, timestamps, assignment, and appointment state. |
| Customer identity | Client records exist, but visible data quality is inconsistent | Low | Introduce verified phone authentication and a one-to-one customer identity link. |
| Payments and receipts | Balances, receipts, and payment states exist | Low | Add immutable payment events and provider references before real mobile payments. |
| Staff availability | Basic staff status and roles exist | Low | Add skills, capacity, shifts, location, and assignment acceptance. |
| Mobile chat and notifications | Customer-side screens exist | Low | Create a ticket/message model and notification-event pipeline. |
| Security | Security and role screens exist | Critical | Redesign roles and Row Level Security before exposing any customer data. |

## What the operations system does well

The internal system already provides the operational backbone needed for Chapman. The Orders page supports search, date filters, service and payment filters, list and pipeline views, exports, worker assignment visibility, and a detailed laundry workflow: **Received, In Queue, Washing, Drying, Ironing, Packaging, Ready, Out for Delivery, and Completed**. This maps well to the app’s booking progress concept. [1]

The service catalogue is also a valuable foundation. It exposes categories, item-level pricing, active states, tier discounts, express pricing, and custom-price items. This should replace the mobile app’s duplicated static catalogue once a customer-safe reading path is available. [2]

The staff system also already has client records, payment balances, receipts, reporting, business settings, branch inheritance, staff roles, audit-log surfaces, and administration controls. These are the correct internal capabilities to preserve as Chapman grows. [3] [4] [5]

## What must improve in the operations system

### 1. Make customer data safe before any mobile sync

This is the most important change. The current app integration notes confirm that `public.clients` has Row Level Security disabled. That cannot continue once customers access their own bookings on a phone. An authenticated customer must never be able to list other customers, orders, addresses, payment balances, or staff information. [6]

Create a dedicated customer identity model:

| Required data object | Minimum fields | Purpose |
| --- | --- | --- |
| `customer_accounts` | `auth_user_id`, `client_id`, verified phone, email, status | Maps one authenticated mobile user to one Chapman client record. |
| `client_addresses` | client ID, label, address text, GPS coordinates, service notes, default flag | Supports pickup, home services, and location-specific pricing. |
| `customer_consents` | marketing consent, notifications consent, policy version, timestamps | Supports legal and respectful communication. |
| `customer_devices` | client ID, push token, platform, active timestamp | Supports booking and promotional push notifications. |

**System change:** Normalize all client phone numbers to E.164 format, resolve duplicate records, flag incomplete walk-in records, and prevent a phone number from being silently reused across customer accounts. The observed client list contains zero-phone entries and duplicate-like names, so it is not ready for automatic matching. [3]

### 2. Split staff roles into real operational permissions

The current Security screen visibly grants the Worker role broad access across system administration, security, settings, clients, payments, staff, and orders. That is too broad for production. [5]

Replace broad roles with task-based roles and server-side enforcement:

| Role | May do | Must not do |
| --- | --- | --- |
| Dispatcher | Confirm appointments, assign staff, update dispatch stage | Change prices, read finance reports, manage system access. |
| Laundry Technician | Update assigned laundry stages and attach service notes | View all clients, payments, staff, or system settings. |
| Field Technician | Accept assigned cleaning, fumigation, detailing, fabric, or tank jobs; mark arrival/completion | View unrelated orders or financial data. |
| Courier | View assigned pickup/delivery stops and update handoff status | Edit services, prices, client records, or payment history. |
| Finance | Record and reconcile payments, issue receipts, resolve refunds | Alter staff roles or operations settings. |
| Customer Support | View customer tickets and assigned orders | Access system administration or payment configuration. |
| Manager | See branch operations and approve exceptions | Change platform-level roles or secrets. |
| System Administrator | Manage roles, policies, integrations, and audits | Use only for a very small trusted group. |

### 3. Turn the order pipeline into a shared event timeline

The workflow stages are good, but the mobile client needs more than a current stage. Add an immutable `order_events` stream:

| Event | Produced by | Shown to customer? |
| --- | --- | --- |
| Request received | Customer or staff | Yes |
| Date proposed | Dispatcher | Yes, requires accept/reject |
| Date accepted or rejected | Customer | Yes |
| Quote created / revised / approved | Staff and customer | Yes |
| Worker assigned | Dispatcher | Yes, restricted worker profile |
| Worker accepted job | Worker | Yes |
| On the way / arrived / work started | Assigned worker | Yes, subject to location policy |
| Stage updated | Assigned staff | Yes, simplified language |
| Payment requested / confirmed / failed | Payment service | Yes |
| Completion verified | Staff or customer | Yes |
| Issue raised | Customer or staff | Yes to relevant parties |

Every event should include `order_id`, timestamp, actor type, actor ID, previous state, new state, customer-visible message, and internal note. This is the source for the app’s live progress screen, notifications, support context, and activity history.

### 4. Add appointment capacity and acceptance to the staff system

The app already lets clients request dates and accept or reject confirmed dates. The staff system must now own the scheduling rules. Add service duration, travel buffer, branch, operating hours, blackout dates, capacity per time slot, transport zone, and assigned team. A requested date is not a confirmed booking until a dispatcher assigns an available capacity slot and the customer accepts it.

This is especially important for cleaning, fumigation, detailing, fabric care, polytank sanitisation, and contract cleaning. Laundry can retain fast pickup slots, while assessments need a different appointment type.

### 5. Expand quote-based service data instead of putting it only in notes

The current staff New Order form is excellent for staff-entered laundry item orders but does not visibly capture the richer mobile assessment data. The system should store structured fields, not only free text.

| Service | Add structured fields in the system | App should send |
| --- | --- | --- |
| Deep Cleaning | property type, bedroom count, rooms, occupancy, condition, requested date, photos | Assessment answers, address, preferred appointment. |
| Fumigation | multi-select pests, building type, area estimate, previous treatment, urgency | Selected pests, property context, notes, photos. |
| Car Detailing | vehicle class, service package, add-ons, service location, access needs | Vehicle and location choice, requested slot. |
| Sofa and Carpet | furniture type/count, carpet dimensions, stain/odour options, measurement photos | Camera-assisted estimate and manual dimensions. |
| Polytank | tank size, location, access, water availability, safety notes | Tank size and service-location details. |
| Contract Cleaning | facility type, explicit facility examples, required cleaner count, preferred gender, shift times, frequency, supervisor needs | Structured staffing request, not a single general quote. |

### 6. Repair payment integrity before enabling mobile payment confirmation

The payments page is useful operationally, but the observed records contain repeated `PAY-000` identifiers and a historical negative balance. The app must not treat a selected payment preference as a completed payment. [4]

Implement a payment ledger with immutable transactions. Each transaction needs a unique identifier, provider, provider reference, payment method, amount, currency, status, timestamp, receiver or collector, and link to an order. Support partial payments, refunds, reversals, receipts, reconciliation, and failed or abandoned Mobile Money/card attempts. Only the payment provider webhook or an authorised finance action should mark a payment as completed.

### 7. Add a proper support inbox and campaign system

The app has Chapman AI, Admin, CEO, and Contact Us entry points. The operations system needs the matching staff-side capability:

- `conversation_threads` linked to client and optional order;
- message ownership, assignment, SLA, internal notes, and closing status;
- routing rules for Admin, CEO escalation, finance, and operational support;
- templates for appointment confirmation, payment reminders, delays, completion, and review requests;
- announcement campaigns with audience, segment, schedule, approval, consent check, and delivery results.

Daily promotions, holiday updates, and celebration pop-ups should come from a controlled campaign record, not hard-coded mobile content. The existing app can keep a local fallback, but production messages should originate from the system.

### 8. Improve staff and service fulfilment information

The staff table tracks availability and performance but needs worker capabilities. Add profile photo, skills and certifications, permitted service categories, preferred work areas, assigned branch, vehicle type, active job limit, working hours, leave, live availability, gender if operationally necessary, and customer-safe profile content. Never expose personal phone numbers or internal performance records to customers.

## What must improve in the mobile app

The mobile app should remain visually as approved. Its next changes are primarily **data and truthfulness**, not a visual redesign.

| Mobile feature | Current state | Required production change |
| --- | --- | --- |
| Services and prices | Local typed catalogue and pricing | Read the customer-safe operations catalogue, cache it, and show when data was last refreshed. |
| Booking and quotes | Local booking flow with good service-specific detail | Submit to a server-side booking API, display a real request reference, and handle validation errors. |
| Date confirmation | Customer-facing accept/reject UI exists | Bind to dispatcher-proposed appointments and prevent edits once confirmed. |
| Tracking | Polished live-style stages | Subscribe only to the user’s `order_events`; replace simulated status with real timestamps and assigned staff. |
| Payments | Preference selector exists | Show “payment choice” until a verified transaction confirms payment; open provider checkout safely. |
| Loyalty and routines | Presentational/local | Calculate from completed paid orders on the server; make rewards auditable. |
| AI and human chat | AI endpoint and contact routes exist | Persist threads in the operations system and make Admin/CEO messages reach assigned people. |
| Notifications | Local in-app announcements and local schedule | Use campaign and order-event delivery; use a development build for Android remote push, not Expo Go. |
| Worker marketplace | Customer-facing presentation | Use real vetted worker profiles only after worker consent and permissions are defined. |
| Measurement | Camera-assisted estimate plus manual fallback | Upload measurement evidence to protected storage and mark it as an estimate until staff approval. |

## What both products must share

The system and mobile app must agree on the following contracts. These are the actual integration boundary.

| Shared contract | System owns | App receives or sends |
| --- | --- | --- |
| Customer identity | Authenticated client-account relationship | Secure session and its own profile only. |
| Service catalogue | Prices, active state, price effective date, add-ons, quote rules | Read-only display and validated selections. |
| Booking request | Canonical request and order identifiers | Creation request and status view. |
| Appointment | Capacity, confirmation proposal, team allocation | Preferred slots and accept/reject decision. |
| Order events | Immutable operational events | Filtered live timeline for that customer’s order. |
| Payment ledger | Financial truth and receipt | Checkout intent and read-only final state. |
| Messages | Assigned staff conversation thread | Customer messages and permitted replies. |
| Announcements | Approved campaign and delivery rules | Consented message display and delivery acknowledgement. |
| Documents and photos | Protected storage ownership and retention | Upload only with signed, scoped permission. |

## Recommended implementation sequence

### Phase A: Foundation and data safety

1. Enable Row Level Security for customer-facing tables and implement the verified `auth.users.id` to client mapping.
2. Audit and clean client identifiers, phone numbers, duplicate records, payment IDs, and invalid balances.
3. Replace broad Worker permissions with task-based roles and server-side checks.
4. Add an audit record for status, appointment, price, payment, and staff-assignment changes.

### Phase B: One real booking journey

1. Publish the live service catalogue to the app through a safe read boundary.
2. Implement a server-side `createBookingRequest` procedure that validates service, prices, customer identity, appointment preference, and address.
3. Add dispatcher review, appointment proposal, customer accept/reject, worker assignment, and customer-visible `order_events`.
4. Replace the app’s local booking data for **Laundry first**, then use the same framework for Deep Cleaning and Fumigation.

### Phase C: Payment, support, and communications

1. Implement a real payment ledger and connect the chosen Mobile Money/card provider through server-side webhooks.
2. Deliver receipts and payment updates to the app.
3. Create support conversations, team routing, and customer-safe messages.
4. Add campaign management and push-notification delivery after consent.

### Phase D: Operational intelligence

1. Add staff skills, capacity, location, schedules, and acceptance events.
2. Integrate real worker assignment and customer-safe tracking.
3. Make loyalty, saved routines, referrals, and reviews derive from completed service and payment records.
4. Reconcile dashboards, reports, payments, and order totals through tested business rules.

## Decisions required from Chapman before implementation

1. **Customer authentication:** Is verified phone OTP the primary login, with email optional? This is recommended for the current client database.
2. **Order model:** Should a quote request become an order immediately, or should it stay a `booking_request` until staff approve a quote? The second option is recommended.
3. **Payment provider:** Which Ghana-ready provider will process Mobile Money and cards, and who owns its business account?
4. **Delivery policy:** Which services receive customer live location, and at what stage? For safety, show only broad “on the way” status unless a customer explicitly opts in.
5. **Support ownership:** Which staff account receives Admin, CEO, finance, and operational messages, and what response time is promised?
6. **Loyalty rules:** Are rewards based on completed paid value, service count, subscription tenure, or referral conversion?
7. **Data retention:** How long should Chapman retain service photos, measurement photos, customer addresses, and location events?

## Priority list

| Priority | Work | Where it belongs |
| --- | --- | --- |
| P0 | Customer identity mapping, RLS, and staff least-privilege roles | System and database |
| P0 | Data cleanup for clients, payment IDs, and balances | System and database |
| P0 | Server-side booking request and customer-safe order reads | Both |
| P1 | Appointment proposal and acceptance plus shared order events | Both |
| P1 | Payment ledger, provider webhook, and verified receipts | Both |
| P1 | Support inbox and campaign management | System, then app |
| P2 | Staff skills, availability, capacity, and assignment acceptance | System |
| P2 | Real-time customer tracking, rewards, and review automation | Both |

## References

[1]: https://laundry-app-git-master-chapman-website-s-projects.vercel.app/orders "Chapman Operations: Orders"
[2]: https://laundry-app-git-master-chapman-website-s-projects.vercel.app/services "Chapman Operations: Services and Pricing"
[3]: https://laundry-app-git-master-chapman-website-s-projects.vercel.app/clients "Chapman Operations: Clients"
[4]: https://laundry-app-git-master-chapman-website-s-projects.vercel.app/payments "Chapman Operations: Payments"
[5]: https://laundry-app-git-master-chapman-website-s-projects.vercel.app/security "Chapman Operations: Security"
[6]: ./supabase-integration.md "Chapman mobile client Supabase integration boundary"
