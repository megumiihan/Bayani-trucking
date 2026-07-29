"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import AdminMasterDashboard from "@/components/views/AdminMasterDashboard";

export default function HomePage() {
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

  return <AdminMasterDashboard />;
}
