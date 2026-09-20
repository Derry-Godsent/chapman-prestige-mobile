import { supabase } from "./supabase";

export type ServiceKind =
  | "laundry"
  | "cleaning"
  | "fumigation"
  | "detailing"
  | "fabric"
  | "polytank"
  | "contract"
  | "workers";

export type BookingStatus =
  | "pending-review"
  | "confirmed"
  | "assigned"
  | "en-route"
  | "in-progress"
  | "completed"
  | "quote-requested";

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
  /**
   * This must be the UUID from public.laundry_items.id.
   * The booking RPC uses this value to validate each item.
   */
  id: string;
  name: string;
  category: string;
  price: number;
  price_wash: number;
  price_iron: number | null;
  price_fold: number | null;
  price_hang: number | null;
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
  concerns?: string[];
  spaceBreakdown?: Record<string, any>;
}

export type AppointmentResponse =
  | "awaiting-chapman"
  | "awaiting-customer"
  | "accepted"
  | "rejected";

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
  {
    id: "55bee299-4674-43de-b5d8-4afb27d77946",
    name: "Underwear",
    category: "Basics",
    price: 3,
    price_wash: 3,
    price_iron: null,
    price_fold: 3,
    price_hang: null,
  },
  {
    id: "78355f59-1361-4c0d-a3be-9b15b1c2e1cb",
    name: "Shorts",
    category: "Basics",
    price: 6,
    price_wash: 6,
    price_iron: 10,
    price_fold: 10,
    price_hang: 22,
  },
  {
    id: "0fd1b87a-1ad9-47b3-afea-10ab85836c60",
    name: "T-Shirt",
    category: "Everyday",
    price: 7,
    price_wash: 7,
    price_iron: 9,
    price_fold: 12,
    price_hang: 15,
  },
  {
    id: "963cdf02-6f99-41bc-8f2b-c94fc70a7aff",
    name: "Shirt",
    category: "Everyday",
    price: 7,
    price_wash: 7,
    price_iron: 9,
    price_fold: 13,
    price_hang: 15,
  },
  {
    id: "9927d464-1648-49e0-9738-b6c6bcfdaac9",
    name: "Trousers",
    category: "Everyday",
    price: 7,
    price_wash: 7,
    price_iron: 9,
    price_fold: 13,
    price_hang: 15,
  },
  {
    id: "12067664-d990-4227-8223-f98c778936d7",
    name: "Dress",
    category: "Ladies",
    price: 7,
    price_wash: 7,
    price_iron: 9,
    price_fold: 15,
    price_hang: 15,
  },
  {
    id: "520fe7d9-ee13-4d85-973e-c3e7fc50137f",
    name: "Blouse & Skirt",
    category: "Ladies",
    price: 11,
    price_wash: 11,
    price_iron: 13,
    price_fold: 25,
    price_hang: 27,
  },
  {
    id: "0b547598-cd92-4946-8dbc-6dfd57a974d8",
    name: "Jacket",
    category: "Formal",
    price: 8,
    price_wash: 8,
    price_iron: 11,
    price_fold: 15,
    price_hang: 18,
  },
  {
    id: "83e595f6-e17a-4991-81d7-9332c00f3f27",
    name: "Suit 2-Piece",
    category: "Formal",
    price: 17,
    price_wash: 17,
    price_iron: 19,
    price_fold: 35,
    price_hang: 35,
  },
  {
    id: "3c51bfdc-1f4d-4d03-a7d4-822476968837",
    name: "National Costume 2-Piece",
    category: "Traditional",
    price: 11,
    price_wash: 19,
    price_iron: null,
    price_fold: 30,
    price_hang: 27,
  },
  {
    id: "d8f42eb6-5e89-4096-893b-4be22e86fb03",
    name: "Smock",
    category: "Traditional",
    price: 10,
    price_wash: 10,
    price_iron: null,
    price_fold: 15,
    price_hang: null,
  },
  {
    id: "7b5eb296-caef-4ebe-b279-a128dac8d857",
    name: "Bedsheet",
    category: "Linen",
    price: 11,
    price_wash: 11,
    price_iron: null,
    price_fold: 25,
    price_hang: null,
  },
  {
    id: "a6f7c40e-cdc9-4b82-b993-af360658de36",
    name: "Pillowcase",
    category: "Linen",
    price: 2,
    price_wash: 2,
    price_iron: null,
    price_fold: 2,
    price_hang: null,
  },
    {
    id: "11f3c7f5-9003-42f6-ba59-369c62fb3204",
    name: "Blanket",
    category: "Specialty",
    price: 40,
    price_wash: 40,
    price_iron: null,
    price_fold: 40,
    price_hang: null,
  },
  {
    id: "576f112a-bb54-4ccf-bb28-f702868ded1f",
    name: "Blanket Large",
    category: "Specialty",
    price: 60,
    price_wash: 60,
    price_iron: null,
    price_fold: 60,
    price_hang: null,
  },
  {
    id: "f4d3cd71-55c2-42aa-840e-05928ff141fe",
    name: "Kente Cloth",
    category: "Specialty",
    price: 35,
    price_wash: 35,
    price_iron: null,
    price_fold: 35,
    price_hang: null,
  },
];

export const fetchLaundryItems = async (): Promise<LaundryItem[]> => {
  if (!supabase) {
    return LAUNDRY_ITEMS;
  }

  const { data, error } = await supabase
    .from("laundry_items")
    .select("id, name, category, price_wash, price_iron, price_fold, price_hang")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching Laundry items:", error);
    return LAUNDRY_ITEMS;
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: Number(item.price_wash ?? 0),
    price_wash: Number(item.price_wash ?? 0),
    price_iron: item.price_iron === null ? null : Number(item.price_iron),
    price_fold: item.price_fold === null ? null : Number(item.price_fold),
    price_hang: item.price_hang === null ? null : Number(item.price_hang),
  }));
};

export const WORKERS = [
  {
    id: "kwame",
    name: "Kwame Mensah",
    skill: "Electrician",
    rating: "4.9",
    jobs: 184,
    availability: "Available today",
    color: "#0052FF",
    initials: "KM",
  },
  {
    id: "ama",
    name: "Ama Serwaa",
    skill: "Painter",
    rating: "4.8",
    jobs: 127,
    availability: "Available tomorrow",
    color: "#B04A7A",
    initials: "AS",
  },
  {
    id: "yaw",
    name: "Yaw Owusu",
    skill: "Plumber",
    rating: "4.9",
    jobs: 216,
    availability: "Available today",
    color: "#136F63",
    initials: "YO",
  },
  {
    id: "adwoa",
    name: "Adwoa Boateng",
    skill: "Cleaner",
    rating: "4.7",
    jobs: 98,
    availability: "This week",
    color: "#6A57E8",
    initials: "AB",
  },
];

export const getService = (id: string | undefined) =>
  SERVICES.find((service) => service.id === id) ?? SERVICES[0];

export const formatGhs = (amount: number) => `₵${amount.toFixed(0)}`;