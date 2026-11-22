export interface Supplier {
  id: string;
  name: string;
  address: string;
  tin: string;
}

export type SupplierDirectoryEntry = Omit<Supplier, "id">;

/**
 * Suppliers from "CLIENTS & SUPPLIERS.docx", one row per branch (the document
 * repeats many). Seeded by prisma/seed.ts and scripts/sync-client-details.ts;
 * edited afterwards on Bookkeeping → Clients & suppliers.
 */
export const SUPPLIER_DIRECTORY: SupplierDirectoryEntry[] = [
  { name: "CAUAYAN PETRON SERVICE CENTER", address: "DISTRICT 1 CAUAYAN CITY, ISABELA", tin: "122 651 054 00000" },
  { name: "CELCIUS MERCHANDISING & AUTO PARTS SUPPLY G.P.O. CORP.", address: "SAN FERMIN CAUAYAN ISABELA", tin: "607 646 493 00001" },
  { name: "CENTRO UNITED MERCHANDISING", address: "DISTRICT 2 CAUAYAN CITY, ISABELA", tin: "903 455 440 001" },
  { name: "FAMOUS PARTS & AUTO SUPPLY", address: "DISTRICT 1 CAUAYAN CITY, ISABELA", tin: "168 087 522 00000" },
  { name: "GOLDTOWN INDUSTRIAL SALES CORP", address: "DISTRICT 1 CAUAYAN CITY, ISABELA", tin: "006 428 097 00006" },
  { name: "IKA TRADING AND CONSTRUCTION CORP", address: "DISTRICT 1 CAUAYAN CITY, ISABELA", tin: "623 009 059 00000" },
  { name: "IKA TRADING AND CONSTRUCTION CORP", address: "SAN FERMIN CAUAYAN ISABELA", tin: "623 009 059 00000" },
  { name: "JAYVIE CAR AIRCON REPAIR SHOP", address: "BUENA SUERTE CAUAYAN CITY", tin: "NV 671 326 610 00000" },
  { name: "JL CLEAN FUEL INCORPORATED", address: "MUNOZ NUEVA ECIJA", tin: "009 837 423 00020" },
  { name: "JL CLEAN FUEL INCORPORATED", address: "NAMABBLAN NORTE TUGUEGARAO CITY", tin: "009 837 423 00012" },
  { name: "RSR MOTOR PARTS TRADING", address: "DISTRICT 1 CAUAYAN CITY, ISABELA", tin: "635 521 093 00000" },
  { name: "SEVEN DIAMOND MERCHANDISING", address: "DISTRICT 1 CAUAYAN CITY, ISABELA", tin: "938 647 943 000" },
  { name: "STAR PAINT CENTER", address: "DISTRICT 1 CAUAYAN CITY, ISABELA", tin: "750 581 483 00000" },
  { name: "YAP CARESSA DIANE ENT CORP", address: "SAN FERMIN CAUAYAN ISABELA", tin: "009 179 266 011" },
];

/** Label for dropdowns, where branches of one company share a name. */
export function supplierOptionLabel(supplier: Pick<Supplier, "name" | "address">) {
  return supplier.address ? `${supplier.name} — ${supplier.address}` : supplier.name;
}

export function sortSuppliers<T extends Pick<Supplier, "name" | "address">>(list: T[]) {
  return [...list].sort(
    (a, b) => a.name.localeCompare(b.name) || a.address.localeCompare(b.address),
  );
}
