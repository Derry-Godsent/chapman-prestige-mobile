/**
 * Everyone at Chapman Prestige, in the order the customer should meet them:
 * the founder first, then the office, then the people on site.
 *
 * The details here are the same ones Chapman already shows on their website
 * team page. Nothing is invented, and nobody is listed who Chapman has not
 * already introduced publicly.
 */

export type ChapmanTeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  group: "leadership" | "site";
  email?: string;
  phone?: string;
};

export const CHAPMAN_TEAM: ChapmanTeamMember[] = [
  {
    id: "william-chapman",
    name: "William Chapman",
    role: "Founder and CEO",
    group: "leadership",
    email: "kenchapsy@gmail.com",
    phone: "+44 7459 323742",
    bio: "Leads Chapman Prestige and sets its direction, with more than fifteen years in facility management. His promise is the one the whole team works to: every job done reliably, and done well.",
  },
  {
    id: "princeton-bright",
    name: "Princeton Bright",
    role: "Business Growth Strategist",
    group: "leadership",
    email: "derrickbright164@gmail.com",
    phone: "+233 54 212 8342",
    bio: "Grows Chapman's client partnerships across the Ashanti Region and watches quality while the work grows, so nothing is rushed in the name of speed.",
  },
  {
    id: "king-george-boakye",
    name: "King George Boakye",
    role: "Site Supervisor and Client Relations",
    group: "leadership",
    email: "boakyekinggeorge@gmail.com",
    phone: "+233 55 506 2231",
    bio: "Runs the work on site and stays in touch with clients directly. If a question comes up during your job, he is usually the person who answers it.",
  },
  {
    id: "princeton-sakyi",
    name: "Princeton Addington Kwayisi Sakyi",
    role: "Operations and Logistics Lead",
    group: "leadership",
    email: "princetonsakyi@gmail.com",
    phone: "+233 23 227 6648",
    bio: "Keeps the vans, the chemicals, and the equipment moving, so a booked date is a date Chapman can actually keep.",
  },
  {
    id: "comfort-anokye",
    name: "Comfort Anokye",
    role: "Laundry Supervisor",
    group: "site",
    bio: "Looks after your laundry from the moment it is collected to the moment it comes back: the rota, the quality checks, and the care given to every garment.",
  },
  {
    id: "james-owusu",
    name: "James Owusu",
    role: "Steam Press Operator",
    group: "site",
    bio: "Presses and finishes uniforms, linens, and delicate pieces on industrial equipment, and is the reason the work comes back crisp.",
  },
  {
    id: "hagar-asante",
    name: "Hagar Asante",
    role: "On-site Supervisor, St. Martins Hospital",
    group: "site",
    bio: "Leads daily cleaning in a clinical setting, trained in infection control, protective equipment, and hospital-grade disinfection.",
  },
  {
    id: "prosper-agbetsiame",
    name: "Prosper Agbetsiame",
    role: "Cleaning Team Lead",
    group: "site",
    bio: "Directs the cleaning crews in homes and businesses, with an eye for the details most people only notice when they are missed.",
  },
];

/** The two letters shown inside a person's bubble. */
export function teamInitials(member: ChapmanTeamMember): string {
  const parts = member.name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CP";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}
