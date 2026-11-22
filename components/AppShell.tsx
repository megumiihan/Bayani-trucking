"use client";

import Navbar from "@/components/Navbar";
import AdminSidebar, { useSidebarCollapsed } from "@/components/AdminSidebar";
import { useRole } from "@/context/RoleContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { role } = useRole();
  const { collapsed, toggle } = useSidebarCollapsed();
  const useSidebar = role === "admin";

  return (
    <div className="page-gradient min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-blue-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      {useSidebar ? (
        <AdminSidebar collapsed={collapsed} onToggle={toggle} />
      ) : (
        <Navbar />
      )}
      <div
        className={
          useSidebar
            ? `transition-[padding] duration-200 ${collapsed ? "md:pl-16" : "md:pl-60"}`
            : undefined
        }
      >
        <main
          id="main-content"
          className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
