"use client";

import { useRouter } from "next/navigation";
import { useRole, type ViewRole } from "@/context/RoleContext";

export default function LoginScreen() {
  const { login } = useRole();
  const router = useRouter();

  const handleLogin = (role: ViewRole) => {
    login(role);
    router.push(role === "employee" ? "/employee/shipments/new" : "/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-xl font-bold text-white shadow-lg">
            BT
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Bayani Trucking
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-center text-sm font-medium text-gray-700">
            Choose your role to continue
          </p>

          <button
            type="button"
            onClick={() => handleLogin("employee")}
            className="group flex w-full items-center gap-4 rounded-xl border border-gray-200 px-5 py-4 text-left transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 transition-colors group-hover:bg-blue-200">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9.75 0H7.5m3 0h3.75m-3.75 0v-1.5A2.25 2.25 0 0 0 10.5 15h3a2.25 2.25 0 0 0 2.25-2.25v-1.5m-6 0V9.75A2.25 2.25 0 0 1 10.5 7.5h3a2.25 2.25 0 0 1 2.25 2.25v3.75"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Log in as Driver / Employee
              </p>
              <p className="text-sm text-gray-500">
                Record shipments and view payouts
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleLogin("admin")}
            className="group flex w-full items-center gap-4 rounded-xl border border-gray-200 px-5 py-4 text-left transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 transition-colors group-hover:bg-indigo-200">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Log in as Admin</p>
              <p className="text-sm text-gray-500">
                Manage fleet, employees, and shipments
              </p>
            </div>
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Prototype login — no password required
        </p>
      </div>
    </div>
  );
}
