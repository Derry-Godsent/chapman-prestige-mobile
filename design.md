# Chapman Prestige Mobile Design Plan

## Product Direction

Chapman Prestige is designed as a reassuring premium-service companion for busy homes and facilities in Kumasi. The app will make professional care feel more immediate and valuable than doing chores oneself: each screen pairs a practical service with a clear outcome, transparent starting prices, and a low-friction next action. The experience is portrait-first at a 9:16 ratio and keeps primary controls within an easy thumb reach in the lower half of the screen.

The interface will balance iOS-native clarity with Material Design 3-inspired shape and hierarchy. Content will sit on a soft warm-white canvas, with electric blue used for trust, tracking, and primary decisions. Vibrant orange will isolate promotional value, marketplace availability, and time-sensitive actions. Large rounded cards, light translucency, compact status pills, and gentle haptic feedback will establish the intended premium feel without obscuring reading or increasing cognitive load.

## Color and Type System

| Design role | Value | Intended use |
|---|---:|---|
| Chapman blue | `#003EC7` | Primary actions, trusted-service cues, navigation selection |
| Electric blue | `#0052FF` | Gradient highlights, progress fills, active booking controls |
| Deep blue | `#001452` | Loyalty-card depth and high-contrast hero areas |
| Vibrant orange | `#FE6B00` | Offers, marketplace labels, urgent visual emphasis |
| Secondary orange | `#A04100` | Warm secondary labels and category accents |
| Canvas | `#F8F9FA` | Main screen background and light surfaces |
| Ink | `#191C1D` | Primary text and iconography |
| Muted ink | `#434656` | Supporting labels and metadata |
| Alert red | `#BA1A1A` | Error states and critical warnings |

Headlines will use **Plus Jakarta Sans** at 700–800 weight, with compact two-line limits for mobile legibility. **Inter** at 400–700 weight will be used for service descriptions, prices, status labels, and forms. Primary actions will be 48–52pt high, have at least 16pt side margins, and retain visible pressed feedback. Cards will use 20–28pt radii; small category chips and status pills will use 999pt radii.

## Screen List and Layout Specifications

| Screen | Primary content and functionality | Portrait layout |
|---|---|---|
| Onboarding | Six skippable promise-led panels for the brand, laundry, fabric revival, fumigation, car detailing, and first booking. | Full-bleed deep-blue background, centered illustration area, short benefit statement, liquid progress control, low-right primary CTA, top-right Skip. |
| Welcome and sign-in | Phone OTP as the primary route, alternate email sign-in, Google/Apple entry points, guest access, and terms acknowledgement. | Minimal logo header, segmented sign-in options, large phone field, fixed bottom Continue control. |
| Home | Greeting, notification entry, Elite Patronage loyalty card, quick service actions, active booking, and promotions. | Scrollable single column; header and loyalty card at top, two-row service grid, active status card, then horizontal promotions. |
| Services | Searchable service catalogue and benefit-led service cards that explain why professional care is worthwhile. | Sticky title and search trigger, intro panel, vertical list of seven distinctive cards, each with a clear value proposition and one action. |
| Service details | Scope, price guidance, service outcomes, add-ons, and booking CTA for a chosen service. | Hero summary above segmented detail sections; persistent bottom Book or Request quote control. |
| Laundry builder | Per-item item quantities, express option, pickup timing, transparent subtotal, and delivery fee. | Category tabs / expandable groups, compact item steppers, sticky order summary and Review booking control. |
| Quote request | Structured service questionnaire for cleaning, fumigation, car, sofa/carpet, polytank, and contracts. | Short progressive form cards with chips, a date preference, notes, and a bottom Request assessment button. |
| Checkout | Address, schedule, order summary, payment method, promo/loyalty discount, and confirmation. | Progress header, editable detail cells, price summary card, bottom Place booking control. |
| Booking confirmation and tracking | Booking reference, status timeline, assigned specialist, live tracking entry, contact controls, and support guidance. | Success headline, vertical status stepper, specialist card, persistent Track live control. |
| Bookings | Segmented upcoming/history list with booking status, price, and fast rebook. | Sticky filter chips; list cards with status badge, service title, date, and trailing affordance. |
| Workers | Marketplace categories, verified worker profiles, service skills, availability, and request contact action. | Horizontal category filter, worker list cards, orange Live Now status, bottom sheet for profile details. |
| Chat | Thread list, unread states, support/welcome thread, and booking-context preview. | Compact toolbar, high-density conversation rows, empty-state guidance, bottom new-message affordance. |
| Notifications | Transactional updates, offer notifications, and booking status changes. | Grouped-by-date timeline with read indicators and service-color icon discs. |
| Profile | User details, Elite tier, saved locations, preferences, help, and account actions. | Profile header, loyalty summary, grouped settings list, low-priority sign-out item. |

## Primary User Flows

| User goal | Flow |
|---|---|
| Complete a laundry order | Home → Laundry quick action → select garment quantities → choose express and pickup time → review booking → checkout → confirmation and tracking. |
| Request an assessed service | Home or Services → choose cleaning / fumigation / detailing / fabric / water-safety service → answer service-specific questions → choose preferred date → submit assessment request → receive quote in Bookings and Chat. |
| Understand the value of a service | Onboarding or Services → benefit-led service card → outcome and checklist detail → price guidance → Book pickup or Request assessment. |
| Find a verified worker | Workers → select skill category → open worker profile → review verification and availability → Request worker → receive response in Chat. |
| Follow an active job | Home active booking card or Bookings → booking detail → Track live → view assigned worker and status timeline → contact support or worker. |
| Manage loyalty and account preferences | Profile → Elite Patronage details or settings rows → review tier progress / update location / configure preferences. |

## Interaction and Accessibility Principles

Every booking action will provide a pressed state, lightweight haptic acknowledgement where available, and immediate state feedback. Long forms will reveal only relevant questions and preserve previously selected values. Status will never be communicated solely with color: labels, icons, and timeline position will reinforce all booking states. Text contrast will favor readable dark ink on pale surfaces, with action labels written as concrete verbs such as **Book pickup**, **Request assessment**, and **Track live**.

## Scope Boundary for the First Build

The first implementation will establish the complete customer-facing navigation and demonstrate the core booking interactions using a strongly typed local data layer. It will isolate external data reads and writes behind a repository interface so the existing Supabase schema and real-time subscriptions can be mapped without redesigning screens. Phone OTP, social login, actual payments, live GPS tracking, and production chat delivery will be connected after the shared database schema, auth provider choices, and credentials are confirmed.
