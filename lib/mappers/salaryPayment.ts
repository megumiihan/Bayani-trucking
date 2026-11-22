import type { Prisma } from "@prisma/client";

export type SalaryPaymentUi = {
  id: string;
  employeeId: string;
  amount: number;
  paidAt: string;
  note: string | null;
  createdById: string;
  /** Who logged the payment (employee name, else login email). */
  createdByName: string;
};

export const paymentInclude = {
  createdBy: { select: { email: true, employee: { select: { fullName: true } } } },
} as const;

type PaymentRecord = Prisma.SalaryPaymentGetPayload<{ include: typeof paymentInclude }>;

export function mapSalaryPaymentToUi(record: PaymentRecord): SalaryPaymentUi {
  return {
    id: record.id,
    employeeId: record.employeeId,
    amount: record.amount,
    paidAt: record.paidAt.toISOString().slice(0, 10),
    note: record.note,
    createdById: record.createdById,
    createdByName: record.createdBy.employee?.fullName ?? record.createdBy.email,
  };
}
