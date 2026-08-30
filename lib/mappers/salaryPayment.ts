import type { SalaryPayment } from "@prisma/client";

export type SalaryPaymentUi = {
  id: string;
  employeeId: string;
  amount: number;
  paidAt: string;
  note: string | null;
  createdById: string;
};

export function mapSalaryPaymentToUi(record: SalaryPayment): SalaryPaymentUi {
  return {
    id: record.id,
    employeeId: record.employeeId,
    amount: record.amount,
    paidAt: record.paidAt.toISOString().slice(0, 10),
    note: record.note,
    createdById: record.createdById,
  };
}
