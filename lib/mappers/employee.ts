import type { Employee as DbEmployee, EmployeeRole as DbRole } from "@prisma/client";
import type { Employee, EmployeeRole } from "@/lib/mockData";

function toUiRole(role: DbRole): EmployeeRole {
  if (role === "HELPER") return "Helper";
  return "Driver";
}

export function mapEmployeeToUi(record: DbEmployee): Employee {
  const role = toUiRole(record.role);

  return {
    id: record.id,
    name: record.fullName,
    role,
    position: role === "Driver" ? "Delivery Driver" : "Cargo Handler",
    employeeNo: "",
    dateOfBirth: "",
    address: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: null,
    tenureStatus: record.isActive ? "new" : "inactive",
    remarks: record.remarks ?? "",
  };
}
