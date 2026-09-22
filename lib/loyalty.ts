import type { CustomerActivity } from "@/lib/customer-activity";

/**
 * CHAPMAN ELITE PATRONAGE
 *
 * Two tracks, because Chapman sells two different kinds of work.
 *
 * 1. LAUNDRY, counted in visits.
 *    This mirrors the ladder already running in the Chapman staff system
 *    (Settings, then Loyalty): Standard under 5 visits, Bronze at 5, Silver at
 *    15, Gold at 30, and VIP by management decision. A laundry visit is small
 *    and frequent, so visits are the fair way to count it.
 *
 * 2. SERVICES, counted in completed jobs.
 *    Cleaning, fumigation, car detailing, sofa and carpet, polytank and contract
 *    work are large jobs, at least GH₵800 to GH₵1,500 each, so counting them the
 *    way laundry counts would take a customer years to move a tier. Fewer jobs,
 *    bigger steps.
 *
 * THE NUMBERS AND DISCOUNTS ARE CHAPMAN'S BUSINESS DECISION.
 * They sit in the two tables below and nowhere else. Changing a number or a word
 * in either table changes the whole app: the home card, the profile card, and the
 * full Elite Patronage screen. Nothing else needs editing.
 */

export type LoyaltyTrackKey = "laundry" | "services";

export type LoyaltyTier = {
  key: string;
  name: string;
  /** Visits for laundry, completed jobs for services, to reach this tier. */
  from: number;
  /** The discount this tier earns on the customer's next booking. */
  discount: number;
  /** What Chapman promises this tier, in the customer's own words. */
  benefit: string;
  /** True when only Chapman can give this tier, whatever the customer has spent. */
  byInvitation?: boolean;
};

export const LAUNDRY_TIERS: LoyaltyTier[] = [
  { key: "standard", name: "Standard", from: 0, discount: 0, benefit: "Standard pricing on every collection." },
  { key: "bronze", name: "Bronze", from: 5, discount: 5, benefit: "5% off every laundry collection." },
  { key: "silver", name: "Silver", from: 15, discount: 10, benefit: "10% off every laundry collection." },
  { key: "gold", name: "Gold", from: 30, discount: 15, benefit: "15% off every collection, and delivery on Chapman." },
  { key: "vip", name: "VIP", from: Number.POSITIVE_INFINITY, discount: 20, benefit: "20% off and door to door care, by Chapman's invitation.", byInvitation: true },
];

/**
 * Services, counted in completed jobs.
 * The first job puts a customer on Bronze, because one job is worth more than
 * thirty laundry visits. Change these numbers to whatever Chapman decides.
 */
export const SERVICE_TIERS: LoyaltyTier[] = [
  { key: "standard", name: "Standard", from: 0, discount: 0, benefit: "Standard pricing, quoted before work starts." },
  { key: "bronze", name: "Bronze", from: 1, discount: 5, benefit: "5% off your next service." },
  { key: "silver", name: "Silver", from: 3, discount: 8, benefit: "8% off every service, and priority booking on busy days." },
  { key: "gold", name: "Gold", from: 6, discount: 12, benefit: "12% off every service, priority booking, and express care free." },
  { key: "vip", name: "VIP", from: Number.POSITIVE_INFINITY, discount: 20, benefit: "20% off, a named coordinator, and first call on Chapman's busiest days.", byInvitation: true },
];

export type TrackStanding = {
  track: LoyaltyTrackKey;
  /** What counting unit this track uses, in plain words. */
  unitLabel: string;
  count: number;
  tier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  /** How many more of the counting unit to reach the next tier. */
  toNextTier: number;
  /** 0 to 1, how far through the current tier. */
  progress: number;
  tiers: LoyaltyTier[];
};

/**
 * A laundry request counts once Chapman has taken the work on. A request still
 * being reviewed, or one Chapman could not take, does not count, so nobody's
 * tier is inflated by a request that never became work.
 */
const COUNTED_REQUEST_STATUSES = ["confirmed", "completed", "converted"];
/** A service counts once the customer has accepted the date Chapman offered. */
const COUNTED_SERVICE_RESPONSES = ["accepted"];

export function countLaundryVisits(activity: CustomerActivity) {
  return activity.requests.filter((request) => COUNTED_REQUEST_STATUSES.includes(request.status)).length;
}

export function countServiceJobs(activity: CustomerActivity) {
  return activity.quotes.filter((quote) => COUNTED_SERVICE_RESPONSES.includes(quote.appointmentResponse)).length;
}

export function trackStanding(track: LoyaltyTrackKey, count: number, tiers: LoyaltyTier[]): TrackStanding {
  const reachable = tiers.filter((tier) => !tier.byInvitation);
  const tierIndex = reachable.reduce((best, tier, index) => (count >= tier.from ? index : best), 0);
  const tier = reachable[tierIndex];
  const nextTier = reachable[tierIndex + 1] ?? tiers.find((entry) => entry.byInvitation) ?? null;

  const toNextTier = nextTier && !nextTier.byInvitation ? Math.max(0, nextTier.from - count) : 0;
  const span = nextTier && !nextTier.byInvitation ? Math.max(1, nextTier.from - tier.from) : 1;
  const progress = nextTier && !nextTier.byInvitation ? Math.min(1, Math.max(0, (count - tier.from) / span)) : 1;

  return {
    track,
    unitLabel: track === "laundry" ? "visits" : "completed jobs",
    count,
    tier,
    nextTier,
    toNextTier,
    progress,
    tiers,
  };
}

export function laundryStanding(activity: CustomerActivity) {
  return trackStanding("laundry", countLaundryVisits(activity), LAUNDRY_TIERS);
}

export function serviceStanding(activity: CustomerActivity) {
  return trackStanding("services", countServiceJobs(activity), SERVICE_TIERS);
}

/** The line under a tier on a card or a screen. */
export function trackProgressLine(standing: TrackStanding) {
  const unit = standing.track === "laundry" ? "visit" : "job";
  if (standing.nextTier?.byInvitation && standing.count >= (standing.tiers.filter((tier) => !tier.byInvitation).pop()?.from ?? 0)) {
    return `Chapman may invite you to ${standing.nextTier.name} from here.`;
  }
  if (!standing.nextTier) return "This is Chapman's highest tier. Thank you.";
  if (standing.toNextTier <= 0) return `You have reached ${standing.nextTier.name}.`;
  return `${standing.toNextTier} more ${unit}${standing.toNextTier === 1 ? "" : "s"} to ${standing.nextTier.name}`;
}

/** A short description of both tracks, for the cards on Home and Profile. */
export function loyaltyHeadline(laundry: TrackStanding, services: TrackStanding) {
  return `Laundry ${laundry.tier.name} ${laundry.tier.discount}% | Services ${services.tier.name} ${services.tier.discount}%`;
}
