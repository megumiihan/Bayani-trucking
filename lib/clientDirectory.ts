/**
 * Registered names, addresses and TINs for billing clients, keyed by the short
 * name the rest of the app uses. Seeded by prisma/seed.ts and
 * scripts/sync-client-details.ts; edited afterwards on the Clients tab.
 */
export interface ClientDirectoryEntry {
  name: string;
  legalName: string;
  address: string;
  tin: string;
}

export const CLIENT_DIRECTORY: ClientDirectoryEntry[] = [
  {
    name: "Charoen",
    legalName: "CHAROEN POKPHAND FOODS PHIL. CORP.",
    address: "BRGY BALIGATAN CITY OF ILAGAN, ISABELA",
    tin: "252 135 912 089",
  },
  {
    name: "Chooks To Go",
    legalName: "CHOOKS TO GO INC.",
    address: "ORTIGAS CENTER PASIG CITY",
    tin: "609 277 057 000",
  },
  {
    name: "Bounty",
    legalName: "BOUNTY PLUS INC.",
    address: "ORTIGAS CENTER PASIG CITY",
    tin: "010 346 918 000",
  },
  {
    name: "Pepsi",
    legalName: "PEPSI COLA PRODUCTS PHILIPPINES INC",
    address: "TAGARAN, CAUAYAN CITY, ISABELA",
    tin: "000 168 541 067",
  },
  {
    name: "Big Mak",
    legalName: "L.C. BIG MAK BURGER, INC.",
    address: "LUCENA CITY",
    tin: "",
  },
  {
    name: "Mobers",
    legalName: "MOBERS",
    address: "",
    tin: "",
  },
];

/**
 * Groups a TIN as "000 000 000" plus the branch code as one group, so both
 * "000 168 541 067" and "009 837 423 00020" keep their shape. Anything
 * non-numeric (e.g. "NV 671 326 610 00000") is left as typed.
 */
export function formatTin(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits)) return trimmed.replace(/\s+/g, " ");
  const base = digits.slice(0, 9).match(/.{1,3}/g)!;
  const branch = digits.slice(9);
  return [...base, ...(branch ? [branch] : [])].join(" ");
}
