# Customer Real-Time Tracking and Notifications

## What is already in the mobile client

The client now captures a customer’s preferred service date, displays the staged tracking journey, supports a coordinator-proposed appointment date, and gives the customer **Accept date** and **Reject date** actions once that proposal is received. The notifications screen also supports opt-in local daily updates at 9:00 AM, alongside the once-per-day in-app announcement.

## Required secure integration before live customer data

The existing shared Supabase project has a `clients` table with row-level security disabled. The mobile client must not subscribe to, read, or write customer records until this is fixed. The next implementation step is to establish an authenticated mapping from `auth.users.id` to the corresponding client record, enable RLS, and add narrowly-scoped policies that permit a signed-in customer to view only their own orders, messages, appointment proposals, and notifications.

## Live tracking flow

Once the security boundary exists, the staff dashboard should update the linked order with `status`, `assigned_staff_id`, `proposed_service_at`, and a timestamped service event. The customer client can then subscribe only to that authenticated customer’s orders and render the existing tracking timeline, specialist card, and appointment decision card from those records.

## Notification flow

Appointment proposals, staff assignment, arrival, completion, promotions, and announcements should first be stored as customer-scoped notification records. The app can show those records in the Updates screen. A trusted server-side worker can later send push notifications to registered device tokens. Local scheduled notifications work on devices for the daily update; true remote push and real-time service notifications require the secured backend path and a development or production native build.
