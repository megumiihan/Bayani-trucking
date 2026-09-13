import { useMemo, useState } from "react";
import {
  defaultBillableFilters,
  summarizeBillablesByClient,
} from "@/lib/billableFilters";
import type { CollectionReceiptUi, BillableUi } from "@/lib/bookkeeping";
import type { Client } from "@/lib/clients";
import { formatCurrency } from "@/lib/mockData";
import { filterInputClass } from "@/components/ui/formStyles";
import MultiSelect from "@/components/ui/MultiSelect";

interface ClientBillableSummaryProps {
  billables: BillableUi[];
  receipts: CollectionReceiptUi[];
  clients: Client[];
}

export default function ClientBillableSummary({
  billables,
  receipts,
  clients,
}: ClientBillableSummaryProps) {
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const rows = useMemo(
    () =>
      summarizeBillablesByClient(billables, receipts, {
        ...defaultBillableFilters,
        clientIds,
        dateDuration: startDate || endDate ? "custom" : "all",
        customStartDate: startDate,
        customEndDate: endDate,
      }),
    [billables, clientIds, endDate, receipts, startDate]
  );

  return (
    <section className="card-surface mb-6 overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">By client</h2>
          <p className="text-xs text-slate-500">
            Total billable and remaining after collections for each client.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[36rem]">
          <label>
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
              Clients
            </span>
            <MultiSelect
              aria-label="Filter client totals"
              allLabel="All clients"
              options={clients.map((client) => ({
                id: client.id,
                label: client.name,
              }))}
              value={clientIds}
              onChange={setClientIds}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
              Start date
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={filterInputClass}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
              End date
            </span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className={filterInputClass}
            />
          </label>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-500">
          {clientIds.length === 0 && !startDate && !endDate
            ? "No client billables yet."
            : "No billables or collections match these filters."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Client
                </th>
                <th className="px-5 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Total billable
                </th>
                <th className="px-5 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  After collections
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.clientId}>
                  <td className="px-5 py-2.5 font-medium text-slate-900">
                    {row.clientName}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-slate-700">
                    {formatCurrency(row.totalBillables)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium tabular-nums text-slate-900">
                    {formatCurrency(row.afterCollections)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
