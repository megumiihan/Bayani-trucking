import { getDestinationRoutes } from "@/lib/queries/routes";
import { formatCurrency } from "@/lib/mockData";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function RoutesPage() {
  const destinationRates = await getDestinationRoutes();
  const clients = Array.from(new Set(destinationRates.map((r) => r.client)));

  return (
    <div>
      <PageHeader
        title="Routes & Rates"
        description="Destination-based pricing for Pepsi, Big Mak, and Roadwise."
      />

      <div className="space-y-8">
        {clients.map((client) => {
          const rates = destinationRates.filter((r) => r.client === client);

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
