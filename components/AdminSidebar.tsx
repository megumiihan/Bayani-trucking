"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRole, type ViewRole } from "@/context/RoleContext";
import { signOut } from "@/lib/actions/auth";
import { isLinkActive, navLinks, RoleSwitcher } from "@/components/Navbar";

const STORAGE_KEY = "bt-admin-sidebar-collapsed";

const ICONS: Record<string, string> = {
  "/":
    "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  "/admin/employees":
    "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
  "/admin/trucks":
    "M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12",
  "/admin/bookkeeping":
    "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25",
  "/admin/clients":
    "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
  "/admin/leads":
    "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
  "/admin/routes":
    "M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z",
};

const CHEVRONS = "m18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5";
const MENU = "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5";
const CLOSE = "M6 18 18 6M6 6l12 12";
const LOGOUT =
  "M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9";

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

/** Reads/persists the collapsed state. Shared by the sidebar and the page offset. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);

  const toggle = () =>
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });

  return { collapsed, toggle };
}

export default function AdminSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { role, setRole, isAdmin, email } = useRole();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = navLinks.admin;

  // Close the mobile drawer on navigation.
  useEffect(() => setMobileOpen(false), [pathname]);

  const handleRoleChange = (nextRole: ViewRole) => {
    setRole(nextRole);
    router.push(nextRole === "employee" ? "/employee/shipments/new" : "/");
  };

  // On mobile the drawer is always shown expanded.
  const renderPanel = (isCollapsed: boolean, isMobile: boolean) => (
    <div className="flex h-full flex-col">
      {/* Brand + toggle */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-slate-200/80 ${
          isCollapsed ? "justify-center px-2" : "justify-between px-4"
        }`}
      >
        <Link
          href="/"
          title="Bayani Trucking"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 text-sm font-bold text-white shadow-sm">
            BT
          </div>
          {!isCollapsed && (
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">Bayani Trucking</p>
              <p className="text-xs text-slate-500">Fleet operations</p>
            </div>
          )}
        </Link>
        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <Icon d={CLOSE} />
          </button>
        ) : (
          !isCollapsed && (
            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              <Icon d={CHEVRONS} className="h-4 w-4" />
            </button>
          )
        )}
      </div>

      {/* Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {isCollapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="mb-2 flex w-full justify-center rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            <Icon d={CHEVRONS} className="h-4 w-4 rotate-180" />
          </button>
        )}
        {links.map((link) => {
          const active = isLinkActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              title={isCollapsed ? link.label : undefined}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                isCollapsed ? "justify-center px-2" : "px-3"
              } ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon d={ICONS[link.href] ?? ICONS["/"]} />
              {!isCollapsed && <span className="truncate">{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer: role switcher, email, logout */}
      <div className="shrink-0 space-y-3 border-t border-slate-200/80 p-3">
        {isAdmin && !isCollapsed && (
          <RoleSwitcher role={role} onChange={handleRoleChange} stacked />
        )}
        {!isCollapsed && (
          <p className="truncate px-1 text-xs text-gray-500" title={email}>
            {email}
          </p>
        )}
        <form action={signOut}>
          <button
            type="submit"
            title="Log out"
            className={`flex w-full items-center gap-3 rounded-lg py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 ${
              isCollapsed ? "justify-center px-2" : "px-3"
            }`}
          >
            <Icon d={LOGOUT} />
            {!isCollapsed && <span>Log out</span>}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden border-r border-slate-200/80 bg-white/95 backdrop-blur-md transition-[width] duration-200 md:block ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {renderPanel(collapsed, false)}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          <Icon d={MENU} />
        </button>
        <p className="text-sm font-bold text-slate-900">Bayani Trucking</p>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            {renderPanel(false, true)}
          </aside>
        </div>
      )}
    </>
  );
}
