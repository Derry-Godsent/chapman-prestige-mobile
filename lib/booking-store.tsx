import { createContext, ReactNode, useContext, useMemo, useState } from "react";

import { AppointmentResponse, Booking, CartLine, LaundryItem, QuoteDetails, QuoteRequest, SavedRoutine, Service, formatGhs } from "@/lib/chapman-data";
import type { MobileLaundryRequest } from "@/lib/mobile-requests";

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

  const updateLaundryQuantity = (item: LaundryItem, quantity: number) => {
    setCart((current) => {
      const otherLines = current.filter((line) => line.item.id !== item.id);
      return quantity > 0 ? [...otherLines, { item, quantity }] : otherLines;
    });
  };

  const laundrySubtotal = useMemo(() => cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);
  const expressFee = express ? cartCount * 10 : 0;

  const createLaundryBooking = (request?: MobileLaundryRequest) => {
    const isSubmittedRequest = Boolean(request);
    const requestDate = request?.requested_for ? new Date(`${request.requested_for}T12:00:00`).toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric" }) : "your preferred date";
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

  const createQuoteRequest = (service: Service, propertyType: string, preference: string, details?: QuoteDetails) => {
    const request: QuoteRequest = { id: `QTE-${String(quotes.length + 301).padStart(4, "0")}`, serviceId: service.id, serviceTitle: service.title, propertyType, preference, details, appointmentResponse: "awaiting-chapman", status: "quote-requested", createdAt: new Date().toISOString() };
    setQuotes((current) => [request, ...current]);
    return request;
  };

  const setProposedAppointment = (quoteId: string, proposedDate: string) => {
    setQuotes((current) => current.map((quote) => quote.id === quoteId ? { ...quote, appointmentResponse: "awaiting-customer", details: { ...quote.details, proposedDate } } : quote));
  };

  const respondToAppointment = (quoteId: string, response: Extract<AppointmentResponse, "accepted" | "rejected">) => {
    setQuotes((current) => current.map((quote) => quote.id === quoteId ? { ...quote, appointmentResponse: response } : quote));
  };

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
