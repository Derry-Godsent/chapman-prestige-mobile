# Chapman Operations System: GitHub Code Review

**Repository reviewed:** `Derry-Godsent/laundry-app` on the `master` branch.  
**Review scope:** Read-only code review to determine whether the current system can safely support the mobile app. No GitHub changes, database changes, deployment changes, or credential changes were made.

## What the repository is

The repository is the Chapman staff operations system currently visible on the protected Vercel deployment. It is a Vite/React/TypeScript browser application using Supabase JavaScript directly from the front end. The repository also contains an unrelated legacy-looking REST client abstraction, but the visible operational pages use direct Supabase calls.

| Finding | Evidence in repository | Consequence for mobile integration |
| --- | --- | --- |
| Staff dashboard is a browser-only Vite/React application | Root `package.json`, `src/router.tsx` | It is suitable as a staff interface, but it is not a secure server API for the mobile app. |
| Supabase is called directly from browser pages | `src/pages/OrderBuilder.tsx`, `src/pages/Services.tsx`, `src/pages/Payments.tsx`, `src/pages/Staff.tsx` | Database rules, not interface visibility, must enforce all access. |
| Current browser key is a publishable client key | `src/lib/supabaseClient.js` | A publishable key is normal in a browser, but it is safe only when RLS policies are complete and tested. |
| Route guard checks only whether a session exists | `src/router.tsx` | A logged-in user can reach staff routes unless database and page-level role controls deny access. |
| Permission hook reads role and permissions in browser | `src/hooks/usePermission.ts` | This controls the interface only. A determined client can call Supabase directly unless RLS enforces the same rule. |
| New Order inserts into `orders` and `order_items` from browser code | `src/pages/OrderBuilder.tsx` | Client-side totals and direct writes cannot become the mobile booking contract. |
| No migrations, SQL policies, Edge Functions, or server backend are versioned in this repository | Repository structure review | The database currently cannot be safely evolved and audited through the repository alone. |
| API helper files exist but are not the active visible data path | `src/api/*`, `src/utils/constants.ts` | Do not build the mobile connection on this unverified legacy path; choose one secure approach. |

## The most important code-level risk

The staff order builder currently calculates totals in the browser and directly writes the resulting `total_due`, `amount_paid`, discounts, and order items to Supabase. That is acceptable only for a tightly controlled internal prototype with robust database policies and server-side checks. It is not a safe model for a public mobile app.

> **Do not connect the mobile app to `orders` or `order_items` with direct insert permissions.** A customer could otherwise tamper with item prices, totals, another client ID, payment amount, or order state.

The right fix is additive: keep the existing staff order builder for staff use, but add a server-side **customer booking procedure**. It validates the authenticated customer, current service price, selected items, service zone, appointment preference, and payment intent before creating a `mobile_request` or approved order.

## Can this codebase support the app without destroying existing functions?

**Yes, but only through an additive integration layer.** The existing staff pages can remain intact. The safe route is not a rewrite.

| Keep unchanged at first | Add beside it | Why this avoids breaking operations |
| --- | --- | --- |
| Existing Orders, New Order, Staff, Clients, Services, Payments, Reports | New `Mobile Requests` page and related tables | Staff walk-ins and current workflows keep operating while app requests are handled separately. |
| Existing staff login | Customer phone-OTP account model | Staff and customers do not share roles or permissions. |
| Existing Services catalogue page | Customer-safe catalogue view/function | Staff remain able to manage prices; app receives only approved fields. |
| Existing Order pipeline | `order_events` customer timeline | Internal stages stay intact; app sees simplified, filtered events. |
| Existing Payments page | Payment intents and verified payment transactions | Staff cash records remain; app payment selection cannot falsely mark an order as paid. |
| Existing Staff page | Assignments, availability, skills, and customer-safe profiles | Internal employee data is not exposed to app users. |

## Required architecture before code changes

### 1. Versioned database migrations

Create a `supabase/migrations` directory in the system repository and manage all new tables, policies, indexes, functions, and backfills through reviewed SQL migrations. Never make production-only schema changes from browser code.

### 2. Separate staff and customer access models

Use one Supabase project if desired, but create separate data ownership and RLS policies:

- Staff can use staff routes only through assigned role claims or a staff table linked to `auth.users`.
- A customer can read and update only their own profile, addresses, requests, orders, payment receipts, and message threads.
- A customer cannot read `staff` records except a deliberately limited projection for the team assigned to their own order.
- Customers cannot directly create a final order, modify pricing, mark payment as complete, or update workflow stages.

### 3. Server-side customer functions

Add Supabase Edge Functions or a protected backend service for these operations:

| Function | Caller | Validates | Writes |
| --- | --- | --- | --- |
| `create-mobile-request` | Authenticated customer | Service availability, price, client link, request schema, address | `mobile_requests`, requested service detail, event |
| `propose-appointment` | Dispatcher | Staff role, capacity, appointment state | `appointments`, event, notification |
| `respond-to-appointment` | Request owner | Customer ownership, state transition | appointment state, event |
| `create-quote` | Assessor/dispatcher | Staff role, request data, quote calculation | quote and line items, event |
| `respond-to-quote` | Request owner | Customer ownership, quote expiry | quote state, order conversion when accepted |
| `create-payment-intent` | Request/order owner | Total from server, payment eligibility | payment intent |
| `payment-webhook` | Payment provider only | Provider signature and transaction status | immutable payment transaction, receipt event |
| `send-message` | Customer/staff | Conversation membership and queue assignment | message and notification event |

### 4. One canonical event stream

Every important action should append an `order_events` or `request_events` record. The staff dashboard can remain visually unchanged at first, but its updates should call the same event function. The app subscribes only to events belonging to the authenticated customer’s request or order.

## Immediate code changes recommended in the staff repository

| Priority | Change | Location or new area | Why |
| --- | --- | --- | --- |
| P0 | Add migrations and RLS tests before exposing any customer data | New `supabase/migrations`, integration test suite | Removes the current highest security risk. |
| P0 | Replace direct mobile-order creation with `create-mobile-request` Edge Function | New `supabase/functions/create-mobile-request` | Stops client-calculated prices and unauthorised direct writes. |
| P0 | Add `Mobile Requests` staff route | New `src/pages/MobileRequests.tsx` and router/menu entry | Gives staff a real queue for phone bookings. |
| P0 | Add `Appointments` detail panel and status changes | New request/appointment components | Supports customer date choice and accept/reject. |
| P0 | Enforce permissions in RLS and functions, not just `usePermission` | Database policies plus server functions | Browser permission controls alone are bypassable. |
| P1 | Add quote and measurement modules | New `QuoteRequests`, `QuoteBuilder`, attachment storage | Supports Deep Cleaning, Fumigation, Fabric, Detailing, Polytank, and Contracts. |
| P1 | Add Payment Intent and provider webhook handling | Edge Functions and payment tables | Makes MoMo/Card truthfully confirmed. |
| P1 | Add Inbox, Campaigns, and Notification Outbox | New system pages and event delivery jobs | Supports Admin/CEO/Contact chat and app promotions. |
| P2 | Add routines, loyalty ledger, and marketplace requests | New tables/pages | Supports retention and marketplace features after core booking works. |

## What I would not change during the first integration phase

I would not replace the current Orders, New Order, Services, Payments, Reports, or Staff pages. I would not change historic order data, payment data, staff identities, or service prices. I would not change deployment settings or authentication credentials. Each new mobile table and function would be introduced alongside existing features, then tested with a small set of real staff test accounts and a test customer account.

## Safe implementation sequence

1. **Back up and baseline:** export database schema, confirm production project, record current RLS state, create a staging branch and migration workflow.
2. **Secure the data boundary:** link customer accounts to clients, clean duplicates, enable RLS, add staff roles, and write policy tests.
3. **Create mobile intake:** add `mobile_requests`, `appointments`, events, and a server-side create request function.
4. **Add staff handling:** build the Mobile Requests page and appointment proposal controls. Do not yet alter Orders.
5. **Link the app:** switch the app’s Laundry confirmation to create a secure request; show its real reference and real status events.
6. **Convert safely:** after staff/customer date confirmation, convert the request to the existing order record and preserve a link in both directions.
7. **Expand:** implement quotes, payments, chat, campaigns, loyalty, and marketplace in that order.

## Review conclusion

The GitHub code confirms that the system and app use the same Supabase project and that the staff system can be extended. It also confirms that a direct customer connection would be unsafe today because key operations are currently performed in the browser and the repository lacks versioned database policy/function code.

The correct next move is a dedicated, additive **integration branch** for the operations repository. It should begin with migrations, RLS tests, the Mobile Requests queue, and one working Laundry request journey. Once that is safe and demonstrably reliable, the mobile client can be connected without disturbing the existing staff system.
