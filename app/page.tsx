import { getShipments } from "@/lib/queries/shipments";
import HomePageClient from "@/components/views/HomePageClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const shipments = await getShipments();

  return <HomePageClient initialShipments={shipments} />;
}
