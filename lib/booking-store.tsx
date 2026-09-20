import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { AppointmentResponse, Booking, CartLine, LaundryItem, QuoteDetails, QuoteRequest, SavedRoutine, Service, formatGhs } from "@/lib/chapman-data";
import type { MobileLaundryRequest } from "@/lib/mobile-requests";
import { supabase } from "@/lib/supabase";

interface BookingStoreValue {
  cart: CartLine[];
  express: boolean;
  bookings: Booking[];
  quotes: QuoteRequest[];
  routines: SavedRoutine[];
  updateLaundryQuantity: (item: LaundryItem, quantity: number) => void;
  setExpress: (value: boolean) => void;
  laundrySubtotal: number;
  expressFee: number;
  cartCount: number;
  createLaundryBooking: (request?: MobileLaundryRequest) => Booking;
  createQuoteRequest: (service: Service, propertyType: string, preference: string, details?: QuoteDetails) => QuoteRequest;
  setProposedAppointment: (quoteId: string, proposedDate: string) => void;
  respondToAppointment: (quoteId: string, response: Extract<AppointmentResponse, "accepted" | "rejected">) => void;
  saveRoutine: (service: Service, cadence: string) => void;
  removeRoutine: (routineId: string) => void;
  clearCart: () => void;
}

const BookingStore = createContext<BookingStoreValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [express, setExpress] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [routines, setRoutines] = useState<SavedRoutine[]>([]);

  // Load quotes from Supabase on mount
  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const loadQuotes = async () => {
      try {
        const { data: session } = await client.auth.getSession();
        const userId = session?.session?.user?.id;
        if (!userId) return;

        const { data } = await client
          .from("quote_requests")
          .select("*")
          .eq("customer_account_id", userId)
          .order("created_at", { ascending: false });

        if (data) {
          const mapped: QuoteRequest[] = data.map((row: any) => ({
            id: row.id,
            serviceId: row.service_id as any,
            serviceTitle: row.service_title || "",
            propertyType: row.property_type || "",
            preference: row.preference || "",
            details: row.details ?? undefined,
            appointmentResponse: (row.appointment_response as AppointmentResponse) || "awaiting-chapman",
            status: "quote-requested" as const,
            createdAt: row.created_at || new Date().toISOString(),
          }));
          setQuotes(mapped);
        }
      } catch (error) {
        console.error("Failed to load quotes from Supabase:", error);
      }
    };

    void loadQuotes();
  }, []);

  const updateLaundryQuantity = (item: LaundryItem, quantity: number) => {
    setCart((current) => {
      const otherLines = current.filter((line) => line.item.id !== item.id);
      return quantity > 0 ? [...otherLines, { item, quantity }] : otherLines;
    });
  };

  const laundrySubtotal = useMemo(() => cart.reduce((sum, line) => sum + (line.item.price_wash || 0) * line.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);
  const expressFee = express ? cartCount * 10 : 0;

  const createLaundryBooking = (request?: MobileLaundryRequest) => {
    const isSubmittedRequest = Boolean(request);
    let requestDate = "your preferred date";
    if (request?.requested_for) {
      const parsedDate = new Date(`${request.requested_for}T12:00:00`);
      if (!isNaN(parsedDate.getTime())) {
        requestDate = parsedDate.toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric" });
      } else {
        requestDate = request.requested_for;
      }
    }
    const booking: Booking = {
      id: request?.id ?? `CPL-${String(bookings.length + 1042).padStart(4, "0")}`,
      referenceCode: request?.id ? `CPL-${request.id.slice(0, 8).toUpperCase()}` : undefined,
      serviceId: "laundry",
      serviceTitle: "Laundry & Garment Care",
      status: isSubmittedRequest ? "pending-review" : "confirmed",
      scheduledFor: isSubmittedRequest ? `Preferred pickup ${requestDate} · ${request?.pickup_window ?? "time to be confirmed"}` : "Pickup tomorrow, 9:00–11:00",
      totalLabel: formatGhs(Number(request?.estimated_total ?? laundrySubtotal + expressFee + 20)),
      rewardNote: "Complete this service to unlock Chapman Bonus value.",
      createdAt: request?.created_at ?? new Date().toISOString(),
    };
    setBookings((current) => [booking, ...current]);
    return booking;
  };

  const createQuoteRequest = useCallback((service: Service, propertyType: string, preference: string, details?: QuoteDetails) => {
    const localId = `QTE-${String(quotes.length + 301).padStart(4, "0")}`;
    const request: QuoteRequest = { 
      id: localId, 
      serviceId: service.id, 
      serviceTitle: service.title, 
      propertyType, 
      preference, 
      details, 
      appointmentResponse: "awaiting-chapman", 
      status: "quote-requested", 
      createdAt: new Date().toISOString() 
    };
    setQuotes((current) => [request, ...current]);

    // Save to Supabase
    const client = supabase;
    if (client) {
      void (async () => {
        try {
          const { data: session } = await client.auth.getSession();
          const userId = session?.session?.user?.id;
          if (!userId) return;

          const { data, error } = await client
            .from("quote_requests")
            .insert({
              customer_account_id: userId,
              service_id: service.id,
              service_title: service.title,
              property_type: propertyType,
              preference: preference,
              details: details ?? {},
              appointment_response: "awaiting-chapman",
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (data && !error) {
            // Update local state with the real Supabase ID
            setQuotes((current) => 
              current.map((q) => q.id === localId ? { ...q, id: data.id } : q)
            );
          }
        } catch (error) {
          console.error("Failed to save quote to Supabase:", error);
        }
      })();
    }

    return request;
  }, [quotes.length]);

  const setProposedAppointment = useCallback((quoteId: string, proposedDate: string) => {
    setQuotes((current) => current.map((quote) => quote.id === quoteId ? { ...quote, appointmentResponse: "awaiting-customer", details: { ...quote.details, proposedDate } } : quote));

    // Update in Supabase
    const client = supabase;
    if (client) {
      void (async () => {
        try {
          await client
            .from("quote_requests")
            .update({ 
              appointment_response: "awaiting-customer",
              details: { ...(await client.from("quote_requests").select("details").eq("id", quoteId).single()).data?.details ?? {}, proposedDate }
            })
            .eq("id", quoteId);
        } catch (error) {
          console.error("Failed to update proposed appointment in Supabase:", error);
        }
      })();
    }
  }, []);

  const respondToAppointment = useCallback((quoteId: string, response: Extract<AppointmentResponse, "accepted" | "rejected">) => {
    setQuotes((current) => current.map((quote) => quote.id === quoteId ? { ...quote, appointmentResponse: response } : quote));

    // Update in Supabase
    const client = supabase;
    if (client) {
      void (async () => {
        try {
          await client
            .from("quote_requests")
            .update({ appointment_response: response })
            .eq("id", quoteId);
        } catch (error) {
          console.error("Failed to update appointment response in Supabase:", error);
        }
      })();
    }
  }, []);

  const saveRoutine = (service: Service, cadence: string) => {
    setRoutines((current) => current.some((routine) => routine.serviceId === service.id && routine.cadence === cadence) ? current : [{ id: `ROU-${service.id}-${cadence.toLowerCase().replace(/\s+/g, "-")}`, serviceId: service.id, serviceTitle: service.shortTitle, cadence, detail: `${cadence} care reminder` }, ...current]);
  };
  const removeRoutine = (routineId: string) => setRoutines((current) => current.filter((routine) => routine.id !== routineId));
  const clearCart = () => { setCart([]); setExpress(false); };

  return <BookingStore.Provider value={{ cart, express, bookings, quotes, routines, updateLaundryQuantity, setExpress, laundrySubtotal, expressFee, cartCount, createLaundryBooking, createQuoteRequest, setProposedAppointment, respondToAppointment, saveRoutine, removeRoutine, clearCart }}>{children}</BookingStore.Provider>;
}

export function useBookingStore() {
  const value = useContext(BookingStore);
  if (!value) throw new Error("useBookingStore must be used inside BookingProvider");
  return value;
}