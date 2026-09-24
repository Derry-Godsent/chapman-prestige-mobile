/**
 * A colour for each service, in both skins.
 *
 * The services used one shared green everywhere, and their stored accents are
 * earthy browns that disappear on a dark screen. Each service now has its own
 * colour, and a brighter version of it for the dark skin, so a customer can tell
 * the services apart at a glance on either skin.
 *
 * The wash is the pale background used behind an icon, and the ring is its
 * border. Both are chosen per skin rather than mixed from the accent, so they
 * stay readable instead of turning muddy.
 */

export type ServiceColor = {
  /** The service's own colour, used for its icons, price hint, and action text. */
  accent: { light: string; dark: string };
  /** The pale block behind the service's icon. */
  wash: { light: string; dark: string };
  /** The thin line around that block or a card. */
  ring: { light: string; dark: string };
};

const serviceColorMap: Record<string, ServiceColor> = {
  // Brand green, because laundry is the service Chapman is known for.
  laundry: {
    accent: { light: "#047857", dark: "#34D399" },
    wash: { light: "#E4F4E9", dark: "#14301F" },
    ring: { light: "#A7D8C4", dark: "#2F6B52" },
  },
  // Blue, clean and cool, for deep cleaning.
  cleaning: {
    accent: { light: "#1D6FD0", dark: "#6FB6FF" },
    wash: { light: "#E6F0FD", dark: "#16263A" },
    ring: { light: "#B6D5F5", dark: "#2C4A70" },
  },
  // Amber, for the safety work.
  fumigation: {
    accent: { light: "#B45309", dark: "#FBBF6E" },
    wash: { light: "#FDF0DC", dark: "#33260F" },
    ring: { light: "#EFCF9B", dark: "#6B5220" },
  },
  // Violet, for the vehicles.
  detailing: {
    accent: { light: "#6D28D9", dark: "#C4A6FF" },
    wash: { light: "#F1E9FE", dark: "#271C3D" },
    ring: { light: "#CFB8FB", dark: "#513C82" },
  },
  // Rose, for fabrics and upholstery.
  fabric: {
    accent: { light: "#BE185D", dark: "#FDA4C4" },
    wash: { light: "#FDE8F1", dark: "#3A1A28" },
    ring: { light: "#F4BDD4", dark: "#77354F" },
  },
  // Cyan, for water.
  polytank: {
    accent: { light: "#0E7490", dark: "#5ED8F0" },
    wash: { light: "#E0F5FA", dark: "#0F2C35" },
    ring: { light: "#A9DCE9", dark: "#22586A" },
  },
  // Teal, for contract and office work.
  contract: {
    accent: { light: "#0F766E", dark: "#5EEAD4" },
    wash: { light: "#E2F5F2", dark: "#12302D" },
    ring: { light: "#A9DED6", dark: "#245F58" },
  },
  // Gold, for the team.
  workers: {
    accent: { light: "#B7791F", dark: "#F6C769" },
    wash: { light: "#FCF3DE", dark: "#332811" },
    ring: { light: "#EED7A4", dark: "#6B5522" },
  },
};

const shared: ServiceColor = {
  accent: { light: "#047857", dark: "#34D399" },
  wash: { light: "#E4F4E9", dark: "#14301F" },
  ring: { light: "#A7D8C4", dark: "#2F6B52" },
};

export function serviceColor(serviceId: string, scheme: "light" | "dark") {
  const entry = serviceColorMap[serviceId] ?? shared;
  return {
    accent: entry.accent[scheme],
    wash: entry.wash[scheme],
    ring: entry.ring[scheme],
  };
}

/** Every service id that has its own colour, for the tests to check. */
export const serviceColorIds = Object.keys(serviceColorMap);
