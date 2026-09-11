import { getClients } from "@/lib/queries/clients";
import { getDestinationRoutes } from "@/lib/queries/routes";
import {
  isLivestockClient,
  isPlatformClient,
  isWeightClient,
} from "@/lib/clients";
import LivestockRatesPanel from "@/components/admin/LivestockRatesPanel";
import PlatformRatesPanel from "@/components/admin/PlatformRatesPanel";
import DestinationRatesPanel from "@/components/admin/DestinationRatesPanel";
import WeightRatesPanel from "@/components/admin/WeightRatesPanel";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function RoutesPage() {
  const [destinationRates, allClients] = await Promise.all([
    getDestinationRoutes(),
    getClients(),
  ]);

  const weightRates = destinationRates.filter((rate) => rate.weightKg != null);
  const destinationClients = allClients.filter(
    (client) => client.calculationType === "Destination"
  );
  const destinationClientNames = new Set(
    destinationClients.map((client) => client.name)
  );
  const destinationOnlyRates = destinationRates.filter(
    (rate) => rate.weightKg == null && destinationClientNames.has(rate.client)
  );

  const livestockClients = allClients.filter((client) =>
    isLivestockClient(client)
  );
  const platformClients = allClients.filter((client) =>
    isPlatformClient(client)
  );
  const weightClients = allClients.filter((client) => isWeightClient(client));

  return (
    <div>
      <PageHeader
        title="Routes & Rates"
        description="Manage destination, livestock, platform, and weight-based payout rates."
      />

      <div className="space-y-8">
        <DestinationRatesPanel
          clients={destinationClients}
          initialRates={destinationOnlyRates}
        />

        <LivestockRatesPanel clients={livestockClients} />
        <PlatformRatesPanel clients={platformClients} />

        <WeightRatesPanel clients={weightClients} rates={weightRates} />
      </div>
    </div>
  );
}
