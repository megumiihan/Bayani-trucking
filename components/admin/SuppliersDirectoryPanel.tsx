"use client";

import { useMemo, useState } from "react";
import { sortSuppliers, type Supplier } from "@/lib/suppliers";
import SupplierModal from "@/components/admin/SupplierModal";
import EmptyState from "@/components/ui/EmptyState";
import { filterInputClass } from "@/components/ui/formStyles";

interface SuppliersDirectoryPanelProps {
  initialSuppliers: Supplier[];
}

export default function SuppliersDirectoryPanel({ initialSuppliers }: SuppliersDirectoryPanelProps) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      [s.name, s.address, s.tin].some((v) => v.toLowerCase().includes(q)),
    );
  }, [suppliers, search]);

  const missingCount = suppliers.filter((s) => !s.address || !s.tin).length;

  const openModal = (supplier: Supplier | null) => {
    setEditing(supplier);
    setIsModalOpen(true);
  };

  const handleSaved = (saved: Supplier) => {
    setSuppliers((list) =>
      sortSuppliers(
        list.some((s) => s.id === saved.id)
          ? list.map((s) => (s.id === saved.id ? saved : s))
          : [...list, saved],
      ),
    );
    setIsModalOpen(false);
  };

  const handleDeleted = (id: string) => {
    setSuppliers((list) => list.filter((s) => s.id !== id));
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
              aria-label="Search suppliers"
              className={filterInputClass}
            />
          </div>
          {missingCount > 0 && (
            <p className="text-xs text-amber-700">
              {missingCount} {missingCount === 1 ? "supplier is" : "suppliers are"} missing an address or TIN
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => openModal(null)}
          className="self-start rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 sm:self-auto"
        >
          Add supplier
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {visible.length === 0 ? (
          <EmptyState
            icon={<StoreIcon />}
            title={suppliers.length === 0 ? "No suppliers yet" : "No matching suppliers"}
            description={
              suppliers.length === 0
                ? "Add a supplier to record their registered name, address and TIN."
                : "Try a different search."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Supplier</th>
                  <th scope="col" className="px-4 py-3">Address</th>
                  <th scope="col" className="px-4 py-3">TIN</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((supplier) => (
                  <tr key={supplier.id} className="align-top hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">{supplier.name}</td>
                    <td className="max-w-xs px-4 py-3 text-slate-700">
                      {supplier.address || <Missing />}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">
                      {supplier.tin || <Missing />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openModal(supplier)}
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

      <SupplierModal
        isOpen={isModalOpen}
        supplier={editing}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

function Missing() {
  return <span className="text-slate-400">Not set</span>;
}

function StoreIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
    </svg>
  );
}
