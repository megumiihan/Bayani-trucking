"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getCalculationTypeLabel, type Client } from "@/lib/clients";
import ClientDetailsModal from "@/components/admin/ClientDetailsModal";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { filterInputClass } from "@/components/ui/formStyles";

interface ClientsDirectoryPanelProps {
  initialClients: Client[];
}

export default function ClientsDirectoryPanel({ initialClients }: ClientsDirectoryPanelProps) {
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.legalName, c.address, c.tin].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [clients, search]);

  const missingCount = clients.filter((c) => !c.address || !c.tin).length;

  const openModal = (client: Client | null) => {
    setEditing(client);
    setIsModalOpen(true);
  };

  const handleSaved = (saved: Client) => {
    setClients((list) => {
      const next = list.some((c) => c.id === saved.id)
        ? list.map((c) => (c.id === saved.id ? saved : c))
        : [...list, saved];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <div className="w-full sm:w-72">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, address or TIN"
              aria-label="Search clients"
              className={filterInputClass}
            />
          </div>
          {missingCount > 0 && (
            <p className="text-xs text-amber-700">
              {missingCount} {missingCount === 1 ? "client is" : "clients are"} missing an address or TIN
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => openModal(null)}
          className="self-start rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 sm:self-auto"
        >
          Add client
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {visible.length === 0 ? (
          <EmptyState
            icon={<BuildingIcon />}
            title={clients.length === 0 ? "No clients yet" : "No matching clients"}
            description={
              clients.length === 0
                ? "Add a client to record their registered name, address and TIN."
                : "Try a different search."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Client</th>
                  <th scope="col" className="px-4 py-3">Address</th>
                  <th scope="col" className="px-4 py-3">TIN</th>
                  <th scope="col" className="px-4 py-3">Billing</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((client) => (
                  <tr key={client.id} className="align-top hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                      >
                        {client.legalName || client.name}
                      </Link>
                      {client.legalName && client.legalName !== client.name && (
                        <p className="text-xs text-slate-500">{client.name}</p>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-700">
                      {client.address || <Missing />}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">
                      {client.tin || <Missing />}
                    </td>
                    <td className="px-4 py-3">
                      {client.isTemporary ? (
                        <Badge label="Other" className="bg-amber-100 text-amber-800" />
                      ) : (
                        <Badge label={getCalculationTypeLabel(client.calculationType)} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openModal(client)}
                        className="rounded-md px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ClientDetailsModal
        isOpen={isModalOpen}
        client={editing}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}

function Missing() {
  return <span className="text-slate-400">Not set</span>;
}

function BuildingIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}
