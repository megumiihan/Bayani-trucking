"use client";

import { supplierOptionLabel, type Supplier } from "@/lib/suppliers";
import { inputClass } from "@/components/ui/formStyles";

interface SupplierPickerProps {
  suppliers: Supplier[];
  onPick: (supplier: Supplier) => void;
}

/**
 * Copies a supplier's details into the form fields, which stay editable. Resets
 * to the placeholder after each pick, since the fields (not this) hold the value.
 */
export default function SupplierPicker({ suppliers, onPick }: SupplierPickerProps) {
  if (suppliers.length === 0) return null;
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">
        Supplier
        <span className="ml-1 font-normal text-gray-400">(fills name, address and TIN)</span>
      </span>
      <select
        value=""
        onChange={(e) => {
          const supplier = suppliers.find((s) => s.id === e.target.value);
          if (supplier) onPick(supplier);
        }}
        className={inputClass}
      >
        <option value="">Choose from Clients &amp; suppliers…</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {supplierOptionLabel(s)}
          </option>
        ))}
      </select>
    </label>
  );
}
