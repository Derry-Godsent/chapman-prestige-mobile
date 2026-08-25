import type { RealtimeChannel } from "@supabase/supabase-js";

import { Booking, LaundryItem } from "./chapman-data";
import { supabase } from "./supabase";
import { asNumber, toBooking, toLaundryItem } from "./chapman-transformers";

export { asNumber, toBooking, toLaundryItem } from "./chapman-transformers";

export interface ChapmanServiceRow {
  id: string;
  name: string;
  category: string;
  price_wash: number | string | null;
  price_iron: number | string | null;
  price_fold: number | string | null;
  price_hang: number | string | null;
  express_surcharge: number | string | null;
  super_cat: string | null;
  base_price: number | string | null;
  price_min: number | string | null;
  price_max: number | string | null;
  pricing_unit: string | null;
  requires_assessment: boolean | null;
}

export interface ChapmanOrderRow {
  id: string;
  order_id: string;
  client_id: string | null;
  status: string | null;
  is_express: boolean | null;
  delivery_fee: number | string | null;
  discount_percent: number | string | null;
  total_due: number | string | null;
  amount_paid: number | string | null;
  created_at: string | null;
  notes: string | null;
}

export interface ChapmanOrderItemRow {
  id: string;
  order_id: string | null;
  service_id: string | null;
  quantity: number;
  unit_price: number | string;
}

export interface ChapmanClientRow {
  id: string;
  name: string;
  full_name: string | null;
  phone: string | null;
  type: string | null;
  tier: string | null;
  visits: number | null;
  total_spent: number | string | null;
  contract_ref: string | null;
  active: boolean | null;
}

export async function getPublishedServices() {
  if (!supabase) return { data: [] as ChapmanServiceRow[], error: new Error("Supabase is not configured") };
  const response = await supabase
    .from("services")
    .select("id,name,category,price_wash,price_iron,price_fold,price_hang,express_surcharge,super_cat,base_price,price_min,price_max,pricing_unit,requires_assessment")
    .order("category", { ascending: true });
  return { data: (response.data ?? []) as ChapmanServiceRow[], error: response.error };
}

export async function getClientOrders(clientId: string) {
  if (!supabase) return { data: [] as ChapmanOrderRow[], error: new Error("Supabase is not configured") };
  const response = await supabase
    .from("orders")
    .select("id,order_id,client_id,status,is_express,delivery_fee,discount_percent,total_due,amount_paid,created_at,notes")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return { data: (response.data ?? []) as ChapmanOrderRow[], error: response.error };
}

/**
 * Subscribes only after the signed-in mobile user has been safely mapped to a client record.
 * The database must expose `orders` to Realtime and have matching RLS policies before this is enabled in UI.
 */
export function subscribeToClientOrders(clientId: string, onChange: () => void): (() => void) {
  const client = supabase;
  if (!client) return () => undefined;
  const channel: RealtimeChannel = client
    .channel(`chapman-orders:${clientId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `client_id=eq.${clientId}` }, onChange)
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
