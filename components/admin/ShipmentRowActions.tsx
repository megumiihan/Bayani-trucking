"use client";

import type { ReactNode } from "react";
import type { Shipment } from "@/lib/mockData";

interface ShipmentRowActionsProps {
  shipment: Shipment;
  isFlagging: boolean;
  onEdit: () => void;
  onToggleApprove: () => void;
  onToggleFlag: () => void;
  onDelete: () => void;
}

const baseButton =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-[transform,background-color,border-color,color] hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100";

export default function ShipmentRowActions({
  shipment,
  isFlagging,
  onEdit,
  onToggleApprove,
  onToggleFlag,
  onDelete,
}: ShipmentRowActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <ActionIconButton
        label="Edit shipment"
        onClick={onEdit}
        className={`${baseButton} border-slate-200/80 text-slate-400 hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-600 focus-visible:ring-blue-300`}
      >
        <PencilIcon />
      </ActionIconButton>

      <ActionIconButton
        label={shipment.approved ? "Remove approval" : "Approve shipment"}
        onClick={onToggleApprove}
        className={
          shipment.approved
            ? `${baseButton} border-emerald-200 bg-emerald-50/80 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 focus-visible:ring-emerald-300`
            : `${baseButton} border-slate-200/80 text-slate-400 hover:border-emerald-200 hover:bg-emerald-50/60 hover:text-emerald-600 focus-visible:ring-emerald-300`
        }
      >
        <CheckIcon approved={shipment.approved} />
      </ActionIconButton>

      <ActionIconButton
        label={shipment.flagged ? "Unflag shipment" : "Flag shipment"}
        onClick={onToggleFlag}
        disabled={isFlagging}
        className={
          shipment.flagged
            ? `${baseButton} border-amber-200 bg-amber-50/80 text-amber-600 hover:border-amber-300 hover:bg-amber-50 focus-visible:ring-amber-300`
            : `${baseButton} border-slate-200/80 text-slate-400 hover:border-amber-200 hover:bg-amber-50/60 hover:text-amber-600 focus-visible:ring-amber-300`
        }
      >
        {isFlagging ? <Spinner /> : <FlagIcon filled={shipment.flagged} />}
      </ActionIconButton>

      <ActionIconButton
        label="Delete shipment"
        onClick={onDelete}
        className={`${baseButton} border-slate-200/80 text-slate-400 hover:border-rose-200 hover:bg-rose-50/60 hover:text-rose-600 focus-visible:ring-rose-300`}
      >
        <TrashIcon />
      </ActionIconButton>
    </div>
  );
}

function ActionIconButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span className="block h-2.5 w-2.5 animate-spin motion-reduce:animate-none rounded-full border-[1.5px] border-slate-200 border-t-slate-500" />
  );
}

function PencilIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  );
}

function CheckIcon({ approved }: { approved: boolean }) {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      {approved ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      )}
    </svg>
  );
}

function FlagIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="h-3 w-3"
      fill={filled ? "currentColor" : "none"}
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.385a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}
