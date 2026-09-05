import { getClients } from "@/lib/queries/clients";
import { getDestinationRoutes } from "@/lib/queries/routes";
import { isLivestockClient, isPlatformClient } from "@/lib/clients";
import { formatCurrency } from "@/lib/mockData";
import LivestockRatesPanel from "@/components/admin/LivestockRatesPanel";
import PlatformRatesPanel from "@/components/admin/PlatformRatesPanel";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function RoutesPage() {
  const [destinationRates, allClients] = await Promise.all([
    getDestinationRoutes(),
    getClients(),
  ]);
  const weightRates = destinationRates.filter((rate) => rate.weightKg != null);
  const destinationClients = Array.from(
    new Set(
      destinationRates
        .filter((rate) => rate.weightKg == null)
        .map((r) => r.client)
    )
  );
  const livestockClients = allClients.filter((client) =>
    isLivestockClient(client)
  );
  const platformClients = allClients.filter((client) =>
    isPlatformClient(client)
  );

  return (
    <div>
      <PageHeader
        title="Routes & Rates"
        description="Destination, livestock, platform, and weight-based rates."
      />

      <div className="space-y-8">
        <LivestockRatesPanel clients={livestockClients} />
        <PlatformRatesPanel clients={platformClients} />

        {weightRates.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                Weight-based rates
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Payout depends on destination, kg tier, and each person’s
                bountyexp. Same-driver rate applies when the helper is a driver.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Client",
                      "Destination",
                      "KG",
                      "Helper",
                      "Driver",
                      "Same driver",
                      "New helper",
                      "New driver",
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {weightRates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {rate.client}
                      </td>
                      <td className="px-4 py-3 text-blue-700">
                        {rate.routeName}
                        {rate.distance ? (
                          <span className="mt-0.5 block text-xs text-gray-500">
                            {rate.distance}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{rate.weightKg}</td>
                      <td className="px-4 py-3">
                        {formatCurrency(rate.helperBaseRate)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(rate.driverBaseRate)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(rate.sameDriverRate ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(rate.newHelperRate ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(rate.newDriverRate ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {destinationClients.map((client) => {
          const rates = destinationRates.filter(
            (r) => r.client === client && r.weightKg == null
          );

          return (
            <div
              key={client}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-base font-semibold text-gray-900">
                  {client} Route Pricing
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "Route",
                        "Distance",
                        "Description",
                        "Driver Base",
                        "Helper Base",
                        "Extra Helper Base",
                      ].map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rates.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-blue-700">
                          {r.routeName}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {r.distance || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.description}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {formatCurrency(r.driverBaseRate)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {formatCurrency(r.helperBaseRate)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {formatCurrency(r.extraHelperBaseRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
