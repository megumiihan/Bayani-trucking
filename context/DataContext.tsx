"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { shipments as initialShipments, employees as initialEmployees, type Shipment, type Employee } from "@/lib/mockData";

interface DataContextValue {
  shipments: Shipment[];
  employees: Employee[];
  addShipment: (shipment: Shipment) => void;
  updateShipment: (id: string, updates: Partial<Shipment>) => void;
  toggleShipmentFlag: (id: string) => void;
  toggleShipmentApproved: (id: string) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);

  const addShipment = (shipment: Shipment) => {
    setShipments((current) => [...current, shipment]);
  };

  const updateShipment = (id: string, updates: Partial<Shipment>) => {
    setShipments((current) =>
      current.map((shipment) =>
        shipment.id === id ? { ...shipment, ...updates } : shipment
      )
    );
  };

  const toggleShipmentFlag = (id: string) => {
    setShipments((current) =>
      current.map((shipment) =>
        shipment.id === id
          ? { ...shipment, flagged: !shipment.flagged }
          : shipment
      )
    );
  };

  const toggleShipmentApproved = (id: string) => {
    setShipments((current) =>
      current.map((shipment) =>
        shipment.id === id
          ? { ...shipment, approved: !shipment.approved }
          : shipment
      )
    );
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees((current) =>
      current.map((employee) =>
        employee.id === id ? { ...employee, ...updates } : employee
      )
    );
  };

  return (
    <DataContext.Provider
      value={{
        shipments,
        employees,
        addShipment,
        updateShipment,
        toggleShipmentFlag,
        toggleShipmentApproved,
        updateEmployee,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
