import { employees } from "./mockData";

export type AccountRole = "employee" | "admin";

export interface MockUser {
  id: string;
  employeeId: string | null;
  displayName: string;
  accountRole: AccountRole;
}

export const DEFAULT_EMPLOYEE_USER_ID = "user-001";
export const DEFAULT_ADMIN_USER_ID = "user-admin-001";

/** Mock app user accounts — linked to employee records where applicable. */
export const mockUsers: MockUser[] = [
  {
    id: "user-001",
    employeeId: "emp-001",
    displayName: "Arsenio Tumanan",
    accountRole: "employee",
  },
  {
    id: "user-002",
    employeeId: "emp-002",
    displayName: "Bryan Abon",
    accountRole: "employee",
  },
  {
    id: "user-003",
    employeeId: "emp-003",
    displayName: "Melvin Abon",
    accountRole: "employee",
  },
  {
    id: "user-004",
    employeeId: "emp-004",
    displayName: "Axel Apostol",
    accountRole: "employee",
  },
  {
    id: "user-005",
    employeeId: "emp-005",
    displayName: "Joel Ancheta",
    accountRole: "employee",
  },
  {
    id: "user-006",
    employeeId: "emp-006",
    displayName: "Marc Joe Marcos",
    accountRole: "employee",
  },
  {
    id: "user-007",
    employeeId: "emp-007",
    displayName: "Leo Watanabe",
    accountRole: "employee",
  },
  {
    id: "user-008",
    employeeId: "emp-008",
    displayName: "Rolando Mabborang",
    accountRole: "employee",
  },
  {
    id: "user-009",
    employeeId: "emp-009",
    displayName: "Junel Batuy",
    accountRole: "employee",
  },
  {
    id: "user-010",
    employeeId: "emp-010",
    displayName: "Freddie Flores",
    accountRole: "employee",
  },
  {
    id: "user-011",
    employeeId: "emp-011",
    displayName: "Elvert Sta. Eglesia",
    accountRole: "employee",
  },
  {
    id: "user-012",
    employeeId: "emp-012",
    displayName: "Jomar Saguiped",
    accountRole: "employee",
  },
  {
    id: "user-013",
    employeeId: "emp-013",
    displayName: "Marino Marimon",
    accountRole: "employee",
  },
  {
    id: "user-014",
    employeeId: "emp-014",
    displayName: "Edsel Alcantara",
    accountRole: "employee",
  },
  {
    id: "user-015",
    employeeId: "emp-015",
    displayName: "Frederick Marcos",
    accountRole: "employee",
  },
  {
    id: DEFAULT_ADMIN_USER_ID,
    employeeId: null,
    displayName: "Operations Admin",
    accountRole: "admin",
  },
];

export function getUserById(userId: string): MockUser | undefined {
  return mockUsers.find((user) => user.id === userId);
}

export function getUserByEmployeeId(employeeId: string): MockUser | undefined {
  return mockUsers.find((user) => user.employeeId === employeeId);
}

export function getUserByEmployeeName(name: string): MockUser | undefined {
  const employee = employees.find((e) => e.name === name);
  if (!employee) return undefined;
  return getUserByEmployeeId(employee.id);
}

export function getUserDisplayName(userId: string): string {
  return getUserById(userId)?.displayName ?? "Unknown user";
}

export function getEmployeeUserAccounts(): MockUser[] {
  return mockUsers.filter((user) => user.accountRole === "employee");
}
