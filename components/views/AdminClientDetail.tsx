"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { billableAmountDue, type BillableUi, type CollectionReceiptUi } from "@/lib/bookkeeping";
import { daysSince, summarizeClientCollections, unpaidBillables } from "@/lib/clientCollections";
import { getCalculationTypeLabel, type Client } from "@/lib/clients";
import { formatCurrency } from "@/lib/mockData";
import { formatShortDate } from "@/lib/truckMaintenance";
import ClientDetailsModal from "@/components/admin/ClientDetailsModal";
import { billingStyles, ClientMonogram } from "@/components/views/AdminClientsOverview";
import Badge from "@/components/ui/Badge";

interface AdminClientDetailProps {
  initialClient: Client;
  billables: BillableUi[];
  receipts: CollectionReceiptUi[];
}

type Period = "month" | "lifetime";
type CollectionsTab = "receipts" | "unpaid";

const thisMonthPrefix = () => new Date().toLocaleDateString("en-CA").slice(0, 7);

export default function AdminClientDetail({ initialClient, billables, receipts }: AdminClientDetailProps) {
  const [client, setClient] = useState(initialClient);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("lifetime");
  const [tab, setTab] = useState<CollectionsTab>("receipts");

  const monthPrefix = thisMonthPrefix();
  const monthLabel = new Date().toLocaleDateString("en-PH", { month: "long", year: "numeric" });

  const periodReceipts = useMemo(
    () => (period === "month" ? receipts.filter((r) => r.datePaid.startsWith(monthPrefix)) : receipts),
    [receipts, period, monthPrefix],
  );
  const periodBillables = useMemo(
    () => (period === "month" ? billables.filter((b) => b.date.startsWith(monthPrefix)) : billables),
    [billables, period, monthPrefix],
  );

  // Billed/collected follow the period; outstanding is always as of today.
  const periodSummary = summarizeClientCollections(periodBillables, periodReceipts);
  const lifetime = useMemo(() => summarizeClientCollections(billables, receipts), [billables, receipts]);
  const unpaid = useMemo(
    () => [...unpaidBillables(billables, receipts)].sort((a, b) => a.date.localeCompare(b.date)),
    [billables, receipts],
  );

  const styles = billingStyles[client.calculationType];
  const hasLegalName = Boolean(client.legalName) && client.legalName !== client.name;

  return (
    <div>
      <Link
        href={client.isTemporary ? "/admin/bookkeeping/directory" : "/admin/clients"}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800"
      >
        ← Back to {client.isTemporary ? "Clients & suppliers" : "Client Overview"}
      </Link>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Profile card */}
        <section className="self-start overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className={`h-16 ${styles.header}`} />
          <div className="-mt-10 px-6 pb-6">
            <div className="flex flex-col items-center text-center">
              <ClientMonogram client={client} size={88} className="ring-4 ring-white" />
              <h1 className="mt-3 text-balance text-xl font-bold tracking-tight text-slate-900">
                {client.legalName || client.name}
              </h1>
              {hasLegalName && <p className="text-sm text-slate-500">{client.name}</p>}
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {client.isTemporary ? (
                  <Badge label="Other (one-off)" className="bg-amber-100 text-amber-800" />
                ) : (
                  <Badge label={getCalculationTypeLabel(client.calculationType)} className={styles.badge} />
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit details
            </button>

            <div className="mt-5 border-t border-gray-100 pt-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">General info</h2>
              <dl className="space-y-3">
                <InfoRow label="Short name" value={client.name} />
                <InfoRow label="Registered name" value={client.legalName} />
                <InfoRow label="TIN" value={client.tin} mono />
                <InfoRow label="Address" value={client.address} />
                <InfoRow label="Billing" value={getCalculationTypeLabel(client.calculationType)} />
                <InfoRow label="Invoices" value={String(lifetime.invoiceCount)} />
                <InfoRow
                  label="Last collection"
                  value={lifetime.lastCollectedOn ? formatShortDate(lifetime.lastCollectedOn) : ""}
                  emptyLabel="None yet"
                />
              </dl>
            </div>

            <Link
              href="/admin/routes"
              className="mt-5 block text-center text-xs font-medium text-blue-700 hover:underline"
            >
              View rates on Routes &amp; Rates →
            </Link>
          </div>
        </section>

        {/* Collections card */}
        <section className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Collections</h2>
              <p className="text-sm text-gray-500">
                {period === "lifetime" ? "All recorded invoices and receipts" : monthLabel}
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
              {(
                [
                  { key: "month", label: "This month" },
                  { key: "lifetime", label: "Lifetime" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={period === opt.key}
                  onClick={() => setPeriod(opt.key)}
                  className={`rounded-md px-3 py-1 ${
                    period === opt.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-3">
            <SummaryStat label="Billed (net of withholding)" value={formatCurrency(periodSummary.billed)} accent="bg-blue-500" />
            <SummaryStat label="Collected" value={formatCurrency(periodSummary.collected)} accent="bg-green-500" />
            <SummaryStat
              label="Outstanding today"
              value={formatCurrency(lifetime.outstanding)}
              accent={lifetime.outstanding > 0 ? "bg-amber-400" : "bg-slate-300"}
              note={`${lifetime.unpaidCount} unpaid ${lifetime.unpaidCount === 1 ? "invoice" : "invoices"}`}
            />
          </div>

          <div className="border-t border-gray-100 px-6 pt-4">
            <div role="tablist" aria-label="Collections" className="inline-flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              {(
                [
                  { key: "receipts", label: `Receipts (${periodReceipts.length})` },
                  { key: "unpaid", label: `Unpaid invoices (${unpaid.length})` },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === opt.key}
                  onClick={() => setTab(opt.key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    tab === opt.key ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 pb-6 pt-4">
            {tab === "receipts" ? (
              <ReceiptsTable receipts={periodReceipts} />
            ) : (
              <UnpaidTable billables={unpaid} />
            )}
          </div>
        </section>
      </div>

      <ClientDetailsModal
        isOpen={isEditOpen}
        client={client}
        onClose={() => setIsEditOpen(false)}
        onSaved={(saved) => {
          setClient(saved);
          setIsEditOpen(false);
        }}
      />
    </div>
  );
}

function ReceiptsTable({ receipts }: { receipts: CollectionReceiptUi[] }) {
  if (receipts.length === 0) {
    return <EmptyNote text="No collection receipts in this period." />;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
          <tr>
            <th scope="col" className="px-3 py-2.5">Date paid</th>
            <th scope="col" className="px-3 py-2.5">OR no.</th>
            <th scope="col" className="px-3 py-2.5">Invoices paid</th>
            <th scope="col" className="px-3 py-2.5">Paid by / received by</th>
            <th scope="col" className="px-3 py-2.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {receipts.map((r) => (
            <tr key={r.id} className="align-top hover:bg-gray-50">
              <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">{formatShortDate(r.datePaid)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-medium tabular-nums text-gray-900">{r.orNumber}</td>
              <td className="px-3 py-2.5 text-gray-700">
                {r.items.length === 0 ? (
                  <span className="text-gray-400">—</span>
                ) : (
                  <span className="tabular-nums">{r.items.map((i) => i.invoiceNo).join(", ")}</span>
                )}
                {r.paymentDetails && <p className="text-xs text-gray-500">{r.paymentDetails}</p>}
              </td>
              <td className="px-3 py-2.5 text-gray-700">
                {r.whoPaid}
                <p className="text-xs text-gray-500">{r.whoReceived}</p>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-green-700">
                {formatCurrency(r.collectionAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnpaidTable({ billables }: { billables: BillableUi[] }) {
  if (billables.length === 0) {
    return <EmptyNote text="Every invoice for this client has been collected." />;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
          <tr>
            <th scope="col" className="px-3 py-2.5">SI date</th>
            <th scope="col" className="px-3 py-2.5">SI no.</th>
            <th scope="col" className="px-3 py-2.5 text-right">Age</th>
            <th scope="col" className="px-3 py-2.5 text-right">Invoice total</th>
            <th scope="col" className="px-3 py-2.5 text-right">Amount due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {billables.map((b) => {
            const age = daysSince(b.date);
            return (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">{formatShortDate(b.date)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-medium tabular-nums text-gray-900">{b.invoiceNo}</td>
                <td className={`whitespace-nowrap px-3 py-2.5 text-right tabular-nums ${age > 30 ? "font-medium text-red-600" : "text-gray-700"}`}>
                  {age} {age === 1 ? "day" : "days"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-gray-700">
                  {formatCurrency(b.totalInvoiceAmt)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-amber-700">
                  {formatCurrency(billableAmountDue(b.totalInvoiceAmt, b.withholdingTax))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">{text}</p>
  );
}

function SummaryStat({ label, value, accent, note }: { label: string; value: string; accent: string; note?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      <div className={`mt-1.5 h-0.5 w-full max-w-[10rem] rounded-full ${accent}`} />
      {note && <p className="mt-1.5 text-xs text-gray-500">{note}</p>}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
  emptyLabel = "Not set",
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`min-w-0 break-words font-semibold text-gray-900 ${mono ? "tabular-nums" : ""}`}>
        {value || <span className="font-normal text-gray-400">{emptyLabel}</span>}
      </dd>
    </div>
  );
}
