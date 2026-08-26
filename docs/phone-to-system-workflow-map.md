# Chapman Mobile-to-System Workflow Map

**Purpose:** This document answers the practical question that the first assessment did not make explicit: **when a customer uses the phone app, exactly where does that interaction appear in the staff system, who handles it, and what new system feature is required?**

No live data or configuration was changed while preparing this map.

## The central correction

At the moment, the app has several attractive customer experiences that are **not yet backed by a staff workflow**. A button should never simply create a record in `Orders` and disappear. The system needs a controlled front door for phone activity.

> Add a new staff navigation item: **Mobile Requests**. It should sit between **New Order** and **Orders**. Every phone booking, quote request, schedule response, support message, measurement upload, worker request, and payment attempt enters through this queue before it becomes a confirmed operational order.

This prevents unreviewed phone requests from mixing with staff-created orders and gives the team a clear daily worklist.

## What happens when a customer books on the phone

### A. Fixed-price Laundry booking

| Customer action in app | Exact system destination | Staff action | What the app receives back |
| --- | --- | --- | --- |
| Selects garments, quantities, express care, pickup address, preferred date, and payment preference | `Mobile Requests` → **Laundry** queue | Dispatcher checks capacity, transport zone, price, and pickup slot | `request_received` event and Chapman reference number |
| Chooses a date | Request detail → **Appointment** panel | Dispatcher proposes a real time window and pickup team | `date_proposed` event |
| Accepts or rejects staff’s date | Appointment panel → **Waiting for customer** filter | Dispatcher sees accepted/rejected state; reschedules if rejected | `appointment_accepted` or `appointment_rejected` |
| Pays or chooses cash | Request/Order → **Payments** tab | Finance sees payment intent and, if paid, verified transaction | `payment_pending`, `payment_confirmed`, or `payment_failed` |
| Laundry is processed | Existing `Orders` pipeline | Assigned technician updates stages | Customer-safe progress events: received, queued, washing, drying, ironing, packing, ready, out for delivery, completed |
| Delivery is complete | Order detail → **Completion** tab | Courier/dispatcher records handoff; staff can request review | Completion event, receipt, loyalty credit if eligible |

**System addition needed:** When a laundry request is accepted, the system converts it to an Order while keeping the original mobile request and its customer-selected details linked. The current **New Order** form stays for walk-ins and staff-created orders; it is not the mobile booking inbox.

### B. Quote-based service booking

Deep Cleaning, Fumigation, Car Detailing, Sofa/Carpet, Polytank, and Contract Cleaning should not enter the pipeline as fully confirmed orders on the first tap.

| Customer action in app | Exact system destination | Staff action | Result |
| --- | --- | --- | --- |
| Sends assessment answers, preferred date, address, notes, and photos | `Mobile Requests` → **Quote Requests** queue | Dispatcher assigns assessor or creates a quote | Request is “Under review” |
| Selects multiple pests, car package, sofa/carpet size, polytank size, or cleaner preferences | Structured **Service Details** panel on request | Assessor sees fields, not a free-text note | Better quote and staff matching |
| Uses room/carpet measurement | Request → **Measurements & Photos** panel | Assessor reviews dimensions and evidence, marks accepted or needs review | App shows “Estimate reviewed” or asks for better information |
| Staff creates quote | Request → **Quote Builder** | Staff enters line items, visit date, expiry, deposit rule, and exclusions | App gets quote notification |
| Customer accepts/rejects quote | Quote Builder → **Awaiting Customer** | Staff sees decision; accepted quote converts to Order | Confirmed job and payment request |

**System addition needed:** Add `Quote Requests`, `Quote Builder`, and `Measurements & Photos` to the staff system. The current visible New Order form is not enough for mobile assessment work because it does not visibly store structured cleaning, pest, vehicle, upholstery, tank, or staffing data.

## The staff-side navigation that should be added

| New system area | Why it exists | Main users | Phone features it supports |
| --- | --- | --- | --- |
| **Mobile Requests** | Single intake for every app-generated request before operational confirmation | Dispatcher, Manager | Laundry bookings, quote requests, worker requests, support escalations |
| **Appointments** | Capacity, proposed slots, accept/reject state, team assignment, rescheduling | Dispatcher | Customer date picker and date acceptance/rejection |
| **Quotes** | Structured estimates, line items, approval, expiry, deposit rules | Assessor, Dispatcher, Manager | Quote-based services, price approval, pay-after-quote |
| **Dispatch Board** | Daily jobs by time, zone, team, status, and capacity | Dispatcher | Assignment, on-the-way updates, worker tracking |
| **Inbox** | Customer messages, AI escalation, Admin/CEO/Contact Us routing | Support, Admin, CEO delegate | Chat with Admin, CEO, and Contact Us |
| **Campaigns** | Promotions, holiday news, audiences, approvals, delivery results | Manager, Marketing | App announcement pop-up and remote notifications |
| **Payments Reconciliation** | Verified Mobile Money/card/cash outcomes and receipts | Finance | Payment preferences, payment confirmation, receipts |
| **Loyalty & Referrals** | Earning, redemption, expiry, referral audit trail | Manager, Finance, Support | Bonus card, rewards, activity history |
| **Marketplace Requests** | External worker categories and customer requests separate from internal employees | Marketplace coordinator | Worker Marketplace tab |

## Complete feature support map

The following is the direct answer to **“Which app features have no system support yet?”**

| Mobile feature already in the app | Existing system support | What is missing in the system | Exact staff workflow required | Priority |
| --- | --- | --- | --- | --- |
| Service catalogue and laundry prices | **Yes, partial** through Services & Pricing | Customer-safe published service feed, active dates, availability by branch/zone | Services → mark items `customer_visible`; sync approved catalogue | P0 |
| Laundry cart and express option | **Yes, partial** through New Order | Mobile source, pickup slot, address, customer identity, pre-confirmation queue | Mobile Requests → Laundry → convert accepted request to Order | P0 |
| Deep Cleaning request | **No, structured support absent** | Property fields, assessment, quote, appointment, photos | Mobile Requests → Quote Requests → Quote Builder → Dispatch | P0 |
| Fumigation multi-select pest request | **No, structured support absent** | Multiple pest types, severity, building size, prior treatment | Quote Request service form with multi-select and assessor checklist | P0 |
| Car Detailing package/location | **No, structured support absent** | Vehicle details, exact service location, access needs, add-ons | Quote Request → Detailing form → dispatcher appointment | P1 |
| Sofa/Carpet details | **No, structured support absent** | Furniture pieces, carpet size, stains/odour, images | Quote Request → Fabric form → Measurement review | P1 |
| Carpet/room camera-assisted estimate | **No** | Protected photo upload, dimensions, staff-review flag | Measurements & Photos tab on quote request | P1 |
| Polytank details | **No, structured support absent** | Tank size, access, location, water status, safety notes | Quote Request → Polytank form → assessment dispatch | P1 |
| Contract Cleaning | **No, structured support absent** | Explicit facility types, number of cleaners, preferred gender, age preference, shifts, frequency, supervisor request | Contract Inquiry → Staffing Plan → candidate/quote approval | P1 |
| Worker Marketplace | **No; Staff is internal only** | Public worker profiles, service categories, vetting, availability, request routing, rate rules | Marketplace Requests separate from employee Staff records | P1 |
| Preferred date | **No customer confirmation loop** | Slots, capacity, proposal, accept/reject, reschedule history | Appointments board with `requested`, `proposed`, `accepted`, `rejected`, `rescheduled` statuses | P0 |
| Live tracking | **Partial** through internal order stages | Time-stamped customer events, staff assignment, event visibility, safe location policy | Orders → Event Timeline + Dispatch Board | P0 |
| Worker profile in tracking | **Partial** through Staff records | Customer-safe display profile, job acceptance, photo, permitted details | Assignment record + customer profile projection | P1 |
| Mobile Money, Card, Cash selection | **Partial** through Payments | Provider integration, verified transaction, reference, webhook, refund/reversal | Payment Intent → provider → Reconciliation → receipt | P0 |
| Receipt and payment history | **Partial** through Payments and Receipt | Customer-owned receipt access and verified delivery | Orders/Payments → secure receipt link in app | P1 |
| Bonus and loyalty | **Partial** through client tiers | Earn/redeem ledger, rule engine, expiry, customer history | Loyalty & Referrals area attached to client/order/payment | P1 |
| Saved routines/subscriptions | **No** | Schedule, pause, skip, preferred days, recurring billing or reminder rule | Recurring Plans linked to client and service | P2 |
| Chat with Chapman AI | **No staff support** | Escalation-to-human rule, context history, audit, FAQ ownership | Inbox receives AI escalations and customer context | P1 |
| Chat with Admin | **No inbox** | Assigned conversation, reply ownership, SLA, order attachment | Inbox → Admin queue | P0 |
| Chat with CEO | **No controlled escalation inbox** | Delegation, privacy, escalation workflow, response owner | Inbox → Executive escalation queue | P2 |
| Contact Us | **No tracked support case** | Case number, assignment, response status | Inbox → General inquiry queue | P1 |
| Daily promotions/news/holiday pop-up | **No campaign manager visible** | Message authoring, audience, approval, consent, schedule, delivery, analytics | Campaigns → create, approve, target, send | P1 |
| Booking notifications | **Notification badge only** | Event-to-notification job, customer device tokens, retry and delivery history | Notification Outbox generated from order events | P0 |
| User profile, avatar, gender | **Partial** through Clients | Profile fields, preference controls, consent, verified identity link | Clients → Customer Account/Profile panel | P1 |
| Live location permission | **No** | Opt-in location policy, address, location events, retention period | Address book + Dispatch location consent rules | P2 |
| Light/dark mode | **App-only** | Nothing in staff system is required | Store on device or customer settings | No system work |
| Most-used services/activity | **Partial** through orders | Customer-visible analytics generated from owned completed orders | Client profile projection / app API | P2 |

## How staff will actually see a phone booking

This is the expected operational sequence, using a Laundry booking as the example.

1. **Customer taps “Confirm booking” in the app.**
2. The app calls a customer-safe server endpoint. It validates the authenticated user, live service price, address, item quantities, date preference, and payment choice.
3. The system creates `MBR-20260826-001` in **Mobile Requests**, not a final Order. Source is `mobile`, service is Laundry, and state is `requested`.
4. The dispatcher sees it on the **Mobile Requests** dashboard with address zone, requested date, subtotal, express flag, payment preference, and any note.
5. The dispatcher proposes a real time window. The request changes to `date_proposed`.
6. The customer gets a push and in-app alert, then accepts or rejects it.
7. On acceptance, the system creates the real `CPL-ORD-...` order, copies approved items and price, assigns a team or courier, and creates the initial timeline event.
8. The technician or courier updates assigned work stages only. Each change creates an internal event and a simplified customer event.
9. Finance receives the payment intent. Provider confirmation or an authorised cash collection creates the actual payment transaction and receipt.
10. On completion, the system can award loyalty, request a review, and optionally schedule a future routine.

The same pattern works for quotes, except the request spends time in **Quote Requests** and must be approved by the customer before it becomes an operational Order.

## The data records that must be added

| Record | Why it is needed | Minimum fields |
| --- | --- | --- |
| `mobile_requests` | Keeps unconfirmed phone activity separate from staff orders | source, client account, service, status, requested date, address, form payload, submitted time |
| `request_attachments` | Stores service photos and measurement evidence safely | request ID, storage key, type, customer visibility, uploaded time |
| `quotes` and `quote_lines` | Allows price approval instead of free-text estimates | request ID, version, expiry, line items, total, status, approved time |
| `appointments` | Gives dates a real scheduling lifecycle | request/order ID, requested slot, proposed slot, state, capacity, assignee |
| `order_events` | Feeds tracking, notifications, and activity | order ID, actor, event type, timestamp, customer message, internal note |
| `assignments` | Separates worker/job relationships from staff profiles | order ID, staff ID, role, accepted time, start/end time, location consent |
| `payment_intents` and `payment_transactions` | Separates choice of payment from a verified payment | order ID, method, provider, reference, status, amount, timestamp |
| `conversation_threads` and `messages` | Allows Admin/CEO/Contact Us chat to reach the right person | client ID, order ID optional, queue, owner, status, messages |
| `campaigns` and `campaign_deliveries` | Makes promotions and news manageable and auditable | audience, content, consent requirement, schedule, approval, delivery state |
| `loyalty_ledger` | Makes bonuses real and traceable | client ID, order ID, earn/redeem, amount, balance, expiry |
| `recurring_plans` | Supports saved routines and subscriptions | client ID, service, cadence, next run, state, default address |
| `marketplace_requests` | Separates external worker jobs from internal service fulfilment | client ID, worker category, location, request state, assigned provider |

## Meaning of “priority gap” in plain language

| Priority | Meaning | Chapman examples |
| --- | --- | --- |
| **P0: Do before live app booking** | Without it, the app can create unsafe, lost, misleading, or unmanageable requests | Secure customer login-to-client link, permissions, Mobile Requests queue, appointment acceptance, verified payments, order events, Admin inbox. |
| **P1: Build immediately after the booking flow works** | The feature can be shown, but is not reliable or useful without staff support | Quotes, worker assignment details, measurement review, campaigns, loyalty ledger, receipts. |
| **P2: Add after the service operation is stable** | Valuable growth features, but not required to safely receive the first real booking | Saved routines, external worker marketplace, CEO escalation process, opt-in live location, customer activity analytics. |

## Minimum first release: what will actually work end to end

For the first production release, do not attempt every service at once. Make these functions truly live:

1. Verified phone sign-in and a secure customer-to-client link.
2. Live service catalogue and fixed-price Laundry booking.
3. Mobile Requests queue, dispatcher date proposal, customer accept/reject, and Order conversion.
4. Customer-safe order timeline with Laundry stages and assignment.
5. Cash and one verified Mobile Money path, with real receipt delivery.
6. Admin support inbox attached to the booking reference.
7. Basic event notifications for request received, date proposed, accepted, ready, and completed.

After those seven items work, bring Deep Cleaning and Fumigation through the Quote Requests workflow. Then add car detailing, sofa/carpet, polytank, contracts, routines, marketplace, and broader campaigns.

## Decisions Chapman needs to make now

1. Should the staff system show a new **Mobile Requests** menu, or should that queue be named **Client App Requests**?
2. Who is the daily owner of the Mobile Requests queue: Admin, dispatcher, or a new customer-care officer?
3. Who proposes and confirms service dates for each category?
4. Which Ghana payment provider will verify Mobile Money and card payments?
5. Do you want the Worker Marketplace to be a vetted third-party marketplace, or only a directory of Chapman-managed workers?
6. Who receives CEO messages in practice: the CEO directly, an executive assistant, or a support manager with escalation rules?
7. Which staff roles may see customer address, measurement photos, and payment information?

## References

[1]: https://laundry-app-git-master-chapman-website-s-projects.vercel.app/orders "Chapman Operations: Orders"
[2]: https://laundry-app-git-master-chapman-website-s-projects.vercel.app/new-order "Chapman Operations: New Order"
[3]: https://laundry-app-git-master-chapman-website-s-projects.vercel.app/services "Chapman Operations: Services and Pricing"
[4]: https://laundry-app-git-master-chapman-website-s-projects.vercel.app/payments "Chapman Operations: Payments"
[5]: https://laundry-app-git-master-chapman-website-s-projects.vercel.app/staff "Chapman Operations: Staff"
[6]: https://laundry-app-git-master-chapman-website-s-projects.vercel.app/security "Chapman Operations: Security"
