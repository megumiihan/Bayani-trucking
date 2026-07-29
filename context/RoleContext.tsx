"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  DEFAULT_ADMIN_USER_ID,
  DEFAULT_EMPLOYEE_USER_ID,
  getUserByEmployeeName,
} from "@/lib/mockUsers";

export type ViewRole = "employee" | "admin";

export const DEFAULT_EMPLOYEE = "Arsenio Tumanan";

interface RoleContextValue {
  role: ViewRole;
  isAuthenticated: boolean;
  currentUserId: string;
  currentEmployee: string;
  login: (role: ViewRole) => void;
  logout: () => void;
  setRole: (role: ViewRole) => void;
  setCurrentEmployee: (name: string) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<ViewRole>("employee");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(DEFAULT_EMPLOYEE_USER_ID);
  const [currentEmployee, setCurrentEmployeeState] = useState(DEFAULT_EMPLOYEE);

  const setCurrentEmployee = (name: string) => {
    setCurrentEmployeeState(name);
    const user = getUserByEmployeeName(name);
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const login = (nextRole: ViewRole) => {
    setRole(nextRole);
    setIsAuthenticated(true);
    if (nextRole === "employee") {
      setCurrentEmployee(DEFAULT_EMPLOYEE);
    } else {
      setCurrentUserId(DEFAULT_ADMIN_USER_ID);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        isAuthenticated,
        currentUserId,
        currentEmployee,
        login,
        logout,
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
