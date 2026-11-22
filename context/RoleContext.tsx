"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type ViewRole = "employee" | "admin" | "secretary";

export interface SessionUserView {
  id: string;
  email: string;
  role: ViewRole;
  employeeName: string | null;
  isDriver: boolean;
}

interface RoleContextValue {
  /** The view currently being shown. Admins may switch; others may not. */
  role: ViewRole;
  isAdmin: boolean;
  isSecretary: boolean;
  /** Current view is admin or secretary: can see the office pages (shipments, employees, trucks). */
  isStaffView: boolean;
  /** Signed-in user is an active driver (can open the truck pages). */
  isDriver: boolean;
  email: string;
  currentUserId: string;
  currentEmployee: string;
  setRole: (role: ViewRole) => void;
  setCurrentEmployee: (name: string) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({
  user,
  children,
}: {
  user: SessionUserView;
  children: ReactNode;
}) {
  const isAdmin = user.role === "admin";
  const isSecretary = user.role === "secretary";
  const [role, setRoleState] = useState<ViewRole>(user.role);
  const [currentEmployee, setCurrentEmployeeState] = useState(
    user.employeeName ?? ""
  );

  const setRole = (nextRole: ViewRole) => {
    if (nextRole === "admin" && !isAdmin) return;
    setRoleState(nextRole);
  };

  const setCurrentEmployee = (name: string) => {
    if (!isAdmin && name !== user.employeeName) return;
    setCurrentEmployeeState(name);
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        isAdmin,
        isSecretary,
        isStaffView: role === "admin" || role === "secretary",
        isDriver: user.isDriver,
        email: user.email,
        currentUserId: user.id,
        currentEmployee,
        setRole,
        setCurrentEmployee,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
