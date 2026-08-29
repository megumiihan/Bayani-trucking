"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRole, type ViewRole } from "@/context/RoleContext";
import { signOut } from "@/lib/actions/auth";

const navLinks = {
  employee: [
    { href: "/employee/shipments/new", label: "New Shipment" },
    { href: "/employee/profile", label: "Profile & Earnings" },
  ],
  admin: [
    { href: "/", label: "Master Dashboard" },
    { href: "/admin/employees", label: "Employees" },
    { href: "/admin/routes", label: "Routes & Rates" },
  ],
};

export default function Navbar() {
  const { role, setRole, isAdmin, email } = useRole();
  const pathname = usePathname();
  const router = useRouter();
  const links = navLinks[role];

  const handleRoleChange = (nextRole: ViewRole) => {
    setRole(nextRole);
    router.push(nextRole === "employee" ? "/employee/shipments/new" : "/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href={role === "employee" ? "/employee/shipments/new" : "/"}
          className="flex items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">
            BT
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-gray-900">Bayani Trucking</p>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Role switcher + logout */}
        <div className="flex items-center gap-3">
          {isAdmin && <RoleSwitcher role={role} onChange={handleRoleChange} />}
          <span className="hidden max-w-[12rem] truncate text-xs text-gray-500 lg:block">
            {email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="hidden rounded-md px-2 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 sm:block"
            >
              Log out
            </button>
          </form>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2 md:hidden">
        {links.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

function RoleSwitcher({
  role,
  onChange,
}: {
  role: ViewRole;
  onChange: (role: ViewRole) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-gray-500 sm:block">View as</span>
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        <button
          type="button"
          onClick={() => onChange("employee")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            role === "employee"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Employee
        </button>
        <button
          type="button"
          onClick={() => onChange("admin")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            role === "admin"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Admin
        </button>
      </div>
    </div>
  );
}
