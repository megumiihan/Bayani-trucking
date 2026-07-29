import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const xlsxPath = path.join(root, "lib/Destination-employee-rates.xlsx");
const outPath = path.join(root, "lib/destinationRates.generated.ts");

const wb = XLSX.readFile(xlsxPath);
const rows = XLSX.utils.sheet_to_json(wb.Sheets["Destination-Based"], {
  header: 1,
  defval: "",
});

function normalizeClient(raw) {
  if (raw === "PEPSI") return "Pepsi";
  if (raw === "BIGMAK") return "Big Mak";
  return raw;
}

function slugify(client, route, distance) {
  return `${client}-${route}-${distance}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const seen = new Set();
const rates = [];

for (let i = 1; i < rows.length; i++) {
  const [clientRaw, routeName, distance, driver, helper, extra] = rows[i];
  if (!clientRaw || !routeName) continue;
  if (typeof driver !== "number" || typeof helper !== "number") continue;

  const client = normalizeClient(clientRaw);
  const distanceBand = distance || "";
  const key = `${client}|${routeName}|${distanceBand}`;
  if (seen.has(key)) continue;
  seen.add(key);

  rates.push({
    id: slugify(client, routeName, distanceBand),
    client,
    routeName: String(routeName).trim(),
    distance: distanceBand,
    driverBaseRate: driver,
    helperBaseRate: helper,
    extraHelperBaseRate: typeof extra === "number" ? extra : helper,
  });
}

rates.sort((a, b) => {
  if (a.client !== b.client) return a.client.localeCompare(b.client);
  if (a.routeName !== b.routeName) return a.routeName.localeCompare(b.routeName);
  return a.distance.localeCompare(b.distance);
});

const out = `// Auto-generated from lib/Destination-employee-rates.xlsx — do not edit manually
// Regenerate: npm run generate:rates

export const generatedDestinationRates = ${JSON.stringify(rates, null, 2)};
`;

fs.writeFileSync(outPath, out);
console.log(`Generated ${rates.length} destination rates → lib/destinationRates.generated.ts`);
