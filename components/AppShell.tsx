"use client";

import { useRole } from "@/context/RoleContext";
import Navbar from "@/components/Navbar";
import LoginScreen from "@/components/LoginScreen";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useRole();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </>
  );
}
