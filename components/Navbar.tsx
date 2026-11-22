"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRole, type ViewRole } from "@/context/RoleContext";
import { signOut } from "@/lib/actions/auth";

export const navLinks = {
  employee: [
    { href: "/employee/shipments/new", label: "New Shipment" },
    { href: "/employee/profile", label: "Profile & Earnings" },
  ],
  admin: [
    { href: "/", label: "Master Dashboard" },
    { href: "/admin/employees", label: "Employees" },
    { href: "/admin/trucks", label: "Trucks" },
    { href: "/admin/clients", label: "Clients" },
    { href: "/admin/bookkeeping", label: "Bookkeeping" },
    // Hidden for now; the page still exists at /admin/leads.
    // { href: "/admin/leads", label: "Leads" },
    { href: "/admin/routes", label: "Routes & Rates" },
  ],
  secretary: [
    { href: "/", label: "Shipments" },
    { href: "/employee/shipments/new", label: "Log Shipment" },
    { href: "/admin/employees", label: "Employees" },
    { href: "/admin/trucks", label: "Trucks" },
  ],
};

export function isLinkActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function Navbar() {
  const { role, setRole, isAdmin, isDriver, email } = useRole();
  const pathname = usePathname();
  const router = useRouter();
  // Drivers (and admins previewing the employee view) get the maintenance board.
  const links =
    role === "employee" && (isDriver || isAdmin)
      ? [...navLinks.employee, { href: "/admin/trucks", label: "Trucks" }]
      : navLinks[role];

  const handleRoleChange = (nextRole: ViewRole) => {
    setRole(nextRole);
    router.push(nextRole === "employee" ? "/employee/shipments/new" : "/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={role === "employee" ? "/employee/shipments/new" : "/"}
          className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 text-sm font-bold text-white shadow-sm">
            BT
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-900">Bayani Trucking</p>
            <p className="hidden text-xs text-slate-500 sm:block">Fleet operations</p>
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
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
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

const ROLE_OPTIONS: { value: ViewRole; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "secretary", label: "Secretary" },
  { value: "admin", label: "Admin" },
];

export function RoleSwitcher({
  role,
  onChange,
  stacked = false,
}: {
  role: ViewRole;
  onChange: (role: ViewRole) => void;
  /** Label above full-width buttons (for the narrow sidebar). */
  stacked?: boolean;
}) {
  return (
    <div className={stacked ? "space-y-1.5" : "flex items-center gap-2"}>
      <span className={`text-xs text-gray-500 ${stacked ? "block px-1" : "hidden sm:block"}`}>
        View as
      </span>
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {ROLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={role === option.value}
            className={`rounded-md py-1.5 text-xs font-medium transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
              stacked ? "flex-1 px-1.5" : "px-3"
            } ${
              role === option.value
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
