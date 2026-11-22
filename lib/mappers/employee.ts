import type { Employee as DbEmployee, EmployeeRole as DbRole } from "@prisma/client";
import type { Employee, EmployeeRole } from "@/lib/mockData";
import { employeePhotoUrl } from "@/lib/employeePhotos";

export function toUiRole(role: DbRole): EmployeeRole {
  if (role === "HELPER") return "Helper";
  if (role === "SECRETARY") return "Secretary";
  return "Driver";
}

export function toDbRole(role: EmployeeRole): DbRole {
  if (role === "Helper") return "HELPER";
  if (role === "Secretary") return "SECRETARY";
  return "DRIVER";
}

const POSITION: Record<EmployeeRole, string> = {
  Driver: "Delivery Driver",
  Helper: "Cargo Handler",
  Secretary: "Office Secretary",
};

export function mapEmployeeToUi(record: DbEmployee): Employee {
  const role = toUiRole(record.role);

  return {
    id: record.id,
    name: record.fullName,
    role,
    position: POSITION[role],
    employeeNo: "",
    dateOfBirth: "",
    address: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: null,
    tenureStatus: record.isActive ? "new" : "inactive",
    isActive: record.isActive,
    remarks: record.remarks ?? "",
    bountyExp: record.bountyExp,
    photoUrl: employeePhotoUrl(record.photoPath),
    isRegular: record.isRegular,
  };
}
