"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import AdminMasterDashboard from "@/components/views/AdminMasterDashboard";
import DashboardSkeleton from "@/components/admin/DashboardSkeleton";
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

export default function HomePageClient(props: HomePageClientProps) {
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
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminMasterDashboard
        initialShipments={props.initialShipments}
        employees={props.employees}
        trucks={props.trucks}
        lookupClients={props.clients}
        routes={props.routes}
      />
    </Suspense>
  );
}
