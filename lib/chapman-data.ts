export type ServiceKind =
  | "laundry"
  | "cleaning"
  | "fumigation"
  | "detailing"
  | "fabric"
  | "polytank"
  | "contract"
  | "workers";

export type BookingStatus = "pending-review" | "confirmed" | "assigned" | "en-route" | "in-progress" | "completed" | "quote-requested";

export interface Service {
  id: ServiceKind;
  title: string;
  shortTitle: string;
  description: string;
  valueStatement: string;
  actionLabel: string;
  icon: string;
  accent: string;
  priceHint: string;
  assessmentRequired: boolean;
  tags: string[];
}

export interface LaundryItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface CartLine {
  item: LaundryItem;
  quantity: number;
}

export interface Booking {
  id: string;
  referenceCode?: string;
  serviceId: ServiceKind;
  serviceTitle: string;
  status: BookingStatus;
  scheduledFor: string;
  totalLabel: string;
  specialistName?: string;
  rewardNote?: string;
  createdAt: string;
}

export interface QuoteDetails {
  primaryLabel?: string;
  primaryValue?: string;
  secondaryLabel?: string;
  secondaryValue?: string;
  estimatedAreaM2?: number;
  cameraGuided?: boolean;
  estimateLabel?: string;
  serviceLocation?: string;
  selectedOptions?: string[];
  requestedDate?: string;
  proposedDate?: string;
  cleanerCount?: string;
  cleanerGenderPreference?: string;
  cleanerExperiencePreference?: string;
}

export type AppointmentResponse = "awaiting-chapman" | "awaiting-customer" | "accepted" | "rejected";

export interface QuoteRequest {
  id: string;
  serviceId: ServiceKind;
  serviceTitle: string;
  propertyType: string;
  preference: string;
  details?: QuoteDetails;
  appointmentResponse: AppointmentResponse;
  status: "quote-requested";
  createdAt: string;
}

export interface SavedRoutine {
  id: string;
  serviceId: ServiceKind;
  serviceTitle: string;
  cadence: string;
  detail: string;
}

export const SERVICES: Service[] = [
  {
    id: "laundry",
    title: "Laundry & Garment Care",
    shortTitle: "Laundry",
    description: "Freshly cleaned, pressed, and carefully returned garments — collected from your door.",
    valueStatement: "Stop giving your weekend to laundry. Keep your time for what matters.",
    actionLabel: "Book pickup",
    icon: "shirt-outline",
    accent: "#059669",
    priceHint: "From ₵2 per item",
    assessmentRequired: false,
    tags: ["Doorstep pickup", "Express available", "Per-item pricing"],
  },
  {
    id: "cleaning",
    title: "Deep Cleaning",
    shortTitle: "Deep Cleaning",
    description: "Detailed residential and commercial cleaning with an assessment-led care plan.",
    valueStatement: "A visibly cleaner environment makes home and work feel easier to manage.",
    actionLabel: "Request assessment",
    icon: "sparkles-outline",
    accent: "#D97706",
    priceHint: "From ₵500 minimum",
    assessmentRequired: true,
    tags: ["Homes", "Offices", "Move-in care"],
  },
  {
    id: "fumigation",
    title: "Certified Fumigation",
    shortTitle: "Fumigation",
    description: "Targeted pest-control plans for homes, shops, offices, and facilities.",
    valueStatement: "Protect the spaces where your family, guests, and customers spend time.",
    actionLabel: "Get a quote",
    icon: "shield-checkmark-outline",
    accent: "#92400E",
    priceHint: "From ₵250",
    assessmentRequired: true,
    tags: ["Bedbugs", "Rodents", "Cockroaches"],
  },
  {
    id: "detailing",
    title: "Premium Detailing",
    shortTitle: "Car Detailing",
    description: "Interior and exterior vehicle care that restores a polished, comfortable drive.",
    valueStatement: "Your car faces every road and weather condition. Give it a considered reset.",
    actionLabel: "Schedule service",
    icon: "car-sport-outline",
    accent: "#047857",
    priceHint: "Wash from ₵45",
    assessmentRequired: true,
    tags: ["Interior", "Exterior", "Ceramic coating"],
  },
  {
    id: "fabric",
    title: "Fabric Revival",
    shortTitle: "Sofa & Carpet",
    description: "Deep-clean sofas, carpets, and rugs with fabric-appropriate treatments.",
    valueStatement: "Restore the comfort and confidence of the furniture you use every day.",
    actionLabel: "View pricing",
    icon: "bed-outline",
    accent: "#7A6A59",
    priceHint: "From ₵150 minimum",
    assessmentRequired: true,
    tags: ["Sofas", "Carpets", "Stain treatment"],
  },
  {
    id: "polytank",
    title: "Water Safety",
    shortTitle: "Polytank",
    description: "Professional polytank sanitization that supports a safer water routine.",
    valueStatement: "Clean water starts before the tap. Care for the tank that serves your home.",
    actionLabel: "Request sanitization",
    icon: "water-outline",
    accent: "#059669",
    priceHint: "From ₵150",
    assessmentRequired: true,
    tags: ["200L–500L", "1kL–2.5kL", "5000L+"],
  },
  {
    id: "contract",
    title: "Contract Cleaning",
    shortTitle: "Contracts",
    description: "Recurring cleaning support for offices, schools, clinics, churches, and hospitality spaces.",
    valueStatement: "Give your team and guests a dependable standard of care every month.",
    actionLabel: "Plan a contract",
    icon: "business-outline",
    accent: "#4B3E30",
    priceHint: "From ₵600/month",
    assessmentRequired: true,
    tags: ["Offices", "Schools", "Facilities"],
  },
  {
    id: "workers",
    title: "Worker Marketplace",
    shortTitle: "Workers",
    description: "Find skilled professionals for the practical jobs that keep your space working.",
    valueStatement: "Match with a verified professional when a task needs the right pair of hands.",
    actionLabel: "Browse workers",
    icon: "construct-outline",
    accent: "#F59E0B",
    priceHint: "Availability shown live",
    assessmentRequired: false,
    tags: ["Electricians", "Plumbers", "Painters"],
  },
];

export const LAUNDRY_ITEMS: LaundryItem[] = [
  { id: "vest", name: "Vest", price: 6, category: "Basics" },
  { id: "underwear", name: "Underwear", price: 3, category: "Basics" },
  { id: "shorts", name: "Shorts", price: 6, category: "Basics" },
  { id: "t-shirt", name: "T-Shirt", price: 7, category: "Everyday" },
  { id: "shirt", name: "Shirt", price: 7, category: "Everyday" },
  { id: "trousers", name: "Trousers", price: 7, category: "Everyday" },
  { id: "dress", name: "Dress", price: 7, category: "Ladies" },
  { id: "blouse-skirt", name: "Blouse & Skirt", price: 11, category: "Ladies" },
  { id: "suit-2", name: "Suit 2-Piece", price: 17, category: "Formal" },
  { id: "national-costume", name: "National Costume 2-Piece", price: 11, category: "Traditional" },
  { id: "smock", name: "Smock", price: 10, category: "Traditional" },
  { id: "bedsheet", name: "Bedsheet", price: 11, category: "Linen" },
  { id: "pillowcase", name: "Pillowcase", price: 2, category: "Linen" },
  { id: "blanket", name: "Blanket", price: 40, category: "Specialty" },
  { id: "kente", name: "Kente Cloth", price: 35, category: "Specialty" },
];

export const WORKERS = [
  { id: "kwame", name: "Kwame Mensah", skill: "Electrician", rating: "4.9", jobs: 184, availability: "Available today", color: "#0052FF", initials: "KM" },
  { id: "ama", name: "Ama Serwaa", skill: "Painter", rating: "4.8", jobs: 127, availability: "Available tomorrow", color: "#B04A7A", initials: "AS" },
  { id: "yaw", name: "Yaw Owusu", skill: "Plumber", rating: "4.9", jobs: 216, availability: "Available today", color: "#136F63", initials: "YO" },
  { id: "adwoa", name: "Adwoa Boateng", skill: "Cleaner", rating: "4.7", jobs: 98, availability: "This week", color: "#6A57E8", initials: "AB" },
];

export const getService = (id: string | undefined) => SERVICES.find((service) => service.id === id) ?? SERVICES[0];

export const formatGhs = (amount: number) => `₵${amount.toFixed(0)}`;
