"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import AdminMasterDashboard from "@/components/views/AdminMasterDashboard";
import type { Client } from "@/lib/clients";
import type { Employee, Shipment } from "@/lib/mockData";
import type { Truck } from "@/lib/trucks";
import type { DestinationRouteRate } from "@/lib/rates";

interface HomePageClientProps {
  initialShipments: Shipment[];
  employees: Employee[];
  trucks: Truck[];
  clients: Client[];
  routes: DestinationRouteRate[];
}

export default function HomePageClient({
  initialShipments,
  employees,
  trucks,
  clients,
  routes,
}: HomePageClientProps) {
  const { role } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (role === "employee") {
      router.replace("/employee/shipments/new");
    }
  }, [role, router]);

  if (role === "employee") {
    return null;
  }

  return (
    <AdminMasterDashboard
      initialShipments={initialShipments}
      employees={employees}
      trucks={trucks}
      lookupClients={clients}
      routes={routes}
    />
  );
}
