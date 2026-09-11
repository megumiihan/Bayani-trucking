import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import { RoleProvider } from "@/context/RoleContext";
import { getSessionUser } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bayani Trucking",
  description: "Delivery management system for Bayani Trucking",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased page-gradient`}
      >
        {user ? (
          <RoleProvider
            user={{
              id: user.id,
              email: user.email,
              role: user.role,
              employeeName: user.employeeName,
            }}
          >
            <AppShell>{children}</AppShell>
          </RoleProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
