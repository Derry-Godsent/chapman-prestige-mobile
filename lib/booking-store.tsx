import { createContext, ReactNode, useContext, useMemo, useState } from "react";

import { Booking, CartLine, LaundryItem, QuoteRequest, Service, ServiceKind, formatGhs } from "@/lib/chapman-data";

interface BookingStoreValue {
  cart: CartLine[];
  express: boolean;
  bookings: Booking[];
  quotes: QuoteRequest[];
  updateLaundryQuantity: (item: LaundryItem, quantity: number) => void;
  setExpress: (value: boolean) => void;
  laundrySubtotal: number;
  expressFee: number;
  cartCount: number;
  createLaundryBooking: () => Booking;
  createQuoteRequest: (service: Service, propertyType: string, preference: string) => QuoteRequest;
  clearCart: () => void;
}

const BookingStore = createContext<BookingStoreValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [express, setExpress] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);

  const updateLaundryQuantity = (item: LaundryItem, quantity: number) => {
    setCart((current) => {
      const otherLines = current.filter((line) => line.item.id !== item.id);
      return quantity > 0 ? [...otherLines, { item, quantity }] : otherLines;
    });
  };

  const laundrySubtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0),
    [cart],
  );
  const cartCount = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);
  const expressFee = express ? cartCount * 10 : 0;

  const createLaundryBooking = () => {
    const booking: Booking = {
      id: `CPL-${String(bookings.length + 1042).padStart(4, "0")}`,
      serviceId: "laundry",
      serviceTitle: "Laundry & Garment Care",
      status: "confirmed",
      scheduledFor: "Pickup tomorrow, 9:00–11:00",
      totalLabel: formatGhs(laundrySubtotal + expressFee + 20),
      createdAt: new Date().toISOString(),
    };
    setBookings((current) => [booking, ...current]);
    return booking;
  };

  const createQuoteRequest = (service: Service, propertyType: string, preference: string) => {
    const request: QuoteRequest = {
      id: `QTE-${String(quotes.length + 301).padStart(4, "0")}`,
      serviceId: service.id as ServiceKind,
      serviceTitle: service.title,
      propertyType,
      preference,
      status: "quote-requested",
      createdAt: new Date().toISOString(),
    };
    setQuotes((current) => [request, ...current]);
    return request;
  };

  const clearCart = () => {
    setCart([]);
    setExpress(false);
  };

  return (
    <BookingStore.Provider
      value={{
        cart,
        express,
        bookings,
        quotes,
        updateLaundryQuantity,
        setExpress,
        laundrySubtotal,
        expressFee,
        cartCount,
        createLaundryBooking,
        createQuoteRequest,
        clearCart,
      }}
    >
      {children}
    </BookingStore.Provider>
  );
}

export function useBookingStore() {
  const value = useContext(BookingStore);
  if (!value) throw new Error("useBookingStore must be used inside BookingProvider");
  return value;
}
