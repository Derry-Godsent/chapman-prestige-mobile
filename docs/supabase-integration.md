# Chapman Prestige Supabase Integration Boundary

The mobile client has been configured with a browser-safe Supabase project URL and publishable key. Its adapter reflects the confirmed `public.services`, `public.orders`, `public.order_items`, `public.clients`, and `public.staff` table shapes in the existing Chapman dashboard database. It deliberately keeps the current customer experience local until identity mapping and Row Level Security are safely agreed, rather than exposing operational records to every device.

| Mobile concern | Existing database table | Integration status |
|---|---|---|
| Laundry pricing and service discovery | `public.services` | Typed read adapter available. Enable after confirming anonymous/public service-read policy. |
| Customer booking history | `public.orders`, `public.order_items` | Typed read adapter and filtered real-time subscription available. Enable only after auth-to-client mapping is implemented. |
| Loyalty tier and customer profile | `public.clients` | Typed model documented. Requires secure row ownership policy before mobile access. |
| Assigned team information | `public.staff` | Schema is available but mobile display must be limited to staff explicitly assigned to the current order. |

## Required Security Decisions Before Live Customer Sync

The current `public.clients` table has RLS disabled. This must be resolved before the mobile client queries or writes customer data. Turning on RLS alone will deny all client access, so the owner needs to choose the correct customer identity model and add matching policies before enabling it.

```sql
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
```

The recommended model is to add a secure relationship between `auth.users.id` and one client row, then create narrowly scoped policies that permit a signed-in user to select and update only that row, view only their own orders, and receive only their own `orders` real-time events. A separate server-side booking procedure should create orders and order items after validating prices from `public.services`; a mobile publishable key must never be treated as an administrative credential.

## Real-Time Contract

When the RLS policies and client identity link are in place, enable the `orders` table for Supabase Realtime and call `subscribeToClientOrders(clientId, refresh)`. The app subscribes using an exact `client_id` filter and refreshes its booking view when an INSERT, UPDATE, or DELETE arrives. This produces a shared source of truth with the staff dashboard without granting mobile users access to unrelated customer orders.
